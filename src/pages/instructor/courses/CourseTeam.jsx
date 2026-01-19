import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "../../..//components/ui/card";
import { Button } from "../../../components/ui/button";
import { Search, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../../lib/firebase";
import { Input } from "../../../components/ui/input";
import { useAuth } from "../../../contexts/AuthContext";

export default function CourseTeam({ courseId, course, setCourse }) {
    const { user } = useAuth();
    const [teamMembers, setTeamMembers] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [searchEmail, setSearchEmail] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);

    useEffect(() => {
        const fetchTeamDetails = async () => {
            if (course.coInstructorIds?.length > 0) {
                try {
                    const q = query(collection(db, "users"), where("__name__", "in", course.coInstructorIds));
                    const snapshot = await getDocs(q);
                    const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    setTeamMembers(members);
                } catch (err) {
                    console.error("Error fetching team:", err);
                }
            } else {
                setTeamMembers([]);
            }
        };

        if (courseId) {
            fetchTeamDetails();
            fetchInvitations();
        }
    }, [course.coInstructorIds, courseId]);

    const fetchInvitations = async () => {
        if (!courseId) return;
        try {
            const q = query(collection(db, "invitations"),
                where("courseId", "==", courseId),
                where("status", "==", "pending")
            );
            const snapshot = await getDocs(q);
            setInvitations(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error("Error fetching invitations:", err);
        }
    };

    const handleInvite = async () => {
        if (!searchEmail.trim()) return;
        setSearchLoading(true);

        try {
            // ... invitation logic from original component
        } catch (error) {
            console.error("Error sending invitation:", error);
            alert(`Failed to send invitation: ${error.message}`);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleRemoveMember = (memberId) => {
        const newCoIds = course.coInstructorIds.filter(id => id !== memberId);
        setCourse({ ...course, coInstructorIds: newCoIds });
        setTeamMembers(prev => prev.filter(m => m.id !== memberId));
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
        >
            <Card>
                <CardHeader className="bg-gradient-to-r from-secondary/5 to-secondary/10">
                    <CardTitle>Course Team</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <EmailInvite
                        searchEmail={searchEmail}
                        setSearchEmail={setSearchEmail}
                        onInvite={handleInvite}
                        loading={searchLoading}
                    />

                    <PendingInvitations invitations={invitations} />

                    <TeamMembersList
                        members={teamMembers}
                        onRemoveMember={handleRemoveMember}
                    />
                </CardContent>
            </Card>
        </motion.div>
    );
}

function EmailInvite({ searchEmail, setSearchEmail, onInvite, loading }) {
    return (
        <motion.div className="flex gap-2 items-end" whileHover={{ scale: 1.01 }}>
            <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Invite Co-Instructor / TA (by Email)</label>
                <Input
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="instructor@example.com"
                    onKeyDown={(e) => e.key === 'Enter' && onInvite()}
                />
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button type="button" onClick={onInvite} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    <span className="ml-2">Invite</span>
                </Button>
            </motion.div>
        </motion.div>
    );
}

function PendingInvitations({ invitations }) {
    return (
        <AnimatePresence>
            {invitations.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                >
                    <h3 className="text-sm font-semibold text-muted-foreground">Pending Invitations</h3>
                    <div className="grid gap-3">
                        {invitations.map((invite, index) => (
                            <InvitationCard key={invite.id} invite={invite} index={index} />
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function InvitationCard({ invite, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-3 border rounded-md bg-yellow-50/50 shadow-sm"
        >
            <div className="flex items-center gap-3">
                <motion.div
                    className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold shadow-sm"
                    whileHover={{ rotate: 10 }}
                >
                    {invite.inviteeEmail[0].toUpperCase()}
                </motion.div>
                <div>
                    <p className="text-sm font-medium">{invite.inviteeEmail}</p>
                    <p className="text-xs text-muted-foreground">
                        Invited {new Date(invite.createdAt).toLocaleDateString()}
                    </p>
                </div>
            </div>
            <motion.span
                className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full shadow-sm"
                whileHover={{ scale: 1.1 }}
            >
                Pending
            </motion.span>
        </motion.div>
    );
}

function TeamMembersList({ members, onRemoveMember }) {
    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Current Team Members</h3>
            {members.length === 0 ? (
                <EmptyTeamState />
            ) : (
                <div className="grid gap-3">
                    {members.map((member, index) => (
                        <TeamMemberCard
                            key={member.id}
                            member={member}
                            index={index}
                            onRemove={() => onRemoveMember(member.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function EmptyTeamState() {
    return (
        <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground italic text-center py-4"
        >
            No co-instructors assigned.
        </motion.p>
    );
}

function TeamMemberCard({ member, index, onRemove }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-3 border rounded-md bg-muted/20 hover:bg-muted/30 transition-colors shadow-sm"
            whileHover={{ scale: 1.01 }}
        >
            <div className="flex items-center gap-3">
                <motion.div
                    className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm"
                    whileHover={{ rotate: 10 }}
                >
                    {member.fullName?.[0] || member.email?.[0]?.toUpperCase()}
                </motion.div>
                <div>
                    <p className="text-sm font-medium">{member.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                        {member.email} ({member.role})
                    </p>
                </div>
            </div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                    onClick={onRemove}
                >
                    <X className="h-4 w-4" />
                </Button>
            </motion.div>
        </motion.div>
    );
}