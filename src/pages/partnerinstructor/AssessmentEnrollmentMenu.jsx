// components/AssessmentEnrollmentMenu.jsx
import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc
} from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter
} from "../../components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Label } from "../../components/ui/label";
import { Loader2, Users, CheckCircle, XCircle, Calendar } from "lucide-react";
import { useToast } from "../../contexts/ToastComponent";

export default function AssessmentEnrollmentMenu() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState({});

    // State for dropdowns
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedAssessment, setSelectedAssessment] = useState("");

    // Data collections
    const [courses, setCourses] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [students, setStudents] = useState([]);
    const [enrollmentStatus, setEnrollmentStatus] = useState({});

    // Fetch assigned courses for partner instructor
    useEffect(() => {
        if (user) {
            fetchAssignedCourses();
        }
    }, [user]);

    // Fetch assessments when course is selected
    useEffect(() => {
        if (selectedCourse) {
            fetchCourseAssessments();
            fetchCourseStudents();
        } else {
            setAssessments([]);
            setStudents([]);
            setSelectedAssessment("");
        }
    }, [selectedCourse]);

    // Fetch enrollment status when assessment is selected
    useEffect(() => {
        if (selectedAssessment && students.length > 0) {
            fetchEnrollmentStatus();
        }
    }, [selectedAssessment, students]);

    const fetchAssignedCourses = async () => {
        try {
            setLoading(true);

            // First check partner_instructors collection
            const partnerRef = doc(db, "partner_instructors", user.uid);
            const partnerSnap = await getDoc(partnerRef);

            if (partnerSnap.exists()) {
                const partnerData = partnerSnap.data();
                const assignedCourses = partnerData.assignedCourses || [];

                // Fetch course details
                const coursePromises = assignedCourses.map(async (courseId) => {
                    const courseRef = doc(db, "courses", courseId);
                    const courseSnap = await getDoc(courseRef);
                    if (courseSnap.exists()) {
                        return {
                            id: courseId,
                            title: courseSnap.data().title,
                            ...courseSnap.data()
                        };
                    }
                    return null;
                });

                const coursesData = (await Promise.all(coursePromises)).filter(Boolean);
                setCourses(coursesData);

                // Auto-select first course if available
                if (coursesData.length === 1) {
                    setSelectedCourse(coursesData[0].id);
                }
            }
        } catch (error) {
            console.error("Error fetching assigned courses:", error);
            toast.error("Failed to load courses");
        } finally {
            setLoading(false);
        }
    };

    const fetchCourseAssessments = async () => {
        try {
            const q = query(
                collection(db, "assessments"),
                where("courseId", "==", selectedCourse)
            );
            const snapshot = await getDocs(q);

            const assessmentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setAssessments(assessmentsData);

            // Auto-select first assessment if available
            if (assessmentsData.length === 1) {
                setSelectedAssessment(assessmentsData[0].id);
            }
        } catch (error) {
            console.error("Error fetching assessments:", error);
            toast.error("Failed to load assessments");
        }
    };

    const fetchCourseStudents = async () => {
        try {
            // First get mentor assignments for this partner instructor
            const mentorAssignmentsQuery = query(
                collection(db, "mentorAssignments"),
                where("mentorId", "==", user.uid),
                where("status", "==", "active")
            );

            const mentorAssignmentsSnap = await getDocs(mentorAssignmentsQuery);
            const studentIds = mentorAssignmentsSnap.docs.map(doc => doc.data().studentId);

            if (studentIds.length === 0) {
                setStudents([]);
                return;
            }

            // Check which students are enrolled in the selected course
            const studentPromises = studentIds.map(async (studentId) => {
                try {
                    // Check enrollment
                    const enrollmentRef = doc(db, "users", studentId, "enrollments", selectedCourse);
                    const enrollmentSnap = await getDoc(enrollmentRef);

                    if (enrollmentSnap.exists()) {
                        // Get student details
                        const studentRef = doc(db, "users", studentId);
                        const studentSnap = await getDoc(studentRef);

                        if (studentSnap.exists()) {
                            const studentData = studentSnap.data();
                            return {
                                id: studentId,
                                name: studentData.fullName || studentData.email,
                                email: studentData.email,
                                enrollmentDate: enrollmentSnap.data().enrolledAt || null,
                                isEnrolled: true
                            };
                        }
                    }

                    // If not enrolled but assigned to mentor
                    const studentRef = doc(db, "users", studentId);
                    const studentSnap = await getDoc(studentRef);

                    if (studentSnap.exists()) {
                        const studentData = studentSnap.data();
                        return {
                            id: studentId,
                            name: studentData.fullName || studentData.email,
                            email: studentData.email,
                            enrollmentDate: null,
                            isEnrolled: false
                        };
                    }

                    return null;
                } catch (error) {
                    console.error(`Error fetching student ${studentId}:`, error);
                    return null;
                }
            });

            const studentsData = (await Promise.all(studentPromises)).filter(Boolean);
            setStudents(studentsData);

        } catch (error) {
            console.error("Error fetching course students:", error);
            toast.error("Failed to load students");
        }
    };

    const fetchEnrollmentStatus = async () => {
        try {
            const status = {};

            for (const student of students) {
                // Check if student has already taken the assessment
                const submissionRef = collection(db, "assessments", selectedAssessment, "submissions");
                const submissionQuery = query(submissionRef, where("studentId", "==", student.id));
                const submissionSnap = await getDocs(submissionQuery);

                status[student.id] = {
                    isEnrolled: student.isEnrolled,
                    hasSubmitted: !submissionSnap.empty,
                    submissionCount: submissionSnap.size
                };
            }

            setEnrollmentStatus(status);
        } catch (error) {
            console.error("Error fetching enrollment status:", error);
        }
    };

    const enrollStudentInAssessment = async (studentId) => {
        try {
            setEnrolling(prev => ({ ...prev, [studentId]: true }));

            // Create assessment access for student
            const studentAssessmentRef = doc(
                db,
                "users",
                studentId,
                "assessmentAccess",
                selectedAssessment
            );

            await setDoc(studentAssessmentRef, {
                assessmentId: selectedAssessment,
                courseId: selectedCourse,
                grantedBy: user.uid,
                grantedAt: new Date().toISOString(),
                expiresAt: null, // Never expires unless specified
                status: "active"
            });

            // Update enrollment status
            setEnrollmentStatus(prev => ({
                ...prev,
                [studentId]: {
                    ...prev[studentId],
                    isEnrolled: true
                }
            }));

            toast.success("Student enrolled in assessment successfully");

        } catch (error) {
            console.error("Error enrolling student:", error);
            toast.error("Failed to enroll student");
        } finally {
            setEnrolling(prev => ({ ...prev, [studentId]: false }));
        }
    };

    const enrollAllStudents = async () => {
        try {
            const studentsToEnroll = students.filter(student =>
                !enrollmentStatus[student.id]?.isEnrolled && student.isEnrolled
            );

            if (studentsToEnroll.length === 0) {
                toast.info("All eligible students are already enrolled");
                return;
            }

            for (const student of studentsToEnroll) {
                await enrollStudentInAssessment(student.id);
            }

            toast.success(`Enrolled ${studentsToEnroll.length} students in assessment`);

        } catch (error) {
            console.error("Error enrolling all students:", error);
            toast.error("Failed to enroll students");
        }
    };

    const getAssessmentDetails = () => {
        return assessments.find(a => a.id === selectedAssessment);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                <span className="ml-3 text-gray-600">Loading enrollment menu...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Assessment Enrollment</h1>
                <p className="text-muted-foreground mt-2">
                    Enroll students in assessments for your assigned courses
                </p>
            </div>

            {/* Selection Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Course & Assessment</CardTitle>
                    <CardDescription>
                        Choose a course to view available assessments and students
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Course Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="course-select">Course</Label>
                        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                            <SelectTrigger id="course-select">
                                <SelectValue placeholder="Select a course" />
                            </SelectTrigger>
                            <SelectContent>
                                {courses.map(course => (
                                    <SelectItem key={course.id} value={course.id}>
                                        {course.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Assessment Selection */}
                    {selectedCourse && (
                        <div className="space-y-2">
                            <Label htmlFor="assessment-select">Assessment</Label>
                            <Select
                                value={selectedAssessment}
                                onValueChange={setSelectedAssessment}
                                disabled={assessments.length === 0}
                            >
                                <SelectTrigger id="assessment-select">
                                    <SelectValue
                                        placeholder={
                                            assessments.length === 0
                                                ? "No assessments available"
                                                : "Select an assessment"
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {assessments.map(assessment => (
                                        <SelectItem key={assessment.id} value={assessment.id}>
                                            <div className="flex items-center justify-between w-full">
                                                <span>{assessment.title}</span>
                                                <Badge variant="outline" className="ml-2">
                                                    {assessment.questions?.length || 0} Qs
                                                </Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {assessments.length === 0 && (
                                <p className="text-sm text-amber-600">
                                    No assessments created for this course yet
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Assessment Details & Enroll All */}
            {selectedAssessment && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>{getAssessmentDetails()?.title || "Assessment"}</CardTitle>
                                <CardDescription>
                                    {getAssessmentDetails()?.description || "No description"}
                                </CardDescription>
                            </div>
                            <Button
                                onClick={enrollAllStudents}
                                variant="default"
                                disabled={students.filter(s => s.isEnrolled && !enrollmentStatus[s.id]?.isEnrolled).length === 0}
                            >
                                <Users className="mr-2 h-4 w-4" />
                                Enroll All Eligible Students
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="text-sm text-blue-600">Total Students</div>
                                <div className="text-2xl font-bold">{students.length}</div>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <div className="text-sm text-green-600">Course Enrolled</div>
                                <div className="text-2xl font-bold">
                                    {students.filter(s => s.isEnrolled).length}
                                </div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <div className="text-sm text-purple-600">Assessment Enrolled</div>
                                <div className="text-2xl font-bold">
                                    {Object.values(enrollmentStatus).filter(s => s.isEnrolled).length}
                                </div>
                            </div>
                            <div className="bg-amber-50 p-4 rounded-lg">
                                <div className="text-sm text-amber-600">Already Submitted</div>
                                <div className="text-2xl font-bold">
                                    {Object.values(enrollmentStatus).filter(s => s.hasSubmitted).length}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Students List */}
            {selectedAssessment && students.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Student Enrollment Status</CardTitle>
                        <CardDescription>
                            Manage which students can access this assessment
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {students.map(student => {
                                const status = enrollmentStatus[student.id] || {};

                                return (
                                    <div
                                        key={student.id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <Users className="h-5 w-5 text-gray-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium">{student.name}</h4>
                                                    <p className="text-sm text-gray-500">{student.email}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {/* Course Enrollment Status */}
                                            <div className="text-center">
                                                <div className={`text-xs font-medium px-2 py-1 rounded-full ${student.isEnrolled
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                                    }`}>
                                                    {student.isEnrolled ? "Course Enrolled" : "Not in Course"}
                                                </div>
                                                {student.enrollmentDate && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Since {new Date(student.enrollmentDate).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Assessment Status */}
                                            <div className="text-center">
                                                <div className="flex items-center gap-2">
                                                    {status.hasSubmitted ? (
                                                        <Badge variant="success" className="gap-1">
                                                            <CheckCircle className="h-3 w-3" />
                                                            Submitted ({status.submissionCount})
                                                        </Badge>
                                                    ) : status.isEnrolled ? (
                                                        <Badge variant="outline" className="gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            Enrolled
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="gap-1">
                                                            <XCircle className="h-3 w-3" />
                                                            Not Enrolled
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <div>
                                                {!status.isEnrolled && student.isEnrolled ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => enrollStudentInAssessment(student.id)}
                                                        disabled={enrolling[student.id]}
                                                    >
                                                        {enrolling[student.id] ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                                                Enrolling...
                                                            </>
                                                        ) : (
                                                            "Enroll in Assessment"
                                                        )}
                                                    </Button>
                                                ) : status.isEnrolled ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled
                                                    >
                                                        Already Enrolled
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled
                                                        title="Student must be enrolled in the course first"
                                                    >
                                                        Enroll in Course First
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <div className="text-sm text-gray-500 w-full text-center">
                            Showing {students.length} student{students.length !== 1 ? 's' : ''} assigned to you
                        </div>
                    </CardFooter>
                </Card>
            )}

            {selectedCourse && students.length === 0 && (
                <Card>
                    <CardContent className="py-8 text-center">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-600">No Students Assigned</h3>
                        <p className="text-gray-500 mt-2">
                            You don't have any students assigned to you for this course.
                        </p>
                        <Button variant="outline" className="mt-4" asChild>
                            <a href="/partner-instructor/students">Manage Student Assignments</a>
                        </Button>
                    </CardContent>
                </Card>
            )}

            {!selectedCourse && courses.length === 0 && (
                <Card>
                    <CardContent className="py-8 text-center">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-600">No Courses Assigned</h3>
                        <p className="text-gray-500 mt-2">
                            You haven't been assigned to any courses yet.
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                            Contact your institution administrator to get assigned to courses.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}