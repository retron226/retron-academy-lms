import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, deleteDoc, doc, updateDoc, query, where, limit, startAfter, getDoc } from "firebase/firestore";
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
import { Trash2, Ban, CheckCircle, Users, GraduationCap, Eye, ArrowUpCircle, X, Search, Building2, Shield, UserCheck, MapPin, Mail } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { ROLES, getRoleDisplayName, getRoleDescription } from "../../lib/rbac";
import { logRoleChange, logSuspensionChange, logPermissionChange } from "../../lib/auditLog";

export default function AdminUsers() {
    const { user, userData } = useAuth();
    const [users, setUsers] = useState([]);
    const [institutions, setInstitutions] = useState({}); // Store institutions by ID
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(ROLES.STUDENT);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserInstitution, setSelectedUserInstitution] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [openDropdown, setOpenDropdown] = useState(null);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const USERS_PER_PAGE = 20;

    // Modal states
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [roleModalData, setRoleModalData] = useState({
        userId: null,
        targetRole: '',
        targetUser: null
    });

    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [permissionData, setPermissionData] = useState({
        userId: null,
        permissions: {},
        targetUser: null
    });

    // Fetch all institutions on component mount
    useEffect(() => {
        fetchInstitutions();
    }, []);

    useEffect(() => {
        setUsers([]);
        setLastDoc(null);
        setHasMore(true);
        fetchUsers(true);
    }, [activeTab]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openDropdown !== null) {
                const dropdownElement = event.target.closest('.dropdown-container');
                if (!dropdownElement) {
                    setOpenDropdown(null);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openDropdown]);

    const fetchInstitutions = async () => {
        try {
            const institutionsRef = collection(db, "institutions");
            const snapshot = await getDocs(institutionsRef);
            const institutionsMap = {};

            snapshot.forEach(doc => {
                institutionsMap[doc.id] = {
                    id: doc.id,
                    ...doc.data()
                };
            });

            setInstitutions(institutionsMap);
        } catch (error) {
            console.error("Error fetching institutions:", error);
        }
    };

    const fetchUsers = async (isReset = false) => {
        try {
            if (isReset) {
                setLoading(true);
            } else {
                setIsFetchingMore(true);
            }

            let q = query(
                collection(db, "users"),
                where("role", "==", activeTab),
                limit(USERS_PER_PAGE)
            );

            if (!isReset && lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const querySnapshot = await getDocs(q);
            const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
            setLastDoc(lastVisible);
            setHasMore(querySnapshot.docs.length === USERS_PER_PAGE);

            const usersData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            if (isReset) {
                setUsers(usersData);
            } else {
                setUsers(prev => [...prev, ...usersData]);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
            setIsFetchingMore(false);
        }
    };

    // Fetch institution details for a specific user
    const fetchUserInstitution = async (userId, institutionId) => {
        if (!institutionId) return null;

        try {
            const institutionDoc = await getDoc(doc(db, "institutions", institutionId));
            if (institutionDoc.exists()) {
                return {
                    id: institutionDoc.id,
                    ...institutionDoc.data()
                };
            }
        } catch (error) {
            console.error("Error fetching institution:", error);
        }
        return null;
    };

    const handleLoadMore = () => {
        if (!isFetchingMore && hasMore) {
            fetchUsers(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm("Are you sure you want to delete this user? This cannot be undone.")) {
            try {
                await deleteDoc(doc(db, "users", userId));
                setUsers(users.filter(user => user.id !== userId));
                alert("User deleted successfully!");
            } catch (error) {
                console.error("Error deleting user:", error);
                alert("Failed to delete user");
            }
        }
    };

    const handleToggleSuspend = async (targetUser, currentStatus) => {
        try {
            const newStatus = !currentStatus;
            await updateDoc(doc(db, "users", targetUser.id), {
                suspended: newStatus,
                updatedAt: new Date().toISOString()
            });

            await logSuspensionChange(
                user.uid,
                userData.email,
                targetUser.id,
                targetUser.email,
                newStatus,
                newStatus ? "User suspended by admin" : "User unsuspended by admin"
            );

            setUsers(users.map(u =>
                u.id === targetUser.id ? { ...u, suspended: newStatus } : u
            ));
            alert(`User ${newStatus ? 'suspended' : 'unsuspended'} successfully!`);
        } catch (error) {
            console.error("Error updating user status:", error);
            alert("Failed to update user status");
        }
    };

    const handleOpenRoleModal = (targetUser, targetRole) => {
        setRoleModalData({
            userId: targetUser.id,
            targetRole: targetRole,
            targetUser: targetUser
        });
        setShowRoleModal(true);
    };

    const handleRoleChange = async () => {
        if (!roleModalData.userId || !roleModalData.targetRole) return;

        const roleNames = {
            [ROLES.STUDENT]: "Student",
            [ROLES.PARTNER_INSTRUCTOR]: "Partner Instructor",
            [ROLES.INSTRUCTOR]: "Instructor"
        };

        const targetUser = roleModalData.targetUser;

        try {
            const oldRole = targetUser.role;
            const newRole = roleModalData.targetRole;

            const updateData = {
                role: newRole,
                updatedAt: new Date().toISOString()
            };

            // If changing to partner instructor, keep or set institutionId
            if (newRole === ROLES.PARTNER_INSTRUCTOR) {
                // Set default partner instructor permissions
                updateData.permissions = {
                    view_assigned_courses: true,
                    view_assigned_students: true,
                    grade_assigned_assessments: true,
                    provide_feedback: true,
                    send_messages: true,
                    create_announcements: true,
                    view_course_content: true
                };

                // If user already has an institutionId (from being a partner instructor before), keep it
                if (!targetUser.institutionId) {
                    // In a real app, you might want to prompt admin to select an institution
                    // For now, we'll set a default or leave it null
                    updateData.institutionId = null; // Admin should assign institution separately
                }
            } else if (oldRole === ROLES.PARTNER_INSTRUCTOR && newRole !== ROLES.PARTNER_INSTRUCTOR) {
                // Clear permissions and institutionId when leaving partner instructor role
                updateData.permissions = null;
                updateData.institutionId = null;
            }

            await updateDoc(doc(db, "users", roleModalData.userId), updateData);

            // Log role change
            await logRoleChange(
                user.uid,
                userData.email,
                roleModalData.userId,
                targetUser.email,
                oldRole,
                newRole,
                `Role changed from ${oldRole} to ${newRole} by admin`
            );

            // Log permission change if applicable
            if (newRole === ROLES.PARTNER_INSTRUCTOR) {
                await logPermissionChange(
                    user.uid,
                    userData.email,
                    roleModalData.userId,
                    targetUser.email,
                    targetUser.permissions || {},
                    updateData.permissions || {},
                    "Initial partner instructor permissions assigned"
                );
            }

            setUsers(users.map(u =>
                u.id === roleModalData.userId ? {
                    ...u,
                    ...updateData
                } : u
            ));

            setShowRoleModal(false);
            setRoleModalData({ userId: null, targetRole: '', targetUser: null });
            alert(`User role updated to ${roleNames[newRole]} successfully!`);
        } catch (error) {
            console.error("Error changing user role:", error);
            alert("Failed to change user role.");
        }
    };

    const handleOpenPermissionModal = (targetUser) => {
        setPermissionData({
            userId: targetUser.id,
            permissions: targetUser.permissions || {
                view_assigned_courses: true,
                view_assigned_students: true,
                grade_assigned_assessments: true,
                provide_feedback: true,
                send_messages: true,
                create_announcements: true,
                view_course_content: true
            },
            targetUser: targetUser
        });
        setShowPermissionModal(true);
    };

    const handlePermissionUpdate = async () => {
        if (!permissionData.userId) return;

        try {
            const targetUser = permissionData.targetUser;
            const oldPermissions = targetUser.permissions || {};

            await updateDoc(doc(db, "users", permissionData.userId), {
                permissions: permissionData.permissions,
                updatedAt: new Date().toISOString()
            });

            // Log permission change
            await logPermissionChange(
                user.uid,
                userData.email,
                permissionData.userId,
                targetUser.email,
                oldPermissions,
                permissionData.permissions,
                "Partner instructor permissions updated by admin"
            );

            setUsers(users.map(u =>
                u.id === permissionData.userId ? {
                    ...u,
                    permissions: permissionData.permissions
                } : u
            ));

            setShowPermissionModal(false);
            setPermissionData({ userId: null, permissions: {}, targetUser: null });
            alert("Permissions updated successfully!");
        } catch (error) {
            console.error("Error updating permissions:", error);
            alert("Failed to update permissions.");
        }
    };

    // Handle viewing user details
    const handleViewUserDetails = async (user) => {
        setSelectedUser(user);
        setSelectedUserInstitution(null);

        // Fetch institution details if user has institutionId
        if (user.institutionId) {
            const institution = await fetchUserInstitution(user.id, user.institutionId);
            setSelectedUserInstitution(institution);
        }
    };

    // Filter users by search query
    const filteredUsers = users.filter(user => {
        const matchesSearch = searchQuery === "" ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.institutionId && institutions[user.institutionId]?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
    });

    // Get institution name for display
    const getInstitutionName = (user) => {
        if (!user.institutionId) return "Not assigned";
        return institutions[user.institutionId]?.name || "Unknown Institution";
    };

    if (loading) return (
        <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </div>
    );

    return (
        <div className="space-y-6 relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by email, name, or institution..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 rounded-lg bg-muted p-1 w-fit">
                <button
                    onClick={() => setActiveTab(ROLES.STUDENT)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
                        activeTab === ROLES.STUDENT
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-background/50"
                    )}
                >
                    <GraduationCap className="h-4 w-4" />
                    Students
                </button>
                <button
                    onClick={() => setActiveTab(ROLES.PARTNER_INSTRUCTOR)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
                        activeTab === ROLES.PARTNER_INSTRUCTOR
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-background/50"
                    )}
                >
                    <UserCheck className="h-4 w-4" />
                    Partner Instructors
                </button>
                <button
                    onClick={() => setActiveTab(ROLES.INSTRUCTOR)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
                        activeTab === ROLES.INSTRUCTOR
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-background/50"
                    )}
                >
                    <Users className="h-4 w-4" />
                    Instructors
                </button>
            </div>

            {/* Users Table */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">
                        {getRoleDisplayName(activeTab)} Directory
                        <p className="text-sm text-muted-foreground font-normal mt-1">
                            {getRoleDescription(activeTab)}
                        </p>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-w-4xl">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    {activeTab === ROLES.PARTNER_INSTRUCTOR && <TableHead>Institution</TableHead>}
                                    <TableHead className="w-32">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={activeTab === ROLES.PARTNER_INSTRUCTOR ? 6 : 5} className="text-center py-8 text-muted-foreground">
                                            No {getRoleDisplayName(activeTab).toLowerCase()}s found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((targetUser, index) => (
                                        <TableRow key={targetUser.id}>
                                            <TableCell className="font-medium">
                                                {targetUser.fullName || "N/A"}
                                            </TableCell>
                                            <TableCell>{targetUser.email}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                                                    {getRoleDisplayName(targetUser.role)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className={cn(
                                                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                                    targetUser.suspended
                                                        ? "bg-red-100 text-red-800"
                                                        : "bg-green-100 text-green-800"
                                                )}>
                                                    {targetUser.suspended ? "Suspended" : "Active"}
                                                </span>
                                            </TableCell>
                                            {activeTab === ROLES.PARTNER_INSTRUCTOR && (
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-sm">
                                                            {getInstitutionName(targetUser)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            )}
                                            <TableCell>
                                                <div className="relative inline-block text-left dropdown-container">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setOpenDropdown(openDropdown === targetUser.id ? null : targetUser.id)}
                                                        className="h-8 w-8"
                                                    >
                                                        <svg
                                                            className="h-5 w-5"
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                        >
                                                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                        </svg>
                                                    </Button>

                                                    {openDropdown === targetUser.id && (
                                                        <div className={`absolute right-0 z-50 w-72 rounded-lg bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden ${index >= filteredUsers.length - 3 && filteredUsers.length > 4
                                                            ? "bottom-full mb-2 origin-bottom-right"
                                                            : "mt-2 origin-top-right"
                                                            }`}>
                                                            <div className="py-2" role="menu">
                                                                {/* View Details */}
                                                                <button
                                                                    onClick={() => {
                                                                        handleViewUserDetails(targetUser);
                                                                        setOpenDropdown(null);
                                                                    }}
                                                                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                                >
                                                                    <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                                    <span className="font-medium">View Details</span>
                                                                </button>

                                                                {/* Role Change Options */}
                                                                {targetUser.role === ROLES.STUDENT && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => {
                                                                                handleOpenRoleModal(targetUser, ROLES.PARTNER_INSTRUCTOR);
                                                                                setOpenDropdown(null);
                                                                            }}
                                                                            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors"
                                                                        >
                                                                            <UserCheck className="h-4 w-4" />
                                                                            <span className="font-medium">Make Partner Instructor</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                handleOpenRoleModal(targetUser, ROLES.INSTRUCTOR);
                                                                                setOpenDropdown(null);
                                                                            }}
                                                                            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                                                                        >
                                                                            <ArrowUpCircle className="h-4 w-4" />
                                                                            <span className="font-medium">Promote to Instructor</span>
                                                                        </button>
                                                                    </>
                                                                )}

                                                                {targetUser.role === ROLES.PARTNER_INSTRUCTOR && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => {
                                                                                handleOpenPermissionModal(targetUser);
                                                                                setOpenDropdown(null);
                                                                            }}
                                                                            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
                                                                        >
                                                                            <Shield className="h-4 w-4" />
                                                                            <span className="font-medium">Manage Permissions</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                handleOpenRoleModal(targetUser, ROLES.INSTRUCTOR);
                                                                                setOpenDropdown(null);
                                                                            }}
                                                                            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                                                                        >
                                                                            <ArrowUpCircle className="h-4 w-4" />
                                                                            <span className="font-medium">Promote to Instructor</span>
                                                                        </button>
                                                                    </>
                                                                )}

                                                                {targetUser.role === ROLES.INSTRUCTOR && targetUser.role !== ROLES.PARTNER_INSTRUCTOR && (
                                                                    <button
                                                                        onClick={() => {
                                                                            handleOpenRoleModal(targetUser, ROLES.PARTNER_INSTRUCTOR);
                                                                            setOpenDropdown(null);
                                                                        }}
                                                                        className="flex w-full items-center gap-3 px-4 py-3 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors"
                                                                    >
                                                                        <UserCheck className="h-4 w-4" />
                                                                        <span className="font-medium">Make Partner Instructor</span>
                                                                    </button>
                                                                )}

                                                                {/* Suspend/Unsuspend */}
                                                                <button
                                                                    onClick={() => {
                                                                        handleToggleSuspend(targetUser, targetUser.suspended);
                                                                        setOpenDropdown(null);
                                                                    }}
                                                                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors"
                                                                >
                                                                    {targetUser.suspended ? (
                                                                        <>
                                                                            <CheckCircle className="h-4 w-4" />
                                                                            <span className="font-medium">Unsuspend User</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Ban className="h-4 w-4" />
                                                                            <span className="font-medium">Suspend User</span>
                                                                        </>
                                                                    )}
                                                                </button>

                                                                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

                                                                {/* Delete User */}
                                                                <button
                                                                    onClick={() => {
                                                                        handleDeleteUser(targetUser.id);
                                                                        setOpenDropdown(null);
                                                                    }}
                                                                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    <span className="font-medium">Delete User</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {hasMore && (
                        <div className="mt-4 flex justify-center pb-2">
                            <Button
                                variant="outline"
                                onClick={handleLoadMore}
                                disabled={isFetchingMore}
                                className="w-full max-w-xs"
                            >
                                {isFetchingMore ? (
                                    <span className="flex items-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                        Loading more...
                                    </span>
                                ) : (
                                    "Load More Users"
                                )}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* User Details Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 ">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md  max-h-[75vh] overflow-auto p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => {
                                setSelectedUser(null);
                                setSelectedUserInstitution(null);
                            }}
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
                                <label className="text-sm font-medium text-muted-foreground">Role</label>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                                        {getRoleDisplayName(selectedUser.role)}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {getRoleDescription(selectedUser.role)}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Status</label>
                                <p className={selectedUser.suspended ? "text-red-600" : "text-green-600"}>
                                    {selectedUser.suspended ? "Suspended" : "Active"}
                                </p>
                            </div>

                            {/* Institution Details */}
                            {(selectedUser.role === ROLES.PARTNER_INSTRUCTOR || selectedUser.institutionId) && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Building2 className="h-4 w-4" />
                                        Institution
                                    </label>
                                    {selectedUserInstitution ? (
                                        <div className="mt-2 p-3 border rounded-md bg-muted/30">
                                            <div className="font-medium">{selectedUserInstitution.name}</div>
                                            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                                <MapPin className="h-3 w-3" />
                                                {selectedUserInstitution.location || "Location not specified"}
                                            </div>
                                            {selectedUserInstitution.contactEmail && (
                                                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                                    <Mail className="h-3 w-3" />
                                                    {selectedUserInstitution.contactEmail}
                                                </div>
                                            )}
                                            <div className="mt-2 text-xs text-muted-foreground">
                                                ID: {selectedUser.institutionId}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground mt-2">Not assigned to an institution</p>
                                    )}
                                </div>
                            )}

                            {selectedUser.role === ROLES.PARTNER_INSTRUCTOR && selectedUser.permissions && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Shield className="h-4 w-4" />
                                        Permissions
                                    </label>
                                    <div className="mt-2 space-y-2 p-3 bg-muted rounded-md">
                                        {Object.entries(selectedUser.permissions).map(([key, value]) => (
                                            <div key={key} className="flex items-center justify-between">
                                                <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                                                {value ? (
                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <X className="h-4 w-4 text-red-600" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Joined Date</label>
                                <p>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : "Unknown"}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">User ID</label>
                                <p className="font-mono text-xs text-muted-foreground break-all">{selectedUser.id}</p>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                            <Button onClick={() => {
                                setSelectedUser(null);
                                setSelectedUserInstitution(null);
                            }}>Close</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Role Change Modal */}
            {showRoleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowRoleModal(false)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h2 className="text-2xl font-bold mb-6">Change User Role</h2>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">
                                    User: <span className="font-medium text-foreground">{roleModalData.targetUser?.email}</span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Current Role: <span className="font-medium text-foreground">{getRoleDisplayName(roleModalData.targetUser?.role)}</span>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Change to:</label>
                                <div className="space-y-2">
                                    {[ROLES.PARTNER_INSTRUCTOR, ROLES.INSTRUCTOR, ROLES.STUDENT].map(role => (
                                        role !== roleModalData.targetUser?.role && (
                                            <button
                                                key={role}
                                                onClick={() => setRoleModalData({ ...roleModalData, targetRole: role })}
                                                className={cn(
                                                    "w-full text-left p-3 rounded-md border transition-colors",
                                                    roleModalData.targetRole === role
                                                        ? "border-primary bg-primary/10"
                                                        : "border-input hover:bg-accent"
                                                )}
                                            >
                                                <div className="font-medium">{getRoleDisplayName(role)}</div>
                                                <div className="text-sm text-muted-foreground mt-1">{getRoleDescription(role)}</div>
                                            </button>
                                        )
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowRoleModal(false)}>Cancel</Button>
                            <Button
                                onClick={handleRoleChange}
                                disabled={!roleModalData.targetRole}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                Change Role
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Permission Management Modal */}
            {showPermissionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setShowPermissionModal(false)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h2 className="text-2xl font-bold mb-6">Manage Permissions</h2>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-4">
                                    User: <span className="font-medium text-foreground">{permissionData.targetUser?.email}</span>
                                </p>
                            </div>

                            <div className="space-y-3">
                                {[
                                    'view_assigned_courses',
                                    'view_assigned_students',
                                    'grade_assigned_assessments',
                                    'provide_feedback',
                                    'send_messages',
                                    'create_announcements',
                                    'view_course_content'
                                ].map(permission => (
                                    <label key={permission} className="flex items-center justify-between p-3 rounded-md border border-input hover:bg-accent transition-colors">
                                        <div>
                                            <span className="font-medium capitalize">{permission.replace(/_/g, ' ')}</span>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={permissionData.permissions[permission] || false}
                                            onChange={(e) => setPermissionData({
                                                ...permissionData,
                                                permissions: {
                                                    ...permissionData.permissions,
                                                    [permission]: e.target.checked
                                                }
                                            })}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowPermissionModal(false)}>Cancel</Button>
                            <Button onClick={handlePermissionUpdate} className="bg-indigo-600 hover:bg-indigo-700">
                                Update Permissions
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}