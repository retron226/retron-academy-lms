import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Plus, FileText, Trash2, BarChart, Users, Eye } from "lucide-react";

export default function InstructorAssessments() {
    const { user, userRole } = useAuth();
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPartnerInstructor, setIsPartnerInstructor] = useState(false);
    const [partnerCourses, setPartnerCourses] = useState([]);

    useEffect(() => {
        if (user) {
            checkPartnerInstructorStatus();
        }
    }, [user]);

    useEffect(() => {
        if (user && isPartnerInstructor) {
            fetchPartnerCourses();
        } else if (user) {
            fetchAssessments();
        }
    }, [user, isPartnerInstructor]);

    // Check if user is a partner instructor
    const checkPartnerInstructorStatus = async () => {
        try {
            // Check user role or look for partner instructor document
            if (userRole === "partner_instructor") {
                setIsPartnerInstructor(true);
                return;
            }

            // Fallback: Check if partner instructor document exists
            const partnerInstructorRef = doc(db, "partnerInstructors", user.uid);
            const partnerSnap = await getDoc(partnerInstructorRef);

            if (partnerSnap.exists()) {
                setIsPartnerInstructor(true);
            } else {
                setIsPartnerInstructor(false);
                setLoading(false);
            }
        } catch (error) {
            console.error("Error checking partner instructor status:", error);
            setIsPartnerInstructor(false);
        }
    };

    // Fetch courses assigned to partner instructor
    const fetchPartnerCourses = async () => {
        try {
            const partnerInstructorRef = doc(db, "partnerInstructors", user.uid);
            const partnerSnap = await getDoc(partnerInstructorRef);

            if (partnerSnap.exists()) {
                const partnerData = partnerSnap.data();
                const assignedCourses = partnerData.assignedCourses || [];

                // Fetch course details for each assigned course
                const coursePromises = assignedCourses.map(async (courseId) => {
                    const courseRef = doc(db, "courses", courseId);
                    const courseSnap = await getDoc(courseRef);
                    if (courseSnap.exists()) {
                        return { id: courseId, ...courseSnap.data() };
                    }
                    return null;
                });

                const courses = (await Promise.all(coursePromises)).filter(Boolean);
                setPartnerCourses(courses);

                // Fetch assessments for partner instructor's courses
                fetchAssessmentsForPartnerInstructor(courses.map(c => c.id));
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error("Error fetching partner courses:", error);
            setLoading(false);
        }
    };

    // Fetch assessments for regular instructor
    const fetchAssessments = async () => {
        try {
            let q;

            if (isPartnerInstructor) {
                // For partner instructors, fetch assessments for their assigned courses
                q = query(collection(db, "assessments"));
                // We'll filter the results client-side based on partner courses
                const snap = await getDocs(q);
                const allAssessments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Filter assessments by assigned courses
                const filteredAssessments = allAssessments.filter(assessment =>
                    partnerCourses.some(course => course.id === assessment.courseId)
                );
                setAssessments(filteredAssessments);
            } else {
                // For regular instructors, fetch their own assessments
                q = query(collection(db, "assessments"), where("instructorId", "==", user.uid));
                const snap = await getDocs(q);
                setAssessments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            }
        } catch (error) {
            console.error("Error fetching assessments:", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch assessments for partner instructor's courses
    const fetchAssessmentsForPartnerInstructor = async (courseIds) => {
        try {
            if (courseIds.length === 0) {
                setAssessments([]);
                setLoading(false);
                return;
            }

            // Fetch assessments for all assigned courses
            const assessmentPromises = courseIds.map(async (courseId) => {
                const q = query(
                    collection(db, "assessments"),
                    where("courseId", "==", courseId)
                );
                const snap = await getDocs(q);
                return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            });

            const results = await Promise.all(assessmentPromises);
            const allAssessments = results.flat();

            // Remove duplicates and sort by created date (newest first)
            const uniqueAssessments = Array.from(
                new Map(allAssessments.map(item => [item.id, item])).values()
            ).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

            setAssessments(uniqueAssessments);
        } catch (error) {
            console.error("Error fetching partner instructor assessments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const assessment = assessments.find(a => a.id === id);
        if (!assessment) return;

        // Check if current user is the creator
        if (assessment.instructorId !== user.uid) {
            alert("You can only delete assessments that you created.");
            return;
        }

        if (!window.confirm("Are you sure? This will delete the assessment and all student results.")) {
            return;
        }

        try {
            await deleteDoc(doc(db, "assessments", id));
            setAssessments(assessments.filter(a => a.id !== id));
        } catch (error) {
            console.error("Error deleting assessment:", error);
            alert("Error deleting assessment.");
        }
    };

    // Check if user can edit the assessment
    const canEditAssessment = (assessment) => {
        return assessment.instructorId === user.uid;
    };

    // Check if user can delete the assessment
    const canDeleteAssessment = (assessment) => {
        return assessment.instructorId === user.uid;
    };

    // Get button label based on permissions
    const getEditButtonLabel = (assessment) => {
        if (canEditAssessment(assessment)) {
            return "Edit";
        } else {
            return "View";
        }
    };

    // Get button icon based on permissions
    const getEditButtonIcon = (assessment) => {
        if (canEditAssessment(assessment)) {
            return <FileText className="mr-2 h-4 w-4" />;
        } else {
            return <Eye className="mr-2 h-4 w-4" />;
        }
    };

    // Check if assessment is created by current user
    const isOwnAssessment = (assessment) => {
        return assessment.instructorId === user.uid;
    };

    // Get creator badge text
    const getCreatorBadge = (assessment) => {
        if (isOwnAssessment(assessment)) {
            return "Your Assessment";
        } else {
            return `Created by: ${assessment.instructorName || assessment.instructorId || "Instructor"}`;
        }
    };

    if (loading) return <div className="flex justify-center p-8">Loading assessments...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
                    {isPartnerInstructor && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>Partner Instructor • {partnerCourses.length} Assigned Courses</span>
                        </div>
                    )}
                </div>
                <Link to="new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Create Assessment
                    </Button>
                </Link>
            </div>

            {/* Course Filter for Partner Instructors */}
            {isPartnerInstructor && partnerCourses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchAssessmentsForPartnerInstructor(partnerCourses.map(c => c.id))}
                    >
                        All Courses
                    </Button>
                    {partnerCourses.map(course => (
                        <Button
                            key={course.id}
                            variant="outline"
                            size="sm"
                            onClick={() => fetchAssessmentsForPartnerInstructor([course.id])}
                        >
                            {course.title}
                        </Button>
                    ))}
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {assessments.map((assessment) => {
                    // Find course for partner instructors
                    const assessmentCourse = isPartnerInstructor
                        ? partnerCourses.find(c => c.id === assessment.courseId)
                        : null;

                    const canEdit = canEditAssessment(assessment);
                    const canDelete = canDeleteAssessment(assessment);
                    const isOwn = isOwnAssessment(assessment);

                    return (
                        <Card key={assessment.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="line-clamp-1">{assessment.title}</CardTitle>
                                {assessmentCourse && (
                                    <p className="text-sm text-muted-foreground">
                                        Course: {assessmentCourse.title}
                                    </p>
                                )}
                                <div className={`text-xs font-medium ${isOwn ? 'text-blue-600' : 'text-gray-500'}`}>
                                    {getCreatorBadge(assessment)}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col gap-4">
                                <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                                    {assessment.description || "No description"}
                                </p>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex justify-between">
                                        <span>{assessment.questions?.length || 0} Questions</span>
                                        {assessment.totalPoints && (
                                            <span>{assessment.totalPoints} Points</span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        {/* <span className="font-mono bg-muted px-2 py-1 rounded text-xs">
                                            Access Code: {assessment.accessCode}
                                        </span> */}
                                        <span className={`text-xs font-medium ${isOwn ? 'text-blue-600' : 'text-gray-500'}`}>
                                            {isOwn ? 'You can edit' : 'View only'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <Link to={`edit/${assessment.id}`} className="flex-1">
                                        <Button
                                            variant={canEdit ? "default" : "outline"}
                                            className="w-full"
                                            disabled={!canEdit}
                                        >
                                            {getEditButtonIcon(assessment)}
                                            {getEditButtonLabel(assessment)}
                                        </Button>
                                    </Link>
                                    <Link to={`results/${assessment.id}`} className="flex-1">
                                        <Button variant="secondary" className="w-full">
                                            <BarChart className="mr-2 h-4 w-4" /> Results
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => handleDelete(assessment.id)}
                                        disabled={!canDelete}
                                        title={canDelete ? "Delete assessment" : "Only the creator can delete"}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                {!isOwn && (
                                    <p className="text-xs text-muted-foreground text-center">
                                        You can view and see results, but only the creator can edit or delete
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}

                {assessments.length === 0 && !loading && (
                    <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        {isPartnerInstructor ? (
                            <>
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">No assessments in your assigned courses</p>
                                <p className="text-sm mt-2">
                                    {partnerCourses.length > 0
                                        ? "Create an assessment or wait for course instructors to create them"
                                        : "You need to be assigned to at least one course to create assessments"}
                                </p>
                            </>
                        ) : (
                            <>
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">No assessments created yet</p>
                                <p className="text-sm mt-2">
                                    Click "Create Assessment" to get started
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}