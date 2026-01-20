import { useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Loader2, UserCog } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/firebase";

export default function RoleManager({ user, courseId }) {
    const [expanded, setExpanded] = useState(false);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, "users"));
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(usersData);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const assignRole = async (userId, role) => {
        try {
            await updateDoc(doc(db, "users", userId), {
                role,
                updatedAt: new Date().toISOString()
            });
            alert(`Role updated to ${role}`);
        } catch (error) {
            console.error("Error updating role:", error);
        }
    };

    return (
        <div className="mt-6">
            <Button
                type="button"
                variant="outline"
                onClick={() => {
                    setExpanded(!expanded);
                    if (!expanded) fetchUsers();
                }}
                className="w-full"
            >
                <UserCog className="mr-2 h-4 w-4" />
                Manage User Roles & Permissions
            </Button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4 overflow-hidden"
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Role Management</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <RoleDefinitions />

                                {user?.role === 'admin' && (
                                    <UserRoleAssignment
                                        users={users}
                                        loading={loading}
                                        onAssignRole={assignRole}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function RoleDefinitions() {
    const roles = [
        {
            name: "Student",
            description: "Basic learner",
            permissions: "View content, Submit assignments, Track progress",
            access: "Enrolled courses only",
            content: "No content editing"
        },
        {
            name: "Mentor",
            description: "External guide",
            permissions: "All student + Grade assignments, Provide feedback",
            access: "Assigned courses only",
            content: "View only, no editing"
        },
        {
            name: "Instructor",
            description: "Internal - Retron Energies",
            permissions: "All mentor + Create/edit content, Assign mentors",
            access: "Own/managed courses",
            content: "Full editing (no deletion)",
            highlight: true
        },
        {
            name: "Admin",
            description: "System administrator",
            permissions: "Full system access",
            access: "All courses",
            content: "Full control (create/edit/delete)"
        }
    ];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 p-2 bg-muted/50 rounded-md">
                <span className="font-semibold">Role</span>
                <span className="font-semibold">Permissions</span>
                <span className="font-semibold">Course Access</span>
                <span className="font-semibold">Content Management</span>
            </div>

            <div className="space-y-2">
                {roles.map((role, index) => (
                    <RoleRow key={role.name} role={role} index={index} />
                ))}
            </div>
        </div>
    );
}

function RoleRow({ role, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`grid grid-cols-4 gap-4 p-2 border rounded-md ${role.highlight ? 'bg-primary/5' : ''}`}
        >
            <div>
                <span className="font-medium">{role.name}</span>
                <p className="text-xs text-muted-foreground">{role.description}</p>
            </div>
            <div className="text-sm">{role.permissions}</div>
            <div className="text-sm">{role.access}</div>
            <div className="text-sm">{role.content}</div>
        </motion.div>
    );
}

function UserRoleAssignment({ users, loading, onAssignRole }) {
    return (
        <div className="mt-6">
            <h4 className="font-semibold mb-2">Assign Roles to Users</h4>
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {users.map((user, index) => (
                        <UserRoleRow
                            key={user.id}
                            user={user}
                            index={index}
                            onAssignRole={onAssignRole}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function UserRoleRow({ user, index, onAssignRole }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-2 border rounded hover:bg-muted/30"
        >
            <div>
                <p className="font-medium">{user.fullName || user.email}</p>
                <p className="text-xs text-muted-foreground">Current: {user.role}</p>
            </div>
            <select
                value={user.role}
                onChange={(e) => onAssignRole(user.id, e.target.value)}
                className="text-sm border rounded p-1"
            >
                <option value="student">Student</option>
                <option value="mentor">Mentor</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
            </select>
        </motion.div>
    );
}