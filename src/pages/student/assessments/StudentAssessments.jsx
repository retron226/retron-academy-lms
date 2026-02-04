import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    serverTimestamp
} from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Progress } from "../../../components/ui/progress";
import {
    Loader2,
    FileText,
    CheckCircle,
    Clock,
    BarChart,
    Calendar,
    BookOpen,
    PlayCircle,
    Award,
    Users,
    GraduationCap,
    Eye,
    Shield,
    LockOpen,
    RefreshCw
} from "lucide-react";

export default function StudentAssessments() {
    const { user, userData } = useAuth();
    const navigate = useNavigate();

    const [availableAssessments, setAvailableAssessments] = useState([]);
    const [enrolledAssessments, setEnrolledAssessments] = useState([]);
    const [completedAssessments, setCompletedAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState({});

    // Stats
    const [stats, setStats] = useState({
        totalAvailable: 0,
        totalEnrolled: 0,
        totalCompleted: 0,
        averageScore: 0
    });

    useEffect(() => {
        if (userData && user) {
            fetchAssessmentsData();
        }
    }, [userData, user]);

    // Replace the fetchAssessmentsData function with this corrected version:

    const fetchAssessmentsData = async () => {
        try {
            setLoading(true);

            // Create arrays to collect data
            let allCourseAvailableAssessments = [];
            let allEnrolledAssigned = [];
            let allCompletedAssigned = [];

            // 1. Get assessments that student has been granted access to (via partner instructor)
            const assessmentAccessRef = collection(db, "users", user.uid, "assessmentAccess");
            const assessmentAccessSnap = await getDocs(assessmentAccessRef);

            const accessData = assessmentAccessSnap.docs.map(doc => ({
                accessId: doc.id,
                ...doc.data()
            }));

            console.log("Assessment access data found:", accessData.length);

            // Process accessed assessments
            for (const access of accessData) {
                try {
                    const assessmentDoc = await getDoc(doc(db, "assessments", access.assessmentId));
                    if (!assessmentDoc.exists()) continue;

                    const assessmentData = assessmentDoc.data();
                    const submissionDoc = await getDoc(
                        doc(db, "assessments", access.assessmentId, "submissions", user.uid)
                    );

                    const isSubmitted = submissionDoc.exists();
                    const submissionData = submissionDoc.data();

                    const assessmentObj = {
                        id: access.assessmentId,
                        accessId: access.accessId,
                        ...assessmentData,
                        ...access,
                        isSubmitted,
                        submission: submissionData,
                        score: assessmentData?.questions?.length
                            ? ((submissionData?.score || 0) / assessmentData.questions.length) * 100
                            : 0,
                        submittedAt: submissionData?.submittedAt || null,
                        status: isSubmitted ? "completed" : "enrolled",
                        isAssigned: true
                    };

                    if (isSubmitted) {
                        allCompletedAssigned.push(assessmentObj);
                    } else {
                        allEnrolledAssigned.push(assessmentObj);
                    }
                } catch (error) {
                    console.error(`Error fetching assessment ${access.assessmentId}:`, error);
                }
            }

            console.log("After processing assessment access:", {
                completed: allCompletedAssigned.length,
                enrolled: allEnrolledAssigned.length
            });

            // 2. Get course assessments (non-assigned)
            try {
                const enrolledCourses = userData.enrolledCourses || [];
                if (enrolledCourses.length > 0) {
                    const assessmentsQuery = query(
                        collection(db, "assessments"),
                        where("courseId", "in", enrolledCourses),
                        where("status", "==", "published")
                    );
                    const assessmentsSnap = await getDocs(assessmentsQuery);

                    const allCourseAssessments = assessmentsSnap.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    // Filter out assessments already accessed
                    const assignedIds = [...allEnrolledAssigned, ...allCompletedAssigned].map(a => a.id);
                    allCourseAvailableAssessments = allCourseAssessments.filter(assessment =>
                        !assignedIds.includes(assessment.id)
                    );
                }
            } catch (error) {
                console.error("Error fetching course assessments:", error);
            }

            // 3. Process enrolled assessments from user data
            const userEnrolledAssessments = userData.enrolledAssessments || [];
            for (const assessmentId of userEnrolledAssessments) {
                try {
                    // Skip if already processed
                    if ([...allEnrolledAssigned, ...allCompletedAssigned].some(a => a.id === assessmentId)) {
                        continue;
                    }

                    const assessmentDoc = await getDoc(doc(db, "assessments", assessmentId));
                    if (!assessmentDoc.exists()) continue;

                    const assessmentData = assessmentDoc.data();
                    const submissionDoc = await getDoc(
                        doc(db, "assessments", assessmentId, "submissions", user.uid)
                    );

                    const isSubmitted = submissionDoc.exists();
                    if (isSubmitted) {
                        const submissionData = submissionDoc.data();
                        allCompletedAssigned.push({
                            id: assessmentId,
                            ...assessmentData,
                            isSubmitted,
                            submission: submissionData,
                            score: submissionData?.score || 0, // Default to 0 instead of null
                            submittedAt: submissionData?.submittedAt || null,
                            status: "completed"
                        });
                    } else {
                        allEnrolledAssigned.push({
                            id: assessmentId,
                            ...assessmentData,
                            isSubmitted: false,
                            status: "enrolled",
                            isCourseEnrolled: true
                        });
                    }
                } catch (error) {
                    console.error(`Error fetching enrolled assessment ${assessmentId}:`, error);
                }
            }

            console.log("After processing all data:", {
                available: allCourseAvailableAssessments.length,
                enrolled: allEnrolledAssigned.length,
                completed: allCompletedAssigned.length,
                completedDetails: allCompletedAssigned.map(a => ({
                    title: a.title,
                    score: a.score,
                    submittedAt: a.submittedAt
                }))
            });

            // 4. Sort and set state
            allCourseAvailableAssessments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            allEnrolledAssigned.sort((a, b) => new Date(a.dueDate || a.createdAt) - new Date(b.dueDate || b.createdAt));
            allCompletedAssigned.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

            // 5. Calculate stats - FIXED
            const totalAvailable = allCourseAvailableAssessments.length;
            const totalEnrolled = allEnrolledAssigned.length;
            const totalCompleted = allCompletedAssigned.length;

            // Calculate average score including ALL completed assessments
            let averageScore = 0;
            if (totalCompleted > 0) {
                // Filter out null/undefined scores but include 0 scores
                const validScores = allCompletedAssigned
                    .map(a => a.score)
                    .filter(score => score !== null && score !== undefined);

                if (validScores.length > 0) {
                    const sum = validScores.reduce((total, score) => total + score, 0);
                    averageScore = Math.round(sum / validScores.length);
                }
            }

            console.log("Final stats calculation:", {
                totalAvailable,
                totalEnrolled,
                totalCompleted,
                averageScore,
                allScores: allCompletedAssigned.map(a => a.score),
                validScores: allCompletedAssigned
                    .map(a => a.score)
                    .filter(score => score !== null && score !== undefined)
            });

            setStats({
                totalAvailable,
                totalEnrolled,
                totalCompleted,
                averageScore
            });

            setAvailableAssessments(allCourseAvailableAssessments);
            setEnrolledAssessments(allEnrolledAssigned);
            setCompletedAssessments(allCompletedAssigned);

        } catch (error) {
            console.error("Error fetching assessments:", error);
        } finally {
            setLoading(false);
        }
    };
    const handleEnrollAssessment = async (assessmentId) => {
        if (enrolling[assessmentId]) return;

        setEnrolling(prev => ({ ...prev, [assessmentId]: true }));
        try {
            // Check if already enrolled via assessmentAccess
            const accessCheck = await getDoc(
                doc(db, "users", user.uid, "assessmentAccess", assessmentId)
            );

            if (accessCheck.exists()) {
                alert("You already have access to this assessment.");
                return;
            }

            // For backward compatibility - enroll via old method
            await updateDoc(doc(db, "users", user.uid), {
                enrolledAssessments: arrayUnion(assessmentId),
                lastUpdated: serverTimestamp()
            });

            // Immediately update local state for better UX
            const assessmentToEnroll = availableAssessments.find(a => a.id === assessmentId);
            if (assessmentToEnroll) {
                // Move from available to enrolled
                setAvailableAssessments(prev => prev.filter(a => a.id !== assessmentId));
                setEnrolledAssessments(prev => [...prev, {
                    ...assessmentToEnroll,
                    status: "enrolled",
                    isCourseEnrolled: true
                }]);

                // Update stats immediately
                setStats(prev => ({
                    ...prev,
                    totalAvailable: prev.totalAvailable - 1,
                    totalEnrolled: prev.totalEnrolled + 1
                }));
            }

            // Then refresh data to ensure consistency
            setTimeout(() => {
                fetchAssessmentsData();
            }, 500);

        } catch (error) {
            console.error("Error enrolling in assessment:", error);
            alert("Failed to enroll in assessment. Please try again.");

            // Refresh data on error to reset state
            fetchAssessmentsData();
        } finally {
            setEnrolling(prev => ({ ...prev, [assessmentId]: false }));
        }
    };

    const handleStartAssessment = (assessmentId) => {
        navigate(`/student/assessments/${assessmentId}`);
    };

    const formatTimeLimit = (minutes) => {
        if (!minutes) return "No time limit";
        if (minutes < 60) return `${minutes} minutes`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
    };

    const getAssessmentBadge = (assessment) => {
        if (assessment.status === "completed") {
            return (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                </Badge>
            );
        }

        if (assessment.difficulty) {
            let color = "bg-blue-100 text-blue-800";
            if (assessment.difficulty === "hard") color = "bg-red-100 text-red-800";
            if (assessment.difficulty === "medium") color = "bg-amber-100 text-amber-800";

            return (
                <Badge className={`${color} hover:${color}`}>
                    {assessment.difficulty.charAt(0).toUpperCase() + assessment.difficulty.slice(1)}
                </Badge>
            );
        }

        return null;
    };

    const getAccessBadge = (assessment) => {
        if (assessment.grantedBy) {
            return (
                <></>
                // <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                //     <Shield className="h-3 w-3 mr-1" />
                //     Assigned by Instructor
                // </Badge>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="mt-4">Loading assessments...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Assessments & Quizzes</h1>
                <p className="text-muted-foreground">
                    {stats.totalEnrolled > 0 || stats.totalAvailable > 0
                        ? "Test your knowledge with assessments assigned by your instructors"
                        : "No assessments available yet. Instructors will assign assessments here."}
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Available</p>
                                <p className="text-2xl font-bold">{stats.totalAvailable}</p>
                            </div>
                            <BookOpen className="h-8 w-8 text-primary" />
                        </div>
                    </CardContent>
                </Card> */}

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                                <p className="text-2xl font-bold">{stats.totalEnrolled}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                                <p className="text-2xl font-bold">{stats.totalCompleted}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Avg. Score</p>
                                <p className="text-2xl font-bold">{stats.averageScore}%</p>
                            </div>
                            <Award className="h-8 w-8 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Enrolled Assessments (Assigned by Instructors) */}
            {enrolledAssessments.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-semibold">Assigned Assessments</h2>
                        </div>
                        <Badge variant="outline">
                            {enrolledAssessments.length} pending
                        </Badge>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {enrolledAssessments.map((assessment) => (
                            <Card key={assessment.id} className="group hover:shadow-lg transition-all duration-300 border-blue-100">
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start gap-2">
                                        <CardTitle className="line-clamp-2 text-lg">{assessment.title}</CardTitle>
                                        {getAssessmentBadge(assessment)}
                                    </div>
                                    {getAccessBadge(assessment)}
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                        {assessment.description || "No description available"}
                                    </p>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <BarChart className="h-4 w-4 text-primary" />
                                                <span>{assessment.questions?.length || 0} Questions</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-amber-600" />
                                                <span>{formatTimeLimit(assessment.timeLimit)}</span>
                                            </div>
                                        </div>

                                        {assessment.dueDate && (
                                            <div className="flex items-center gap-2 text-sm text-amber-600">
                                                <Calendar className="h-4 w-4" />
                                                <span>Due: {new Date(assessment.dueDate).toLocaleDateString()}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <GraduationCap className="h-4 w-4" />
                                            <span>
                                                {assessment.courseTitle || assessment.courseName || "Course Assessment"}
                                            </span>
                                        </div>

                                        {assessment.grantedByName && (
                                            <div className="flex items-center gap-2 text-sm text-purple-600">
                                                <Shield className="h-4 w-4" />
                                                <span>Assigned by: {assessment.grantedByName}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handleStartAssessment(assessment.id)}
                                            className="flex-1 gap-2"
                                        >
                                            <PlayCircle className="h-4 w-4" />
                                            Start Assessment
                                        </Button>
                                        {/* <Button
                                            variant="outline"
                                            size="icon"
                                            title="View Assessment Details"
                                            onClick={() => navigate(`/student/assessment/${assessment.id}/preview`)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button> */}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Available Assessments (From Courses) */}
            {availableAssessments.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            <h2 className="text-xl font-semibold">Course Assessments</h2>
                        </div>
                        <Badge variant="outline">
                            {availableAssessments.length} available
                        </Badge>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {availableAssessments.map((assessment) => (
                            <Card key={assessment.id} className="group hover:shadow-lg transition-all duration-300">
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="line-clamp-2 text-lg">{assessment.title}</CardTitle>
                                        {getAssessmentBadge(assessment)}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                        {assessment.description || "No description available"}
                                    </p>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <BarChart className="h-4 w-4 text-primary" />
                                                <span>{assessment.questions?.length || 0} Questions</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-amber-600" />
                                                <span>{formatTimeLimit(assessment.timeLimit)}</span>
                                            </div>
                                        </div>

                                        {assessment.dueDate && (
                                            <div className="flex items-center gap-2 text-sm text-amber-600">
                                                <Calendar className="h-4 w-4" />
                                                <span>Due: {new Date(assessment.dueDate).toLocaleDateString()}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <GraduationCap className="h-4 w-4" />
                                            <span>From: {assessment.courseName || "Your Course"}</span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => handleEnrollAssessment(assessment.id)}
                                        disabled={enrolling[assessment.id]}
                                        className="w-full gap-2"
                                    >
                                        {enrolling[assessment.id] ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Enrolling...
                                            </>
                                        ) : (
                                            <>
                                                <LockOpen className="h-4 w-4" />
                                                Enroll Now
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Assessments */}
            {completedAssessments.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <h2 className="text-xl font-semibold">Completed Assessments</h2>
                        </div>
                        <Badge variant="outline">
                            {completedAssessments.length} completed
                        </Badge>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {completedAssessments.map((assessment) => (
                            <Card key={assessment.id} className="group hover:shadow-lg transition-all duration-300 border-green-50">
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="line-clamp-2 text-lg">{assessment.title}</CardTitle>
                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            {assessment.score?.toFixed(2) || 0}%
                                        </Badge>
                                    </div>
                                    {getAccessBadge(assessment)}
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                        {assessment.description || "No description available"}
                                    </p>

                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-medium">Score</span>
                                                <span className="font-bold text-primary">{assessment.score?.toFixed(2) || 0}%</span>
                                            </div>
                                            <Progress value={assessment.score} className="h-2" />
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <BarChart className="h-4 w-4 text-primary" />
                                                <span>{assessment.questions?.length || 0} Questions</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                <span>Submitted: {new Date(assessment.submittedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        {assessment.grantedByName && (
                                            <div className="flex items-center gap-2 text-sm text-purple-600">
                                                <Shield className="h-4 w-4" />
                                                <span>Assigned by: {assessment.grantedByName}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        {/* <Button
                                            variant="outline"
                                            className="flex-1 gap-2"
                                            onClick={() => navigate(`/student/assessment/${assessment.id}/review`)}
                                        >
                                            <FileText className="h-4 w-4" />
                                            View Details
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            title="Retake Assessment"
                                            onClick={() => navigate(`/student/assessment/${assessment.id}/retake`)}
                                        >
                                            <PlayCircle className="h-4 w-4" />
                                        </Button> */}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {availableAssessments.length === 0 && enrolledAssessments.length === 0 && completedAssessments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl">
                    <BarChart className="h-16 w-16 mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-xl font-semibold text-muted-foreground mb-2">No Assessments Available</h3>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        {userData?.role === 'student'
                            ? "You don't have any assessments assigned yet. Assessments will appear here when your instructors assign them to you."
                            : "There are currently no assessments available. Assessments will appear here as they are created and published."}
                    </p>
                    <div className="flex gap-4">
                        <Button onClick={() => navigate("/student/courses")} variant="outline">
                            <BookOpen className="h-4 w-4 mr-2" />
                            View Your Courses
                        </Button>
                        <Button onClick={fetchAssessmentsData}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}