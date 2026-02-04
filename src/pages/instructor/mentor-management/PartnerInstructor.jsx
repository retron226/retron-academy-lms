import { useState, useEffect } from "react";
import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    writeBatch
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "../../../components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "../../../components/ui/select";
import { useToast } from "../../../contexts/ToastComponent";
import { auth, db } from "../../../lib/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
    Search,
    UserCheck,
    BookOpen,
    Check,
    X,
    Users,
    Building,
    Mail,
    Plus,
    Trash2,
    MoreVertical,
    Loader2,
    FileText,
    CheckSquare,
    Square,
    Phone,
    RefreshCw,
    BarChart,
    CheckCircle
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "../../../components/ui/dropdown-menu";
import { Checkbox } from "../../../components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";

export default function PartnerInstructorManagement() {
    const { userData } = useAuth();
    const { toast } = useToast();

    // States
    const [instructors, setInstructors] = useState([]);
    const [allCourses, setAllCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [assigningCourse, setAssigningCourse] = useState(false);
    const [assigningAssessment, setAssigningAssessment] = useState(false);

    // Dialog states
    const [assignCourseDialogOpen, setAssignCourseDialogOpen] = useState(false);
    const [assignAssessmentDialogOpen, setAssignAssessmentDialogOpen] = useState(false);
    const [selectedInstructor, setSelectedInstructor] = useState(null);
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [availableAssessments, setAvailableAssessments] = useState([]);
    const [selectedAssessments, setSelectedAssessments] = useState([]);
    const [alreadyAssignedAssessments, setAlreadyAssignedAssessments] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch only partner instructors (not regular instructors)
            const instructorsData = await fetchInstructors();
            setInstructors(instructorsData);

            // Fetch all courses
            const coursesData = await fetchAllCourses();
            setAllCourses(coursesData);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({
                title: "Error",
                description: "Failed to load data",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchInstructors = async () => {
        try {
            const usersRef = collection(db, "users");
            // Query only users with partner_instructor role
            const q = query(usersRef, where("role", "==", "partner_instructor"));
            const snapshot = await getDocs(q);

            const instructorsData = [];

            for (const docSnap of snapshot.docs) {
                const instructorData = docSnap.data();

                // Get assigned courses for this instructor
                const assignedCourses = await fetchAssignedCourses(docSnap.id);

                // Get assigned assessments count and list
                const assignedAssessments = await fetchAssignedAssessments(docSnap.id);

                // Get already assigned assessments for students
                const alreadyAssigned = await fetchAlreadyAssignedAssessments(docSnap.id);

                instructorsData.push({
                    id: docSnap.id,
                    ...instructorData,
                    assignedCourses,
                    assignedAssessmentsCount: assignedAssessments.length,
                    assignedAssessmentsList: assignedAssessments,
                    alreadyAssignedAssessmentsList: alreadyAssigned,
                    courseCount: assignedCourses.length
                });
            }

            return instructorsData;
        } catch (error) {
            console.error("Error fetching partner instructors:", error);
            return [];
        }
    };

    const fetchAllCourses = async () => {
        try {
            const coursesRef = collection(db, "courses");
            const snapshot = await getDocs(coursesRef);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error fetching courses:", error);
            return [];
        }
    };

    const fetchAssignedCourses = async (instructorId) => {
        try {
            const mentorCourseAssignmentsRef = collection(db, "mentorCourseAssignments");
            const q = query(
                mentorCourseAssignmentsRef,
                where("mentorId", "==", instructorId),
                where("status", "==", "active")
            );

            const snapshot = await getDocs(q);
            const courseIds = snapshot.docs.map(doc => doc.data().courseId);

            if (courseIds.length === 0) return [];

            // Fetch course details
            const coursesData = [];
            for (let i = 0; i < courseIds.length; i += 10) {
                const batchIds = courseIds.slice(i, i + 10);
                const coursesRef = collection(db, "courses");
                const coursesQ = query(coursesRef, where("__name__", "in", batchIds));
                const coursesSnap = await getDocs(coursesQ);

                coursesSnap.forEach(courseDoc => {
                    const courseData = courseDoc.data();
                    coursesData.push({
                        id: courseDoc.id,
                        ...courseData,
                        modulesCount: courseData.modules?.length || 0
                    });
                });
            }

            return coursesData;
        } catch (error) {
            console.error("Error fetching assigned courses:", error);
            return [];
        }
    };

    const fetchAssignedAssessments = async (instructorId) => {
        try {
            // Get assessments that this instructor has created
            const assessmentsRef = collection(db, "assessments");
            const q = query(
                assessmentsRef,
                where("createdBy", "==", instructorId)
            );

            const snapshot = await getDocs(q);
            const instructorAssessments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            return instructorAssessments;
        } catch (error) {
            console.error("Error fetching instructor assessments:", error);
            return [];
        }
    };

    const fetchAlreadyAssignedAssessments = async (instructorId) => {
        try {
            // Get students assigned to this instructor
            const assignedStudents = await getAssignedStudents(instructorId);
            if (assignedStudents.length === 0) return [];

            // Get all assessmentAccess documents for these students
            const alreadyAssigned = [];

            for (const student of assignedStudents) {
                const assessmentAccessRef = collection(db, "users", student.id, "assessmentAccess");
                const q = query(
                    assessmentAccessRef,
                    where("mentorId", "==", instructorId),
                    where("status", "==", "active")
                );

                const snapshot = await getDocs(q);
                snapshot.forEach(doc => {
                    const accessData = doc.data();
                    // Get assessment details
                    alreadyAssigned.push({
                        accessId: doc.id,
                        ...accessData,
                        studentId: student.id,
                        studentName: student.fullName
                    });
                });
            }

            // Remove duplicates (same assessment assigned to multiple students)
            const uniqueAssessments = [];
            const seenIds = new Set();

            for (const assessment of alreadyAssigned) {
                if (!seenIds.has(assessment.assessmentId)) {
                    seenIds.add(assessment.assessmentId);
                    uniqueAssessments.push(assessment);
                }
            }

            return uniqueAssessments;
        } catch (error) {
            console.error("Error fetching already assigned assessments:", error);
            return [];
        }
    };

    const fetchAssessmentsForInstructor = async (instructorId) => {
        if (!instructorId) {
            setAvailableAssessments([]);
            setAlreadyAssignedAssessments([]);
            return;
        }

        try {
            // Get all assessments created by this instructor
            const assessmentsRef = collection(db, "assessments");
            const q = query(
                assessmentsRef,
                where("createdBy", "==", instructorId)
            );

            const snapshot = await getDocs(q);
            const allAssessments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Get already assigned assessments
            const alreadyAssigned = await fetchAlreadyAssignedAssessments(instructorId);
            const alreadyAssignedIds = alreadyAssigned.map(a => a.assessmentId);

            // Filter out assessments that are already assigned
            const available = allAssessments.filter(assessment =>
                !alreadyAssignedIds.includes(assessment.id)
            );

            const inst = auth.user.uid;

            const q_2 = query(
                assessmentsRef,
                where("createdBy", "==", inst)
            );

            setAvailableAssessments(await getDocs(q_2).then(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
            setAlreadyAssignedAssessments(alreadyAssigned);
            setSelectedAssessments([]); // Reset selected assessments

            console.log('Assessment data for instructor:', {
                instructorId,
                allAssessments: allAssessments.length,
                alreadyAssigned: alreadyAssigned.length,
                available: available.length,
                alreadyAssignedIds,
                availableTitles: available.map(a => a.title)
            });

        } catch (error) {
            console.error("Error fetching assessments:", error);
            toast({
                title: "Error",
                description: "Failed to load assessments",
                variant: "destructive"
            });
        }
    };

    const handleOpenAssignCourseDialog = (instructor) => {
        setSelectedInstructor(instructor);
        setSelectedCourseId("");
        setAssignCourseDialogOpen(true);
    };

    const handleOpenAssignAssessmentDialog = async (instructor) => {
        setSelectedInstructor(instructor);
        setSelectedCourseId("");
        await fetchAssessmentsForInstructor(instructor.id);
        setAssignAssessmentDialogOpen(true);
    };

    const handleAssignCourse = async () => {
        if (!selectedInstructor || !selectedCourseId) {
            toast({
                title: "Error",
                description: "Please select a course",
                variant: "destructive"
            });
            return;
        }

        try {
            setAssigningCourse(true);

            const assignmentId = `${selectedInstructor.id}_${selectedCourseId}`;
            const assignmentRef = doc(db, "mentorCourseAssignments", assignmentId);

            // Check if already assigned
            const existingAssignment = await getDoc(assignmentRef);

            if (existingAssignment.exists()) {
                // Update existing assignment
                await updateDoc(assignmentRef, {
                    status: "active",
                    updatedAt: serverTimestamp(),
                    updatedBy: userData.uid
                });
            } else {
                // Create new assignment
                await setDoc(assignmentRef, {
                    mentorId: selectedInstructor.id,
                    courseId: selectedCourseId,
                    status: "active",
                    assignedBy: userData.uid,
                    assignedAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }

            // Refresh data
            await fetchData();

            toast({
                title: "Success",
                description: `Course assigned to ${selectedInstructor.fullName}`,
                variant: "default"
            });

            setAssignCourseDialogOpen(false);
            setSelectedInstructor(null);
            setSelectedCourseId("");

        } catch (error) {
            console.error("Error assigning course:", error);
            toast({
                title: "Error",
                description: "Failed to assign course",
                variant: "destructive"
            });
        } finally {
            setAssigningCourse(false);
        }
    };

    const handleAssignAssessment = async () => {
        if (!selectedInstructor || selectedAssessments.length === 0) {
            toast({
                title: "Error",
                description: "Please select at least one assessment",
                variant: "destructive"
            });
            return;
        }

        try {
            setAssigningAssessment(true);

            // Get all students assigned to this instructor
            const assignedStudents = await getAssignedStudents(selectedInstructor.id);

            if (assignedStudents.length === 0) {
                toast({
                    title: "No Students",
                    description: "This instructor has no assigned students. Please assign students first.",
                    variant: "destructive"
                });
                return;
            }

            const batch = writeBatch(db);

            // For each selected assessment, grant access to all assigned students
            for (const assessmentId of selectedAssessments) {
                const assessmentDoc = await getDoc(doc(db, "assessments", assessmentId));
                const assessmentData = assessmentDoc.data();

                for (const student of assignedStudents) {
                    const accessId = `${student.id}_${assessmentId}`;
                    const accessRef = doc(db, "users", student.id, "assessmentAccess", accessId);

                    // Check if already has access
                    const existingAccess = await getDoc(accessRef);

                    if (!existingAccess.exists()) {
                        batch.set(accessRef, {
                            assessmentId,
                            studentId: student.id,
                            mentorId: selectedInstructor.id,
                            grantedBy: selectedInstructor.id,
                            grantedByName: selectedInstructor.fullName,
                            assessmentTitle: assessmentData.title,
                            grantedAt: serverTimestamp(),
                            status: "active",
                            createdAt: serverTimestamp()
                        });
                    }
                }
            }

            await batch.commit();

            // Refresh the assessments list
            await fetchAssessmentsForInstructor(selectedInstructor.id);

            toast({
                title: "Success",
                description: `${selectedAssessments.length} assessment(s) assigned to ${assignedStudents.length} student(s)`,
                variant: "default"
            });

            setSelectedAssessments([]);

        } catch (error) {
            console.error("Error assigning assessments:", error);
            toast({
                title: "Error",
                description: "Failed to assign assessments",
                variant: "destructive"
            });
        } finally {
            setAssigningAssessment(false);
        }
    };

    const getAssignedStudents = async (instructorId) => {
        try {
            const mentorAssignmentsRef = collection(db, "mentorAssignments");
            const q = query(
                mentorAssignmentsRef,
                where("mentorId", "==", instructorId),
                where("status", "==", "active")
            );

            const snapshot = await getDocs(q);
            const assignedStudents = [];

            for (const assignmentDoc of snapshot.docs) {
                const assignmentData = assignmentDoc.data();
                const studentId = assignmentData.studentId;

                const studentDoc = await getDoc(doc(db, "users", studentId));
                if (studentDoc.exists()) {
                    const studentData = studentDoc.data();
                    assignedStudents.push({
                        id: studentId,
                        ...studentData,
                        assignmentId: assignmentDoc.id
                    });
                }
            }

            return assignedStudents;
        } catch (error) {
            console.error("Error fetching assigned students:", error);
            return [];
        }
    };

    const handleUnassignCourse = async (instructorId, courseId) => {
        if (!window.confirm("Are you sure? This will also remove access for all students assigned to this mentor for this course.")) {
            return;
        }

        try {
            const batch = writeBatch(db);

            // 1. Deactivate the Mentor-Course Assignment
            const assignmentId = `${instructorId}_${courseId}`;
            const assignmentRef = doc(db, "mentorCourseAssignments", assignmentId);
            batch.update(assignmentRef, {
                status: "inactive",
                unassignedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // 2. Find and deactivate all student enrollments for this mentor/course combo
            const enrollmentsQuery = query(
                collection(db, "enrollments"),
                where("courseId", "==", courseId),
                where("mentorId", "==", instructorId),
                where("status", "==", "active")
            );

            const enrollmentDocs = await getDocs(enrollmentsQuery);
            enrollmentDocs.forEach((enrollmentDoc) => {
                batch.update(enrollmentDoc.ref, {
                    status: "inactive", // or "revoked"
                    unassignedAt: serverTimestamp(),
                    reason: "Mentor unassigned from course"
                });
            });

            await batch.commit();
            await fetchData();

            toast({ title: "Success", description: "Course and student access removed." });
        } catch (error) {
            console.error("Error:", error);
            toast({ title: "Error", variant: "destructive" });
        }
    };
    const handleUnassignAssessment = async (instructorId, assessmentId, assessmentTitle) => {
        if (!window.confirm(`Are you sure you want to remove "${assessmentTitle}" from this instructor?`)) {
            return;
        }

        try {
            // Get all students assigned to this instructor
            const assignedStudents = await getAssignedStudents(instructorId);
            const batch = writeBatch(db);

            // Remove access for all assigned students
            for (const student of assignedStudents) {
                const accessId = `${student.id}_${assessmentId}`;
                const accessRef = doc(db, "users", student.id, "assessmentAccess", accessId);

                // Check if access exists
                const accessDoc = await getDoc(accessRef);
                if (accessDoc.exists()) {
                    batch.delete(accessRef);
                }
            }

            await batch.commit();

            // Refresh data
            await fetchData();
            if (selectedInstructor?.id === instructorId) {
                await fetchAssessmentsForInstructor(instructorId);
            }

            toast({
                title: "Success",
                description: "Assessment access removed from all assigned students",
                variant: "default"
            });

        } catch (error) {
            console.error("Error unassigning assessment:", error);
            toast({
                title: "Error",
                description: "Failed to unassign assessment",
                variant: "destructive"
            });
        }
    };

    const toggleAssessmentSelection = (assessmentId) => {
        setSelectedAssessments(prev => {
            if (prev.includes(assessmentId)) {
                return prev.filter(id => id !== assessmentId);
            } else {
                return [...prev, assessmentId];
            }
        });
    };

    const toggleSelectAllAssessments = () => {
        if (selectedAssessments.length === availableAssessments.length) {
            setSelectedAssessments([]);
        } else {
            setSelectedAssessments(availableAssessments.map(a => a.id));
        }
    };

    // Filter instructors
    const filteredInstructors = instructors.filter(instructor =>
        searchQuery === "" ||
        instructor.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        instructor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        instructor.college?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get courses not yet assigned to selected instructor
    const getAvailableCoursesForInstructor = (instructor) => {
        if (!instructor) return allCourses;

        const assignedCourseIds = instructor.assignedCourses?.map(c => c.id) || [];
        return allCourses.filter(course => !assignedCourseIds.includes(course.id));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 mt-2">Loading partner instructors...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Partner Instructor Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Assign courses and assessments to partner instructors
                    </p>
                </div>
                <Button onClick={fetchData} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search partner instructors by name, email, or college..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Instructors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {filteredInstructors.map(instructor => (
                    <Card key={instructor.id} className="hover:shadow-lg transition-shadow flex flex-col h-full">
                        <CardHeader className="pb-4">
                            <div className="flex justify-between items-start">
                                <div className="min-w-0 flex-1">
                                    <CardTitle className="flex items-center gap-2 truncate">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {instructor.fullName?.[0]?.toUpperCase() || "P"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="truncate">{instructor.fullName}</span>
                                        <Badge variant="outline" className="ml-2 shrink-0">
                                            Partner
                                        </Badge>
                                    </CardTitle>
                                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground truncate">
                                        <Building className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{instructor.college || "No college"}</span>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="shrink-0">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={() => handleOpenAssignCourseDialog(instructor)}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Assign Course
                                        </DropdownMenuItem>
                                        {/* <DropdownMenuItem onClick={() => handleOpenAssignAssessmentDialog(instructor)}>
                                            <FileText className="h-4 w-4 mr-2" />
                                            Assign Assessments
                                        </DropdownMenuItem> */}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-600">
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Remove Instructor
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-4">
                            {/* Contact Info */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm truncate">
                                    <Mail className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{instructor.email}</span>
                                </div>
                                {instructor.phone && (
                                    <div className="flex items-center gap-2 text-sm truncate">
                                        <Phone className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{instructor.phone}</span>
                                    </div>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <FileText className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                                    <p className="text-lg font-bold">{instructor.assignedAssessmentsCount}</p>
                                    <p className="text-xs text-muted-foreground">Created</p>
                                </div>
                                <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <BookOpen className="h-5 w-5 text-green-600 mx-auto mb-1" />
                                    <p className="text-lg font-bold">{instructor.courseCount}</p>
                                    <p className="text-xs text-muted-foreground">Courses</p>
                                </div>
                            </div>

                            {/* Assigned Courses */}
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-semibold">Assigned Courses</h4>
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                        {instructor.assignedCourses?.length || 0}
                                    </span>
                                </div>
                                <div className="h-32 overflow-y-auto border rounded-md">
                                    <div className="space-y-2 pr-4">
                                        {instructor.assignedCourses && instructor.assignedCourses.length > 0 ? (
                                            instructor.assignedCourses.map(course => (
                                                <div key={course.id} className="flex items-center justify-between p-2 bg-muted/30 rounded group">
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <BookOpen className="h-3 w-3 text-primary shrink-0" />
                                                        <span className="text-sm truncate">{course.title}</span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                                        onClick={() => handleUnassignCourse(instructor.id, course.id)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-3 text-sm text-muted-foreground">
                                                No courses assigned
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Created & Assigned Assessments */}
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-semibold">Assessments</h4>
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                        {instructor.assignedAssessmentsCount} created
                                    </span>
                                </div>
                                <div className="h-32 overflow-y-auto border rounded-md">
                                    <div className="space-y-2 pr-4">
                                        {instructor.assignedAssessmentsList && instructor.assignedAssessmentsList.length > 0 ? (
                                            instructor.assignedAssessmentsList.slice(0, 5).map(assessment => {
                                                const isAssigned = instructor.alreadyAssignedAssessmentsList?.some(
                                                    a => a.assessmentId === assessment.id
                                                );

                                                return (
                                                    <div key={assessment.id} className="flex items-center justify-between p-2 bg-muted/30 rounded group">
                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                            <BarChart className="h-3 w-3 text-purple-600 shrink-0" />
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium truncate">{assessment.title}</p>
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {assessment.questions?.length || 0} questions
                                                                    {isAssigned && " • Assigned"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            {isAssigned && (
                                                                <Badge className="bg-green-100 text-green-800 text-xs mr-1">
                                                                    Assigned
                                                                </Badge>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                                                onClick={() => handleUnassignAssessment(instructor.id, assessment.id, assessment.title)}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-center py-3 text-sm text-muted-foreground">
                                                No assessments created
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-2 pt-4 border-t">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => handleOpenAssignCourseDialog(instructor)}
                                >
                                    <Plus className="h-3 w-3" />
                                    Course
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => handleOpenAssignAssessmentDialog(instructor)}
                                >
                                    <FileText className="h-3 w-3" />
                                    Assessments
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Assign Course Dialog */}
            <Dialog open={assignCourseDialogOpen} onOpenChange={setAssignCourseDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign Course to Partner Instructor</DialogTitle>
                        <DialogDescription>
                            Select a course to assign to {selectedInstructor?.fullName}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Partner Instructor</Label>
                            <div className="p-3 border rounded-lg bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {selectedInstructor?.fullName?.[0]?.toUpperCase() || "P"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-semibold truncate">{selectedInstructor?.fullName}</p>
                                        <p className="text-sm text-muted-foreground truncate">{selectedInstructor?.email}</p>
                                        <p className="text-sm text-muted-foreground">{selectedInstructor?.college}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Select Course</Label>
                            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a course" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getAvailableCoursesForInstructor(selectedInstructor).map(course => (
                                        <SelectItem key={course.id} value={course.id}>
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="h-4 w-4 text-primary shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate">{course.title}</p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {course.modulesCount || 0} modules • {course.category || "General"}
                                                    </p>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedCourseId && (
                            <div className="p-3 border rounded-lg bg-green-50">
                                <p className="text-sm font-medium text-green-800">
                                    Course will be assigned to {selectedInstructor?.fullName}
                                </p>
                                <p className="text-sm text-green-700 mt-1">
                                    The partner instructor will be able to create and assign assessments for this course.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setAssignCourseDialogOpen(false)}
                            disabled={assigningCourse}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAssignCourse}
                            disabled={!selectedCourseId || assigningCourse}
                        >
                            {assigningCourse ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Assigning...
                                </>
                            ) : (
                                "Assign Course"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign Assessments Dialog */}
            <Dialog open={assignAssessmentDialogOpen} onOpenChange={setAssignAssessmentDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Assign Assessments to Students</DialogTitle>
                        <DialogDescription>
                            Select assessments created by {selectedInstructor?.fullName} to assign to their students
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label>Partner Instructor</Label>
                            <div className="p-3 border rounded-lg bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {selectedInstructor?.fullName?.[0]?.toUpperCase() || "P"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="font-semibold truncate">{selectedInstructor?.fullName}</p>
                                        <p className="text-sm text-muted-foreground truncate">{selectedInstructor?.email}</p>
                                        <p className="text-sm text-muted-foreground">{selectedInstructor?.college}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Already Assigned Assessments */}
                        {alreadyAssignedAssessments.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-green-700">Already Assigned Assessments ({alreadyAssignedAssessments.length})</Label>
                                <div className="h-40 overflow-y-auto border rounded-md">
                                    <div className="p-2">
                                        {alreadyAssignedAssessments.map(assessment => (
                                            <div
                                                key={assessment.accessId}
                                                className="flex items-center gap-3 p-3 bg-green-50 rounded-lg mb-2"
                                            >
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{assessment.assessmentTitle}</p>
                                                    <p className="text-xs text-green-700 truncate">
                                                        Assigned to students
                                                    </p>
                                                </div>
                                                <Badge className="bg-green-100 text-green-800 text-xs">
                                                    Assigned
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Available Assessments */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>
                                    Available Assessments ({availableAssessments.length})
                                </Label>
                                {availableAssessments.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={toggleSelectAllAssessments}
                                            className="h-8 text-xs"
                                        >
                                            {selectedAssessments.length === availableAssessments.length ? (
                                                <>
                                                    <CheckSquare className="h-3 w-3 mr-1" />
                                                    Deselect All
                                                </>
                                            ) : (
                                                <>
                                                    <Square className="h-3 w-3 mr-1" />
                                                    Select All
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {availableAssessments.length > 0 ? (
                                <div className="h-64 overflow-y-auto border rounded-md">
                                    <div className="p-2">
                                        {availableAssessments.map(assessment => (
                                            <div
                                                key={assessment.id}
                                                className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                                                onClick={() => toggleAssessmentSelection(assessment.id)}
                                            >
                                                <Checkbox
                                                    checked={selectedAssessments.includes(assessment.id)}
                                                    onCheckedChange={() => toggleAssessmentSelection(assessment.id)}
                                                />
                                                <BarChart className="h-8 w-8 text-purple-600" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{assessment.title}</p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {assessment.questions?.length || 0} questions
                                                    </p>
                                                    {assessment.description && (
                                                        <p className="text-xs text-muted-foreground truncate mt-1">
                                                            {assessment.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge variant="outline" className="text-xs capitalize">
                                                    {assessment.difficulty || "Medium"}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                    <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                                    <p className="text-muted-foreground font-medium">
                                        {alreadyAssignedAssessments.length > 0
                                            ? "All assessments are already assigned"
                                            : "No assessments available"}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {alreadyAssignedAssessments.length > 0
                                            ? "This instructor has already assigned all their assessments to students."
                                            : "This instructor hasn't created any assessments yet."}
                                    </p>
                                </div>
                            )}
                        </div>

                        {selectedAssessments.length > 0 && (
                            <div className="p-3 border rounded-lg bg-blue-50">
                                <p className="text-sm font-medium text-blue-800">
                                    {selectedAssessments.length} assessment{selectedAssessments.length !== 1 ? 's' : ''} selected
                                </p>
                                <p className="text-sm text-blue-700 mt-1">
                                    These assessments will be assigned to all students managed by {selectedInstructor?.fullName}.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setAssignAssessmentDialogOpen(false);
                                setSelectedAssessments([]);
                            }}
                            disabled={assigningAssessment}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAssignAssessment}
                            disabled={selectedAssessments.length === 0 || assigningAssessment}
                        >
                            {assigningAssessment ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Assigning...
                                </>
                            ) : (
                                `Assign ${selectedAssessments.length} Assessment${selectedAssessments.length !== 1 ? 's' : ''}`
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {filteredInstructors.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                            No partner instructors found
                        </h3>
                        <p className="text-muted-foreground">
                            {searchQuery ? "Try adjusting your search query" : "Add partner instructors to get started"}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}