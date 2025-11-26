import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Trash2, Ban, CheckCircle, Users, GraduationCap, Eye, ArrowUpCircle, X } from "lucide-react";
import { cn } from "../../lib/utils";

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("instructor"); // 'instructor' | 'student'
    const [selectedUser, setSelectedUser] = useState(null); // For details modal

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            const usersData = querySnapshot.docs.map(doc => ({
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

    const handleDeleteUser = async (userId) => {
        if (window.confirm("Are you sure you want to delete this user? This cannot be undone.")) {
            try {
                await deleteDoc(doc(db, "users", userId));
                setUsers(users.filter(user => user.id !== userId));
            } catch (error) {
                console.error("Error deleting user:", error);
                alert("Failed to delete user");
            }
        }
    };

    const handleToggleSuspend = async (userId, currentStatus) => {
        try {
            const newStatus = !currentStatus;
            await updateDoc(doc(db, "users", userId), {
                suspended: newStatus
            });
            setUsers(users.map(user =>
                user.id === userId ? { ...user, suspended: newStatus } : user
            ));
        } catch (error) {
            console.error("Error updating user status:", error);
        }
    };

    const handlePromote = async (userId) => {
        if (window.confirm("Are you sure you want to promote this student to Instructor?")) {
            try {
                await updateDoc(doc(db, "users", userId), {
                    role: "instructor"
                });
                setUsers(users.map(user =>
                    user.id === userId ? { ...user, role: "instructor" } : user
                ));
                alert("User promoted successfully!");
            } catch (error) {
                console.error("Error promoting user:", error);
                alert("Failed to promote user.");
            }
        }
    };

    const filteredUsers = users.filter(user => user.role === activeTab);

    if (loading) return <div>Loading users...</div>;

    return (
        <div className="space-y-6 relative">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 rounded-lg bg-muted p-1 w-fit">
                <button
                    onClick={() => setActiveTab("instructor")}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
                        activeTab === "instructor"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-background/50"
                    )}
                >
                    <Users className="h-4 w-4" />
                    Instructors
                </button>
                <button
                    onClick={() => setActiveTab("student")}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
                        activeTab === "student"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-background/50"
                    )}
                >
                    <GraduationCap className="h-4 w-4" />
                    Students
                </button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="capitalize">{activeTab}s</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No {activeTab}s found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.fullName || "N/A"}
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            {user.suspended ? (
                                                <span className="text-destructive flex items-center gap-1">
                                                    <Ban className="h-4 w-4" /> Suspended
                                                </span>
                                            ) : (
                                                <span className="text-green-600 flex items-center gap-1">
                                                    <CheckCircle className="h-4 w-4" /> Active
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setSelectedUser(user)}
                                                title="View Details"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>

                                            {activeTab === "student" && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handlePromote(user.id)}
                                                    title="Promote to Instructor"
                                                    className="text-blue-600 hover:text-blue-700"
                                                >
                                                    <ArrowUpCircle className="h-4 w-4" />
                                                </Button>
                                            )}

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleToggleSuspend(user.id, user.suspended)}
                                            >
                                                {user.suspended ? "Unsuspend" : "Suspend"}
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                onClick={() => handleDeleteUser(user.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* User Details Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setSelectedUser(null)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h2 className="text-2xl font-bold mb-6">User Details</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                                <p className="text-lg font-medium">{selectedUser.fullName || "N/A"}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Email</label>
                                <p className="text-lg">{selectedUser.email}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">College / University</label>
                                <p className="text-lg">{selectedUser.college || "N/A"}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Role</label>
                                <p className="capitalize">{selectedUser.role}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Joined Date</label>
                                <p>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : "Unknown"}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">User ID</label>
                                <p className="font-mono text-xs text-muted-foreground">{selectedUser.id}</p>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <Button onClick={() => setSelectedUser(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
