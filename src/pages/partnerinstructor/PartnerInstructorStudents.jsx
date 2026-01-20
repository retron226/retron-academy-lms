import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc
} from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "../../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Search, Eye, X, GraduationCap } from "lucide-react";
import { Button } from "../../components/ui/button";
import { PERMISSIONS } from "../../lib/rbac";

export default function PartnerInstructorStudents() {
    const { userData } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentProgress, setStudentProgress] = useState([]);
    const [studentCourses, setStudentCourses] = useState([]);

    // Course Filtering State
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState("all");

    // Check permissions directly using hasPermission from useAuth
    const canViewStudents = userData?.role === 'partner_instructor' ||
        userData?.role === 'instructor' ||
        userData?.role === 'admin';
    const canViewProgress = userData?.role === 'partner_instructor' ||
        userData?.role === 'instructor' ||
        userData?.role === 'admin';

    useEffect(() => {
        if (canViewStudents && userData) {
            fetchStudents();
            fetchCourses();
        }
    }, [userData, canViewStudents]);

    // Fetch courses that the partner instructor has access to
    const fetchCourses = async () => {
        try {
            // First, get the partner instructor's institution
            const institutionId = userData.institutionId;

            if (!institutionId) {
                console.error("No institution assigned to partner instructor");
                setCourses([]);
                return;
            }

            // Fetch courses for this institution
            const q = query(
                collection(db, "courses"),
                where("institutionId", "==", institutionId)
            );

            const querySnapshot = await getDocs(q);
            const coursesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setCourses(coursesData);
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    // Fetch students enrolled in the partner instructor's institution courses
    const fetchStudents = async () => {
        try {
            setLoading(true);

            const institutionId = userData.institutionId;

            if (!institutionId) {
                console.error("No institution assigned");
                setStudents([]);
                setLoading(false);
                return;
            }

            // Get all students (we'll filter by institution later)
            const q = query(collection(db, "users"), where("role", "==", "student"));
            const querySnapshot = await getDocs(q);

            const studentsData = [];

            for (const docSnapshot of querySnapshot.docs) {
                const studentData = {
                    id: docSnapshot.id,
                    ...docSnapshot.data()
                };

                // Get student's enrolled courses
                const enrollmentsRef = collection(db, "users", docSnapshot.id, "enrollments");
                const enrollmentsSnap = await getDocs(enrollmentsRef);
                const enrolledCourseIds = enrollmentsSnap.docs.map(d => d.id);

                // Get enrolled courses data
                const enrolledCourses = [];
                for (const courseId of enrolledCourseIds) {
                    const courseRef = doc(db, "courses", courseId);
                    const courseSnap = await getDoc(courseRef);

                    if (courseSnap.exists()) {
                        const courseData = courseSnap.data();
                        // Check if course belongs to partner instructor's institution
                        if (courseData.institutionId === institutionId) {
                            enrolledCourses.push({
                                id: courseId,
                                ...courseData
                            });
                        }
                    }
                }

                // Only include students enrolled in at least one institution course
                if (enrolledCourses.length > 0) {
                    studentData.enrolledCourses = enrolledCourses;
                    studentsData.push(studentData);
                }
            }

            setStudents(studentsData);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentProgress = async (studentId) => {
        if (!canViewProgress) return;

        try {
            // Get progress for all institution courses
            const progressData = [];

            for (const course of courses) {
                const progressRef = doc(db, "users", studentId, "courseProgress", course.id);
                const progressSnap = await getDoc(progressRef);

                if (progressSnap.exists()) {
                    progressData.push({
                        courseId: course.id,
                        courseTitle: course.title,
                        ...progressSnap.data()
                    });
                } else {
                    // Student might be enrolled but no progress yet
                    progressData.push({
                        courseId: course.id,
                        courseTitle: course.title,
                        completedModules: [],
                        lastAccessed: null,
                        progressPercentage: 0
                    });
                }
            }

            setStudentProgress(progressData);
        } catch (error) {
            console.error("Error fetching student progress:", error);
        }
    };

    const fetchStudentEnrolledCourses = async (studentId) => {
        try {
            const enrollmentsRef = collection(db, "users", studentId, "enrollments");
            const enrollmentsSnap = await getDocs(enrollmentsRef);
            const enrolledCourseIds = enrollmentsSnap.docs.map(d => d.id);

            const courseDetails = [];
            for (const courseId of enrolledCourseIds) {
                const courseRef = doc(db, "courses", courseId);
                const courseSnap = await getDoc(courseRef);

                if (courseSnap.exists()) {
                    const courseData = courseSnap.data();
                    // Only show courses from this institution
                    if (courseData.institutionId === userData.institutionId) {
                        courseDetails.push({
                            id: courseId,
                            ...courseData
                        });
                    }
                }
            }

            setStudentCourses(courseDetails);
        } catch (error) {
            console.error("Error fetching student courses:", error);
        }
    };

    const handleViewStudent = async (student) => {
        setSelectedStudent(student);
        if (canViewProgress) {
            await fetchStudentProgress(student.id);
        }
        await fetchStudentEnrolledCourses(student.id);
    };

    // Filter students based on search and selected course
    const filteredStudents = students.filter(student => {
        const matchesSearch = searchQuery === "" ||
            student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.fullName?.toLowerCase().includes(searchQuery.toLowerCase());

        // If "all" is selected, show all students in the institution
        if (selectedCourseId === "all") {
            return matchesSearch;
        }

        // Filter by selected course
        const isEnrolledInCourse = student.enrolledCourses?.some(
            course => course.id === selectedCourseId
        );

        return matchesSearch && isEnrolledInCourse;
    });

    if (!canViewStudents) {
        return (
            <div className="text-center py-12">
                <div className="mx-auto max-w-md">
                    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                        <h3 className="text-lg font-semibold text-red-800">Access Denied</h3>
                        <p className="mt-2 text-sm text-red-600">
                            You don't have permission to view students. Please contact your administrator.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    {userData?.role === 'partner_instructor' ? 'My Students' : 'Institution Students'}
                </h1>
                <p className="text-muted-foreground mt-2">
                    {userData?.role === 'partner_instructor'
                        ? 'View students assigned to your courses'
                        : 'View students enrolled in your institution\'s courses'}
                </p>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by email or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>

                {/* Course Filter Dropdown */}
                {courses.length > 0 && (
                    <div className="w-full md:w-64">
                        <select
                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                        >
                            <option value="all">All Students</option>
                            {courses.map(course => (
                                <option key={course.id} value={course.id}>
                                    {course.title}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Stats Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                                <p className="text-2xl font-bold">{students.length}</p>
                            </div>
                            <GraduationCap className="h-8 w-8 text-primary" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Courses</p>
                                <p className="text-2xl font-bold">{courses.length}</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-bold">{courses.length}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Showing</p>
                                <p className="text-2xl font-bold">{filteredStudents.length} students</p>
                            </div>
                            <Eye className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Students Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Students</CardTitle>
                    <p className="text-sm text-muted-foreground font-normal">
                        {selectedCourseId === "all"
                            ? "All students in your institution"
                            : `Students enrolled in selected course`}
                    </p>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>College</TableHead>
                                <TableHead>Enrolled Courses</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="h-8 w-8 opacity-50" />
                                            <p>{searchQuery ? "No students match your search" : "No students found"}</p>
                                            {!searchQuery && (
                                                <p className="text-sm">Students will appear here once they enroll in your institution's courses</p>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStudents.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium">
                                            {student.fullName || "N/A"}
                                        </TableCell>
                                        <TableCell>{student.email}</TableCell>
                                        <TableCell>{student.college || "N/A"}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {student.enrolledCourses?.slice(0, 2).map(course => (
                                                    <span
                                                        key={course.id}
                                                        className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                                                    >
                                                        {course.title}
                                                    </span>
                                                ))}
                                                {student.enrolledCourses?.length > 2 && (
                                                    <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                                        +{student.enrolledCourses.length - 2} more
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleViewStudent(student)}
                                                title="View Details"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Student Details Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl p-6 relative max-h-[80vh] overflow-y-auto">
                        <button
                            onClick={() => setSelectedStudent(null)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h2 className="text-2xl font-bold mb-6">Student Details</h2>

                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                                    <p className="text-lg font-medium">{selectedStudent.fullName || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                                    <p className="text-lg">{selectedStudent.email}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">College</label>
                                    <p className="text-lg">{selectedStudent.college || "N/A"}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Joined Date</label>
                                    <p>{selectedStudent.createdAt ? new Date(selectedStudent.createdAt).toLocaleDateString() : "Unknown"}</p>
                                </div>
                            </div>

                            {/* Enrolled Courses */}
                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-3 block">Enrolled Courses</label>
                                {studentCourses.length > 0 ? (
                                    <div className="space-y-2">
                                        {studentCourses.map(course => (
                                            <div key={course.id} className="p-3 border rounded-md">
                                                <div className="font-medium">{course.title}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {course.description?.substring(0, 100)}...
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">No courses enrolled</p>
                                )}
                            </div>

                            {/* Progress Section (if permission exists) */}
                            {canViewProgress && studentProgress.length > 0 && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground mb-3 block">Course Progress</label>
                                    <div className="space-y-3">
                                        {studentProgress.map(progress => (
                                            <div key={progress.courseId} className="p-3 border rounded-md">
                                                <div className="flex justify-between items-start">
                                                    <div className="font-medium">{progress.courseTitle}</div>
                                                    <span className="text-sm font-medium text-primary">
                                                        {progress.progressPercentage || 0}%
                                                    </span>
                                                </div>
                                                <div className="mt-2">
                                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary rounded-full"
                                                            style={{ width: `${progress.progressPercentage || 0}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-sm text-muted-foreground">
                                                    {progress.completedModules?.length || 0} modules completed
                                                </div>
                                                {progress.lastAccessed && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Last accessed: {new Date(progress.lastAccessed).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex justify-end">
                            <Button onClick={() => setSelectedStudent(null)}>Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}