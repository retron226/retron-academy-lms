import { useState, useEffect } from "react";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    arrayUnion,
    serverTimestamp,
    writeBatch,
    setDoc
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Search, X, Loader2, Users, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../../lib/firebase";
import { Input } from "../../../components/ui/input";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastComponent";


export default function CourseTeam({ courseId, course, setCourse }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [teamMembers, setTeamMembers] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [searchEmail, setSearchEmail] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);
    const [autoEnrolling, setAutoEnrolling] = useState(false);

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
            // Step 1: Find user by email
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", searchEmail));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast({
                    title: "User not found",
                    description: "No user found with this email address",
                    variant: "destructive"
                });
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userId = userDoc.id;
            const userData = userDoc.data();

            // Check if user has appropriate role (instructor or partner_instructor)
            if (userData.role !== 'instructor' && userData.role !== 'partner_instructor') {
                toast({
                    title: "Invalid Role",
                    description: "Only instructors or partner instructors can be added as co-instructors",
                    variant: "destructive"
                });
                return;
            }

            // Step 2: Add user as co-instructor to the course
            const courseRef = doc(db, "courses", courseId);
            await updateDoc(courseRef, {
                coInstructorIds: arrayUnion(userId)
            });

            // Step 3: CRITICAL FIX - Create mentorCourseAssignment for partner instructors
            if (userData.role === 'partner_instructor') {
                await handlePartnerInstructorAssignment(userId, userData);
            }

            // Step 4: Also add course to user's assignedCourses if they're a partner instructor
            if (userData.role === 'partner_instructor') {
                const userRef = doc(db, "users", userId);
                await updateDoc(userRef, {
                    assignedCourses: arrayUnion(courseId)
                });
            }

            toast({
                title: "Success",
                description: `${userData.fullName || searchEmail} added as co-instructor`,
                variant: "default"
            });

            setSearchEmail("");
        } catch (error) {
            console.error("Error sending invitation:", error);
            toast({
                title: "Error",
                description: `Failed to add co-instructor: ${error.message}`,
                variant: "destructive"
            });
        } finally {
            setSearchLoading(false);
            // Update local state instead of reloading
            const fetchTeamDetails = async () => {
                try {
                    const q = query(collection(db, "users"), where("__name__", "in", course.coInstructorIds));
                    const snapshot = await getDocs(q);
                    const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    setTeamMembers(members);
                } catch (err) {
                    console.error("Error fetching team:", err);
                }
            };
            fetchTeamDetails();
        }
    };

    // CRITICAL: Handle partner instructor assignment with auto-enrollment
    const handlePartnerInstructorAssignment = async (instructorId, instructorData) => {
        try {
            // 1. Create mentorCourseAssignment document
            const mentorCourseAssignmentId = `${instructorId}_${courseId}`;
            const mentorCourseAssignmentRef = doc(db, "mentorCourseAssignments", mentorCourseAssignmentId);

            await setDoc(mentorCourseAssignmentRef, {
                mentorId: instructorId,
                courseId: courseId,
                assignedAt: serverTimestamp(),
                status: "active",
                assignedBy: user.uid,
                // Add institution match check from KT document
                institutionMatch: instructorData.institutionId === course.institutionId
            });

            // 2. Trigger auto-enrollment for all mentor's assigned students
            await autoEnrollMentorStudents(instructorId);

            return true;
        } catch (error) {
            console.error("Error creating mentor course assignment:", error);
            throw error;
        }
    };

    // Auto-enroll all mentor's students in this course
    const autoEnrollMentorStudents = async (mentorId) => {
        try {
            setAutoEnrolling(true);

            // 1. Get all students assigned to this mentor
            const mentorAssignmentsRef = collection(db, "mentorAssignments");
            const q = query(
                mentorAssignmentsRef,
                where("mentorId", "==", mentorId),
                where("status", "==", "active")
            );

            const assignmentsSnap = await getDocs(q);

            if (assignmentsSnap.empty) {
                console.log("No students assigned to this mentor yet");
                return;
            }

            const studentIds = assignmentsSnap.docs.map(doc => doc.data().studentId);

            // 2. Auto-enroll each student in this course
            for (const studentId of studentIds) {
                await enrollStudentInCourse(studentId, mentorId);
            }

            console.log(`Auto-enrolled ${studentIds.length} students for mentor ${mentorId}`);

        } catch (error) {
            console.error("Error auto-enrolling students:", error);
            throw error;
        } finally {
            setAutoEnrolling(false);
        }
    };

    // Enroll a single student in the course
    const enrollStudentInCourse = async (studentId, mentorId) => {
        try {
            const batch = writeBatch(db);

            // 1. Update student's enrolledCourses array
            const studentRef = doc(db, "users", studentId);
            batch.update(studentRef, {
                enrolledCourses: arrayUnion(courseId)
            });

            // 2. Create enrollment document in subcollection
            const enrollmentRef = doc(db, "users", studentId, "enrollments", courseId);
            batch.set(enrollmentRef, {
                enrolledAt: serverTimestamp(),
                mentorId: mentorId,
                enrolledBy: user.uid,
                status: "active"
            });

            // 3. Create initial progress document
            const progressRef = doc(db, "users", studentId, "courseProgress", courseId);
            batch.set(progressRef, {
                enrolledAt: serverTimestamp(),
                lastAccessed: serverTimestamp(),
                completedModules: [],
                completedSections: [],
                moduleProgressPercentage: 0,
                sectionProgressPercentage: 0,
                completedModuleCount: 0,
                completedSectionCount: 0
            });

            // 4. Commit batch
            await batch.commit();

        } catch (error) {
            console.error(`Error enrolling student ${studentId}:`, error);
            throw error;
        }
    };

    const handleRemoveMember = async (memberId) => {
        try {
            // 1. Remove from course's coInstructorIds
            const courseRef = doc(db, "courses", courseId);
            await updateDoc(courseRef, {
                coInstructorIds: course.coInstructorIds.filter(id => id !== memberId)
            });

            // 2. Remove mentorCourseAssignment if it exists (for partner instructors)
            try {
                const mentorCourseAssignmentId = `${memberId}_${courseId}`;
                const mentorCourseAssignmentRef = doc(db, "mentorCourseAssignments", mentorCourseAssignmentId);
                await updateDoc(mentorCourseAssignmentRef, {
                    status: "removed",
                    removedAt: serverTimestamp(),
                    removedBy: user.uid
                });
            } catch (error) {
                console.log("No mentorCourseAssignment found or already removed");
            }

            // 3. Update local state
            setCourse({ ...course, coInstructorIds: course.coInstructorIds.filter(id => id !== memberId) });
            setTeamMembers(prev => prev.filter(m => m.id !== memberId));

            toast({
                title: "Success",
                description: "Team member removed successfully",
                variant: "default"
            });

        } catch (error) {
            console.error("Error removing team member:", error);
            toast({
                title: "Error",
                description: "Failed to remove team member",
                variant: "destructive"
            });
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
        >
            <Card>
                <CardHeader className="bg-gradient-to-r from-secondary/5 to-secondary/10">
                    <div className="flex items-center justify-between">
                        <CardTitle>Course Team</CardTitle>
                        {autoEnrolling && (
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Auto-enrolling students...
                            </div>
                        )}
                    </div>
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
                        courseId={courseId}
                    />
                </CardContent>
            </Card>
        </motion.div>
    );
}

function EmailInvite({ searchEmail, setSearchEmail, onInvite, loading }) {
    return (
        <motion.div className="space-y-4">
            <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <label className="text-sm font-medium">Invite Co-Instructor / TA (by Email)</label>
            </div>
            <div className="flex gap-2 items-end">
                <div className="space-y-2 flex-1">
                    <Input
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        placeholder="instructor@example.com"
                        onKeyDown={(e) => e.key === 'Enter' && onInvite()}
                        type="email"
                    />
                    <p className="text-xs text-muted-foreground">
                        For partner instructors, this will auto-enroll all their assigned students in this course
                    </p>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                        type="button"
                        onClick={onInvite}
                        disabled={loading || !searchEmail.trim()}
                        className="gap-2"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                        <span>Invite</span>
                    </Button>
                </motion.div>
            </div>
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
                    <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-yellow-600" />
                        <h3 className="text-sm font-semibold text-muted-foreground">Pending Invitations</h3>
                    </div>
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

function TeamMembersList({ members, onRemoveMember, courseId }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-muted-foreground">Current Team Members</h3>
            </div>
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
                            courseId={courseId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function EmptyTeamState() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6 border-2 border-dashed rounded-lg"
        >
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground italic">
                No co-instructors assigned. Add team members to collaborate on this course.
            </p>
        </motion.div>
    );
}

function TeamMemberCard({ member, index, onRemove, courseId }) {
    const [isRemoving, setIsRemoving] = useState(false);

    const handleRemove = async () => {
        setIsRemoving(true);
        try {
            await onRemove();
        } finally {
            setIsRemoving(false);
        }
    };

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
                    className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm"
                    whileHover={{ rotate: 10 }}
                >
                    {member.fullName?.[0] || member.email?.[0]?.toUpperCase()}
                </motion.div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{member.fullName}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${member.role === 'partner_instructor' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                            {member.role}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                        {member.email}
                    </p>
                    {member.role === 'partner_instructor' && (
                        <p className="text-xs text-blue-600 mt-1">
                            ✓ Auto-enrollment enabled for assigned students
                        </p>
                    )}
                </div>
            </div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                    onClick={handleRemove}
                    disabled={isRemoving}
                >
                    {isRemoving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <X className="h-4 w-4" />
                    )}
                </Button>
            </motion.div>
        </motion.div>
    );
}