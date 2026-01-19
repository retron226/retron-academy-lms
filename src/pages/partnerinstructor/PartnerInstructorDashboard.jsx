import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Building2, Users, TrendingUp, Shield, BookOpen, GraduationCap } from "lucide-react";
import PartnerInstructorStudents from "./PartnerInstructorStudents";
import InstructorCourses from "../instructor/InstructorCourses";
import CourseEditor from "../instructor/CourseEditor";
import { PERMISSIONS, getRoleDisplayName } from "../../lib/rbac";

export default function PartnerInstructorDashboard() {
    const { userData, hasPermission } = useAuth();
    const [institution, setInstitution] = useState(null);
    const [stats, setStats] = useState({
        totalStudents: 0,
        activeStudents: 0,
        totalCourses: 0,
        isLoading: true
    });
    const [permissionList, setPermissionList] = useState([]);

    // Fetch institution details
    const fetchInstitution = async () => {
        try {
            if (userData?.institutionId) {
                const docSnap = await getDoc(doc(db, "institutions", userData.institutionId));
                if (docSnap.exists()) {
                    setInstitution({ id: docSnap.id, ...docSnap.data() });
                }
            }
        } catch (error) {
            console.error("Error fetching institution:", error);
        }
    };

    // Fetch institution courses
    const fetchInstitutionCourses = async () => {
        try {
            if (!userData?.institutionId) return [];

            const q = query(
                collection(db, "courses"),
                where("institutionId", "==", userData.institutionId)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error fetching courses:", error);
            return [];
        }
    };

    // Fetch stats with proper institution filtering
    const fetchStats = async () => {
        try {
            console.log("Partner Dashboard: Fetching stats for institution:", userData?.institutionId);

            // 1. Get all institution courses
            const institutionCourses = await fetchInstitutionCourses();
            console.log("Institution courses:", institutionCourses.length);

            // 2. Get all students
            const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
            const studentsSnapshot = await getDocs(studentsQuery);
            console.log("Total students in system:", studentsSnapshot.size);

            // 3. For each student, check if they're enrolled in any institution course
            let totalStudents = 0;
            let activeStudents = 0;

            for (const studentDoc of studentsSnapshot.docs) {
                const studentData = studentDoc.data();

                // Get student's enrollments
                const enrollmentsRef = collection(db, "users", studentDoc.id, "enrollments");
                const enrollmentsSnap = await getDocs(enrollmentsRef);
                const enrolledCourseIds = enrollmentsSnap.docs.map(d => d.id);

                // Check if student is enrolled in any institution course
                const isEnrolledInInstitutionCourse = enrolledCourseIds.some(courseId =>
                    institutionCourses.some(course => course.id === courseId)
                );

                if (isEnrolledInInstitutionCourse) {
                    totalStudents++;
                    if (enrolledCourseIds.length > 0) {
                        activeStudents++;
                    }
                }
            }

            console.log("Calculated stats - Total:", totalStudents, "Active:", activeStudents);

            setStats({
                totalStudents,
                activeStudents,
                totalCourses: institutionCourses.length,
                isLoading: false
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
            setStats(prev => ({ ...prev, isLoading: false }));
        }
    };

    // Process permissions for display
    const processPermissions = () => {
        if (!userData?.permissions) return [];

        const permissionLabels = {
            [PERMISSIONS.VIEW_ASSIGNED_COURSES]: "View Assigned Courses",
            [PERMISSIONS.VIEW_ASSIGNED_STUDENTS]: "View Assigned Students",
            [PERMISSIONS.GRADE_ASSIGNED_ASSESSMENTS]: "Grade Assignments",
            [PERMISSIONS.PROVIDE_FEEDBACK]: "Provide Feedback",
            [PERMISSIONS.SEND_MESSAGES]: "Send Messages",
            [PERMISSIONS.CREATE_ANNOUNCEMENTS]: "Create Announcements",
            [PERMISSIONS.VIEW_COURSE_CONTENT]: "View Course Content"
        };

        const permissionsList = [];
        for (const [key, value] of Object.entries(userData.permissions)) {
            if (value) {
                permissionsList.push(permissionLabels[key] || key.replace(/_/g, ' '));
            }
        }
        return permissionsList;
    };

    useEffect(() => {
        const loadDashboardData = async () => {
            if (userData?.institutionId) {
                await fetchInstitution();
                await fetchStats();

                // Process permissions for display
                setPermissionList(processPermissions());
            }
        };

        loadDashboardData();
    }, [userData]);

    return (
        <Routes>
            <Route index element={
                <div className="space-y-6">
                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Partner Instructor Dashboard</h1>
                        <p className="text-muted-foreground mt-2">
                            Welcome, {userData?.fullName || userData?.email}!
                            Monitor students from your assigned institution
                        </p>
                    </div>

                    {/* Institution Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Building2 className="h-5 w-5 text-primary" />
                                Assigned Institution
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {institution ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Name</p>
                                            <p className="text-base font-semibold">{institution.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Location</p>
                                            <p className="text-base font-semibold">{institution.location || "Not specified"}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Contact Email</p>
                                            <p className="text-base font-semibold">{institution.contactEmail || "Not specified"}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Contact Phone</p>
                                            <p className="text-base font-semibold">{institution.contactPhone || "Not specified"}</p>
                                        </div>
                                    </div>
                                    {institution.description && (
                                        <div className="pt-2 border-t">
                                            <p className="text-sm font-medium text-muted-foreground">Description</p>
                                            <p className="text-sm mt-1">{institution.description}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-4">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                    <span className="ml-2 text-muted-foreground">Loading institution details...</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {stats.isLoading ? (
                                    <div className="flex items-center">
                                        <div className="h-2 w-2 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2"></div>
                                        <span className="text-sm text-muted-foreground">Loading...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-2xl font-bold">{stats.totalStudents}</div>
                                        <p className="text-xs text-muted-foreground">
                                            From your institution
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Students</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {stats.isLoading ? (
                                    <div className="flex items-center">
                                        <div className="h-2 w-2 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2"></div>
                                        <span className="text-sm text-muted-foreground">Loading...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-2xl font-bold">{stats.activeStudents}</div>
                                        <p className="text-xs text-muted-foreground">
                                            Currently enrolled in courses
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {stats.isLoading ? (
                                    <div className="flex items-center">
                                        <div className="h-2 w-2 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2"></div>
                                        <span className="text-sm text-muted-foreground">Loading...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-2xl font-bold">{stats.totalCourses}</div>
                                        <p className="text-xs text-muted-foreground">
                                            Available in institution
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Permissions */}
                    {/* <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Shield className="h-5 w-5 text-primary" />
                                Your Permissions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {permissionList.length > 0 ? (
                                    permissionList.map((permission, index) => (
                                        <div key={index} className="flex items-center gap-2 p-2 bg-accent/30 rounded-md">
                                            <div className="h-2 w-2 rounded-full bg-green-500" />
                                            <span className="text-sm font-medium">{permission}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 text-center py-4">
                                        <p className="text-muted-foreground">No specific permissions assigned</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            You have default partner instructor permissions
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 pt-4 border-t">
                                <p className="text-sm text-muted-foreground">
                                    Your Role: <span className="font-medium text-foreground">{getRoleDisplayName(userData?.role)}</span>
                                </p>
                            </div>
                        </CardContent>
                    </Card> */}

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <a
                                    href="/partner-instructor/students"
                                    className="group p-4 border rounded-lg hover:border-primary hover:bg-accent/30 transition-all duration-200"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                            <Users className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium">View Students</h3>
                                            <p className="text-sm text-muted-foreground">Monitor institution students</p>
                                        </div>
                                    </div>
                                </a>

                                <a
                                    href="/partner-instructor/courses"
                                    className="group p-4 border rounded-lg hover:border-primary hover:bg-accent/30 transition-all duration-200"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                            <BookOpen className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium">View Courses</h3>
                                            <p className="text-sm text-muted-foreground">Browse institution courses</p>
                                        </div>
                                    </div>
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            } />

            {/* Routes */}
            <Route path="students" element={<PartnerInstructorStudents />} />
            <Route path="courses" element={<InstructorCourses />} />
            <Route path="courses/new" element={<CourseEditor />} />
            <Route path="courses/edit/:courseId" element={<CourseEditor />} />

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/partner-instructor" replace />} />
        </Routes>
    );
}