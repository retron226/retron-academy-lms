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
    arrayUnion,
    arrayRemove,
    serverTimestamp,
    writeBatch,
    orderBy
} from "firebase/firestore";
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "../../../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Search, Eye, X, GraduationCap, Filter, UserCheck, Ban, CheckCircle, MoreVertical, Loader2, Mail, BookOpen, BarChart3, Clock, AlertCircle, PlusCircle, UserPlus, ChevronDown, ChevronRight, Folder, FileText, Video, CheckSquare, Circle, ArrowLeft, Users, User, Briefcase, Building, Check, UserCog, Info, Plus, Trash2, Edit, Save, XCircle, Type, Link, Download, Upload, Copy, Share2, Settings, BarChart, Calendar, Clock as ClockIcon, Play, ListChecks, File, Image as ImageIcon, Code, Link2, Music, MessageSquare, ExternalLink, Layers, Shield, Tag, Key, Smartphone } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { useToast } from "../../../contexts/ToastComponent";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../../components/ui/collapsible";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { Table } from "../../../components/ui/table";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuGroup,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuCheckboxItem,
    DropdownMenuPortal
} from "../../../components/ui/dropdown-menu";
import { motion } from "framer-motion";

export default function PartnerInstructorStudents() {
    const { userData } = useAuth();
    const { toast } = useToast();

    // Main states
    const [view, setView] = useState('instructors'); // 'instructors' or 'students'
    const [selectedInstructor, setSelectedInstructor] = useState(null);

    // Instructor list state
    const [instructors, setInstructors] = useState([]);
    const [instructorsLoading, setInstructorsLoading] = useState(true);
    const [instructorSearch, setInstructorSearch] = useState("");

    // Students state
    const [students, setStudents] = useState([]);
    const [allCollegeStudents, setAllCollegeStudents] = useState([]); // All students from the college
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentProgress, setStudentProgress] = useState([]);
    const [studentCourses, setStudentCourses] = useState([]);
    const [expandedCourseId, setExpandedCourseId] = useState(null);

    // Course Filtering State
    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState("all");

    // Student Type Filter
    const [studentTypeFilter, setStudentTypeFilter] = useState("all");

    // Statistics
    const [stats, setStats] = useState({
        totalAssigned: 0,
        activeAssigned: 0,
        totalCollegeStudents: 0
    });

    const [isModalLoading, setIsModalLoading] = useState(false);

    // Enrollment dialog state
    const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
    const [selectedStudentForEnrollment, setSelectedStudentForEnrollment] = useState(null);
    const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState("");
    const [availableCoursesForEnrollment, setAvailableCoursesForEnrollment] = useState([]);
    const [enrolling, setEnrolling] = useState(false);

    // Module progress state
    const [moduleProgressDetails, setModuleProgressDetails] = useState({});

    // Assignment dialog state
    const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
    const [assigningStudent, setAssigningStudent] = useState(null);
    const [assigning, setAssigning] = useState(false);
    const [unassigning, setUnassigning] = useState(false);

    // Curriculum Preview State
    const [previewCourse, setPreviewCourse] = useState(null);
    const [previewSections, setPreviewSections] = useState([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [expandedSubSections, setExpandedSubSections] = useState({});

    // Export state
    const [exportFormat, setExportFormat] = useState("csv");
    const [exporting, setExporting] = useState(false);

    // Sort state
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    useEffect(() => {
        if (userData?.uid) {
            if (view === 'instructors') {
                fetchInstructors();
            } else if (view === 'students' && selectedInstructor) {
                fetchStudentData();
            }
        }
    }, [userData, view, selectedInstructor]);

    // Fetch all partner instructors
    const fetchInstructors = async () => {
        try {
            setInstructorsLoading(true);

            const usersRef = collection(db, "users");
            const q = query(
                usersRef,
                where("role", "==", "partner_instructor")
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setInstructors([]);
                return;
            }

            const instructorsData = [];

            for (const instructorDoc of snapshot.docs) {
                const instructorData = instructorDoc.data();

                const mentorAssignmentsRef = collection(db, "mentorAssignments");
                const assignmentsQ = query(
                    mentorAssignmentsRef,
                    where("mentorId", "==", instructorDoc.id),
                    where("status", "==", "active")
                );
                const assignmentsSnap = await getDocs(assignmentsQ);
                const studentCount = assignmentsSnap.size;

                const mentorCourseAssignmentsRef = collection(db, "mentorCourseAssignments");
                const coursesQ = query(
                    mentorCourseAssignmentsRef,
                    where("mentorId", "==", instructorDoc.id),
                    where("status", "==", "active")
                );
                const coursesSnap = await getDocs(coursesQ);
                const courseCount = coursesSnap.size;

                let activeStudentCount = 0;
                for (const assignment of assignmentsSnap.docs) {
                    const studentId = assignment.data().studentId;
                    const enrollmentsRef = collection(db, "users", studentId, "enrollments");
                    const studentEnrollmentsSnap = await getDocs(enrollmentsRef);
                    if (!studentEnrollmentsSnap.empty) {
                        activeStudentCount++;
                    }
                }

                instructorsData.push({
                    id: instructorDoc.id,
                    ...instructorData,
                    studentCount,
                    courseCount,
                    activeStudentCount,
                    assignmentId: assignmentsSnap.docs[0]?.id || null,
                    createdAt: instructorData.createdAt || null
                });
            }

            // Sort instructors
            const sortedInstructors = [...instructorsData].sort((a, b) => {
                if (sortConfig.key === 'name') {
                    const nameA = a.fullName || a.email;
                    const nameB = b.fullName || b.email;
                    return sortConfig.direction === 'asc'
                        ? nameA.localeCompare(nameB)
                        : nameB.localeCompare(nameA);
                }
                if (sortConfig.key === 'students') {
                    return sortConfig.direction === 'asc'
                        ? a.studentCount - b.studentCount
                        : b.studentCount - a.studentCount;
                }
                return 0;
            });

            setInstructors(sortedInstructors);
        } catch (error) {
            console.error("Error fetching instructors:", error);
            toast({
                title: "Error",
                description: "Failed to load instructors",
                variant: "destructive"
            });
        } finally {
            setInstructorsLoading(false);
        }
    };

    // Main fetch function for student data
    const fetchStudentData = async () => {
        if (!selectedInstructor) return;

        try {
            setLoading(true);

            const [assignedCourses, collegeStudents, assignedStudents] = await Promise.all([
                fetchAssignedCourses(selectedInstructor.id),
                fetchAllCollegeStudents(selectedInstructor.college),
                fetchAssignedStudents(selectedInstructor.id)
            ]);

            const allStudents = collegeStudents.map(collegeStudent => {
                const isAssigned = assignedStudents.some(assignedStudent =>
                    assignedStudent.id === collegeStudent.id
                );
                const assignment = assignedStudents.find(s => s.id === collegeStudent.id);

                return {
                    ...collegeStudent,
                    isAssigned,
                    assignedDate: assignment?.assignedDate || null,
                    assignmentId: assignment?.assignmentId || null
                };
            });

            const studentsWithCourses = await Promise.all(
                allStudents.map(async (student) => {
                    const enrolledCourses = await getStudentEnrolledCourses(student.id);
                    const progressMap = {};
                    for (const course of enrolledCourses) {
                        progressMap[course.id] = await getStudentProgress(student.id, course);
                    }

                    return {
                        ...student,
                        enrolledCourses: enrolledCourses || [],
                        enrollmentCount: enrolledCourses?.length || 0,
                        progressMap
                    };
                })
            );

            const assignedCount = assignedStudents.length;
            const activeCount = assignedStudents.filter(s =>
                s.enrolledCourses && s.enrolledCourses.length > 0
            ).length;

            setStats({
                totalAssigned: assignedCount,
                activeAssigned: activeCount,
                totalCollegeStudents: collegeStudents.length
            });

            setCourses(assignedCourses);
            setStudents(studentsWithCourses);
            setAllCollegeStudents(collegeStudents);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({
                title: "Error",
                description: "Failed to load student data",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    // Fetch ALL students from the instructor's college
    const fetchAllCollegeStudents = async (collegeName) => {
        if (!collegeName) {
            console.log("No college name provided for instructor");
            return [];
        }

        try {
            const usersRef = collection(db, "users");
            const q = query(
                usersRef,
                where("role", "==", "student"),
                where("college", "==", collegeName)
            );

            const snapshot = await getDocs(q);
            const studentsData = snapshot.docs.map(studentDoc => ({
                id: studentDoc.id,
                ...studentDoc.data()
            }));

            return studentsData;

        } catch (error) {
            console.error(`Error fetching students from college ${collegeName}:`, error);
            toast({
                title: "Error",
                description: `Failed to load students from ${collegeName}`,
                variant: "destructive"
            });
            return [];
        }
    };

    // Fetch courses assigned to this mentor
    const fetchAssignedCourses = async (mentorId) => {
        try {
            const mentorCourseAssignmentsRef = collection(db, "mentorCourseAssignments");
            const q = query(
                mentorCourseAssignmentsRef,
                where("mentorId", "==", mentorId),
                where("status", "==", "active")
            );

            const assignmentsSnap = await getDocs(q);

            if (assignmentsSnap.empty) {
                return [];
            }

            const courseIds = [];
            assignmentsSnap.forEach(doc => {
                const data = doc.data();
                if (data.courseId) {
                    courseIds.push(data.courseId);
                }
            });

            if (courseIds.length === 0) {
                return [];
            }

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
                        isAssigned: true,
                        totalModules: courseData.modules?.length || 0,
                        totalSections: calculateTotalSections(courseData.modules)
                    });
                });
            }

            return coursesData;

        } catch (error) {
            console.error("Error fetching assigned courses:", error);
            toast({
                title: "Error",
                description: "Failed to load courses",
                variant: "destructive"
            });
            return [];
        }
    };

    // Helper function to calculate total sections in all modules
    const calculateTotalSections = (modules) => {
        if (!modules || !Array.isArray(modules)) return 0;
        return modules.reduce((total, module) => {
            return total + (module.sections?.length || 0);
        }, 0);
    };

    // Fetch students assigned to this mentor
    const fetchAssignedStudents = async (mentorId) => {
        try {
            const mentorAssignmentsRef = collection(db, "mentorAssignments");
            const q = query(
                mentorAssignmentsRef,
                where("mentorId", "==", mentorId),
                where("status", "==", "active")
            );

            const assignmentsSnap = await getDocs(q);

            if (assignmentsSnap.empty) {
                return [];
            }

            const assignedStudentsData = [];

            for (const assignmentDoc of assignmentsSnap.docs) {
                const assignmentData = assignmentDoc.data();
                const studentId = assignmentData.studentId;

                const studentDoc = await getDoc(doc(db, "users", studentId));
                if (studentDoc.exists()) {
                    const studentData = studentDoc.data();
                    assignedStudentsData.push({
                        id: studentId,
                        ...studentData,
                        isAssigned: true,
                        assignedDate: assignmentData.assignedDate || assignmentData.createdAt,
                        assignmentId: assignmentDoc.id
                    });
                }
            }

            return assignedStudentsData;

        } catch (error) {
            console.error("Error fetching assigned students:", error);
            toast({
                title: "Error",
                description: "Failed to load assigned students",
                variant: "destructive"
            });
            return [];
        }
    };

    // Get student's enrolled courses
    const getStudentEnrolledCourses = async (studentId) => {
        try {
            const enrollmentsRef = collection(db, "users", studentId, "enrollments");
            const enrollmentsSnap = await getDocs(enrollmentsRef);

            const courseIds = [];
            enrollmentsSnap.forEach(doc => {
                const data = doc.data();
                if (data.status === "active") {
                    courseIds.push(doc.id);
                }
            });

            // Also check user document for enrolled courses
            const userDoc = await getDoc(doc(db, "users", studentId));
            const userData = userDoc.data();

            if (userData?.enrolledCourses && Array.isArray(userData.enrolledCourses)) {
                // Filter out any non-string values
                const validCourseIds = userData.enrolledCourses.filter(id => typeof id === 'string');
                courseIds.push(...validCourseIds);
            }

            // Remove duplicates
            const uniqueCourseIds = [...new Set(courseIds)];

            const enrolledCourses = await fetchCourseDetails(uniqueCourseIds);
            return enrolledCourses;

        } catch (error) {
            console.error(`Error getting enrolled courses for ${studentId}:`, error);
            return [];
        }
    };

    // Get student progress for a course
    const getStudentProgress = async (studentId, course) => {
        if (!course || !course.id) {
            console.error("Invalid course object:", course);
            return createEmptyProgress({});
        }

        try {
            const progressRef = doc(db, "users", studentId, "courseProgress", course.id);
            const progressSnap = await getDoc(progressRef);

            if (!progressSnap.exists()) {
                return createEmptyProgress(course);
            }

            const progressData = progressSnap.data();
            const completedModules = progressData.completedModules || [];
            const completedSections = progressData.completedSections || [];

            const totalModules = course.modules?.length || 0;
            const totalSections = calculateTotalSections(course.modules);

            const moduleProgressPercentage = totalModules > 0
                ? Math.round((completedModules.length / totalModules) * 100)
                : 0;

            const sectionProgressPercentage = totalSections > 0
                ? Math.round((completedSections.length / totalSections) * 100)
                : 0;

            return {
                ...progressData,
                moduleProgressPercentage,
                sectionProgressPercentage,
                completedModuleCount: completedModules.length,
                completedSectionCount: completedSections.length,
                totalModules,
                totalSections,
                completedModules: completedModules,
                completedSections: completedSections
            };

        } catch (error) {
            console.error(`Error fetching progress for ${studentId} in ${course.id}:`, error);
            return createEmptyProgress(course);
        }
    };

    // Helper to create empty progress object
    const createEmptyProgress = (course) => {
        const totalModules = course.modules?.length || 0;
        const totalSections = calculateTotalSections(course.modules);

        return {
            completedModules: [],
            completedSections: [],
            moduleProgressPercentage: 0,
            sectionProgressPercentage: 0,
            completedModuleCount: 0,
            completedSectionCount: 0,
            totalModules,
            totalSections
        };
    };

    // Helper to fetch course details
    const fetchCourseDetails = async (courseIds) => {
        if (!courseIds || courseIds.length === 0) {
            return [];
        }

        // Filter out any invalid course IDs
        const validCourseIds = courseIds.filter(id => {
            if (!id || typeof id !== 'string') {
                console.warn("Invalid course ID:", id);
                return false;
            }
            return true;
        });

        if (validCourseIds.length === 0) {
            return [];
        }

        const coursesData = [];

        for (let i = 0; i < validCourseIds.length; i += 10) {
            const batchIds = validCourseIds.slice(i, i + 10);

            try {
                const coursesRef = collection(db, "courses");
                const coursesQ = query(coursesRef, where("__name__", "in", batchIds));
                const coursesSnap = await getDocs(coursesQ);

                coursesSnap.forEach(courseDoc => {
                    const courseData = courseDoc.data();
                    coursesData.push({
                        id: courseDoc.id,
                        ...courseData,
                        totalModules: courseData.modules?.length || 0,
                        totalSections: calculateTotalSections(courseData.modules)
                    });
                });
            } catch (error) {
                console.error("Error fetching course batch:", error);
            }
        }

        return coursesData;
    };

    // Function to load detailed module progress for a specific course
    const loadModuleProgressDetails = async (studentId, course) => {
        if (!course || !course.id) {
            console.error("Invalid course object for module progress:", course);
            return;
        }

        try {
            const progressRef = doc(db, "users", studentId, "courseProgress", course.id);
            const progressSnap = await getDoc(progressRef);

            if (!progressSnap.exists()) {
                setModuleProgressDetails(prev => ({
                    ...prev,
                    [`${studentId}-${course.id}`]: {
                        modules: [],
                        hasData: false
                    }
                }));
                return;
            }

            const progressData = progressSnap.data();
            const completedModules = progressData.completedModules || [];
            const completedSections = progressData.completedSections || [];

            const modulesWithProgress = (course.modules || []).map(module => {
                const moduleId = module.id || module.title;
                const isModuleCompleted = completedModules.includes(moduleId);

                const sectionsWithProgress = (module.sections || []).map(section => {
                    const sectionId = section.id || section.title;
                    const isSectionCompleted = completedSections.includes(sectionId);
                    return {
                        ...section,
                        isCompleted: isSectionCompleted,
                        type: section.type || 'content',
                        icon: getSectionIcon(section.type)
                    };
                });

                const completedSectionsCount = sectionsWithProgress.filter(s => s.isCompleted).length;
                const totalSections = sectionsWithProgress.length;
                const sectionProgressPercentage = totalSections > 0
                    ? Math.round((completedSectionsCount / totalSections) * 100)
                    : 0;

                return {
                    ...module,
                    isCompleted: isModuleCompleted,
                    sections: sectionsWithProgress,
                    completedSectionsCount,
                    totalSections,
                    sectionProgressPercentage
                };
            });

            setModuleProgressDetails(prev => ({
                ...prev,
                [`${studentId}-${course.id}`]: {
                    modules: modulesWithProgress,
                    hasData: true
                }
            }));

        } catch (error) {
            console.error("Error loading module progress:", error);
            setModuleProgressDetails(prev => ({
                ...prev,
                [`${studentId}-${course.id}`]: {
                    modules: [],
                    hasData: false,
                    error: true
                }
            }));
        }
    };

    // Helper to get section icon
    const getSectionIcon = (type) => {
        switch (type) {
            case 'video':
                return <Video className="h-3 w-3 text-blue-500" />;
            case 'quiz':
                return <CheckSquare className="h-3 w-3 text-purple-500" />;
            case 'assignment':
                return <FileText className="h-3 w-3 text-green-500" />;
            default:
                return <FileText className="h-3 w-3 text-gray-500" />;
        }
    };

    // Handle assign student to instructor
    const handleAssignStudent = async (student) => {
        try {
            setAssigning(true);
            setAssigningStudent(student);

            const assignmentId = `${student.id}_${selectedInstructor.id}`;
            const assignmentRef = doc(db, "mentorAssignments", assignmentId);

            await setDoc(assignmentRef, {
                studentId: student.id,
                mentorId: selectedInstructor.id,
                status: "active",
                assignedDate: serverTimestamp(),
                assignedBy: userData.uid,
                college: student.college,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            const updatedStudents = students.map(s => {
                if (s.id === student.id) {
                    return {
                        ...s,
                        isAssigned: true,
                        assignedDate: new Date().toISOString(),
                        assignmentId: assignmentId
                    };
                }
                return s;
            });

            setStudents(updatedStudents);

            const assignedCount = updatedStudents.filter(s => s.isAssigned).length;
            setStats(prev => ({
                ...prev,
                totalAssigned: assignedCount
            }));

            toast({
                title: "Success",
                description: `Successfully assigned ${student.fullName || student.email} to ${selectedInstructor.fullName}`,
                variant: "default"
            });
            setAssignmentDialogOpen(false);

        } catch (error) {
            console.error("Error assigning student:", error);
            toast({
                title: "Error",
                description: "Failed to assign student",
                variant: "destructive"
            });
        } finally {
            setAssigning(false);
            setAssigningStudent(null);
        }
    };

    // Handle unassign student from instructor
    const handleUnassignStudent = async (student) => {
        if (!window.confirm(`Are you sure you want to unassign ${student.fullName || student.email} from ${selectedInstructor.fullName}?`)) {
            return;
        }

        try {
            setUnassigning(true);

            const assignmentId = `${student.id}_${selectedInstructor.id}`;
            const assignmentRef = doc(db, "mentorAssignments", assignmentId);

            await updateDoc(assignmentRef, {
                status: "inactive",
                unassignedAt: serverTimestamp(),
                unassignedBy: userData.uid,
                updatedAt: serverTimestamp()
            });

            const updatedStudents = students.map(s => {
                if (s.id === student.id) {
                    return {
                        ...s,
                        isAssigned: false,
                        assignedDate: null,
                        assignmentId: null
                    };
                }
                return s;
            });

            setStudents(updatedStudents);

            const assignedCount = updatedStudents.filter(s => s.isAssigned).length;
            setStats(prev => ({
                ...prev,
                totalAssigned: assignedCount
            }));

            toast({
                title: "Success",
                description: `Successfully unassigned ${student.fullName || student.email} from ${selectedInstructor.fullName}`,
                variant: "default"
            });

        } catch (error) {
            console.error("Error unassigning student:", error);
            toast({
                title: "Error",
                description: "Failed to unassign student",
                variant: "destructive"
            });
        } finally {
            setUnassigning(false);
        }
    };

    // Bulk assign students
    const handleBulkAssign = async (studentIds) => {
        try {
            setAssigning(true);
            const batch = writeBatch(db);

            studentIds.forEach(studentId => {
                const student = students.find(s => s.id === studentId);
                if (student && !student.isAssigned) {
                    const assignmentId = `${studentId}_${selectedInstructor.id}`;
                    const assignmentRef = doc(db, "mentorAssignments", assignmentId);
                    batch.set(assignmentRef, {
                        studentId: studentId,
                        mentorId: selectedInstructor.id,
                        status: "active",
                        assignedDate: serverTimestamp(),
                        assignedBy: userData.uid,
                        college: student.college,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                }
            });

            await batch.commit();

            const updatedStudents = students.map(s => {
                if (studentIds.includes(s.id) && !s.isAssigned) {
                    return {
                        ...s,
                        isAssigned: true,
                        assignedDate: new Date().toISOString(),
                        assignmentId: `${s.id}_${selectedInstructor.id}`
                    };
                }
                return s;
            });

            setStudents(updatedStudents);

            const assignedCount = updatedStudents.filter(s => s.isAssigned).length;
            setStats(prev => ({
                ...prev,
                totalAssigned: assignedCount
            }));

            toast({
                title: "Success",
                description: `Successfully assigned ${studentIds.length} students`,
                variant: "default"
            });
        } catch (error) {
            console.error("Error bulk assigning students:", error);
            toast({
                title: "Error",
                description: "Failed to assign students",
                variant: "destructive"
            });
        } finally {
            setAssigning(false);
        }
    };

    const handleViewStudent = async (student) => {
        setIsModalLoading(true);
        setSelectedStudent(student);

        const enrolled = student.enrolledCourses || [];
        setStudentCourses(enrolled);

        const progressData = await Promise.all(
            enrolled.map(async (course) => {
                const progress = await getStudentProgress(student.id, course);
                return {
                    courseId: course.id,
                    courseTitle: course.title,
                    isAssignedCourse: courses.some(c => c.id === course.id),
                    ...progress,
                    lastAccessed: progress.lastAccessed || null
                };
            })
        );

        setStudentProgress(progressData);
        setIsModalLoading(false);
    };

    // Toggle module details view
    const toggleCourseDetails = async (studentId, course) => {
        const key = `${studentId}-${course.id}`;

        if (expandedCourseId === key) {
            setExpandedCourseId(null);
        } else {
            setExpandedCourseId(key);
            if (!moduleProgressDetails[key]) {
                await loadModuleProgressDetails(studentId, course);
            }
        }
    };

    // Open enrollment dialog
    const handleOpenEnrollmentDialog = (student) => {
        setSelectedStudentForEnrollment(student);

        const studentEnrolledCourseIds = student.enrolledCourses?.map(c => c.id) || [];
        const availableCourses = courses.filter(course =>
            !studentEnrolledCourseIds.includes(course.id)
        );

        setAvailableCoursesForEnrollment(availableCourses);
        setSelectedCourseForEnrollment(availableCourses.length > 0 ? availableCourses[0].id : "");
        setEnrollmentDialogOpen(true);
    };

    // Enroll student in course
    const handleEnrollStudent = async () => {
        if (!selectedCourseForEnrollment || !selectedStudentForEnrollment) {
            toast({
                title: "Error",
                description: "Please select a course",
                variant: "destructive"
            });
            return;
        }

        try {
            setEnrolling(true);

            const studentId = selectedStudentForEnrollment.id;
            const courseId = selectedCourseForEnrollment;

            const courseRef = doc(db, "courses", courseId);
            const courseSnap = await getDoc(courseRef);

            if (!courseSnap.exists()) {
                toast({
                    title: "Error",
                    description: "Course not found",
                    variant: "destructive"
                });
                return;
            }

            const courseData = courseSnap.data();
            const totalModules = courseData.modules?.length || 0;
            const totalSections = calculateTotalSections(courseData.modules);

            const batch = writeBatch(db);

            const userRef = doc(db, "users", studentId);
            batch.update(userRef, {
                enrolledCourses: arrayUnion(courseId),
                lastUpdated: serverTimestamp()
            });

            const enrollmentRef = doc(db, "users", studentId, "enrollments", courseId);
            batch.set(enrollmentRef, {
                enrolledAt: serverTimestamp(),
                enrolledBy: selectedInstructor.id,
                mentorId: selectedInstructor.id,
                status: "active",
                lastAccessed: serverTimestamp()
            });

            const progressRef = doc(db, "users", studentId, "courseProgress", courseId);
            batch.set(progressRef, {
                enrolledAt: serverTimestamp(),
                lastAccessed: serverTimestamp(),
                completedModules: [],
                completedSections: [],
                totalModules,
                totalSections,
                moduleProgressPercentage: 0,
                sectionProgressPercentage: 0,
                completedModuleCount: 0,
                completedSectionCount: 0
            });

            await batch.commit();

            const updatedStudents = students.map(s => {
                if (s.id === studentId) {
                    const newCourse = {
                        id: courseId,
                        ...courseData,
                        totalModules,
                        totalSections
                    };

                    const newProgressMap = {
                        ...s.progressMap,
                        [courseId]: {
                            completedModules: [],
                            completedSections: [],
                            moduleProgressPercentage: 0,
                            sectionProgressPercentage: 0,
                            completedModuleCount: 0,
                            completedSectionCount: 0,
                            totalModules,
                            totalSections
                        }
                    };

                    return {
                        ...s,
                        enrolledCourses: [...(s.enrolledCourses || []), newCourse],
                        enrollmentCount: (s.enrollmentCount || 0) + 1,
                        progressMap: newProgressMap
                    };
                }
                return s;
            });

            setStudents(updatedStudents);

            if (selectedStudent && selectedStudent.id === studentId) {
                setSelectedStudent(prev => ({
                    ...prev,
                    enrolledCourses: [...(prev.enrolledCourses || []), {
                        id: courseId,
                        ...courseData,
                        totalModules,
                        totalSections
                    }],
                    enrollmentCount: (prev.enrollmentCount || 0) + 1
                }));
            }

            const activeCount = updatedStudents.filter(s =>
                s.enrolledCourses && s.enrolledCourses.length > 0 && s.isAssigned
            ).length;

            setStats(prev => ({
                ...prev,
                activeAssigned: activeCount
            }));

            toast({
                title: "Success",
                description: `Successfully enrolled ${selectedStudentForEnrollment.fullName || selectedStudentForEnrollment.email} in the course`,
                variant: "default"
            });
            setEnrollmentDialogOpen(false);
            setSelectedCourseForEnrollment("");
            setSelectedStudentForEnrollment(null);

        } catch (error) {
            console.error("Error enrolling student:", error);
            toast({
                title: "Error",
                description: "Failed to enroll student",
                variant: "destructive"
            });
        } finally {
            setEnrolling(false);
        }
    };

    // Ban/Unban functions
    const handleBan = async (studentId, courseId) => {
        if (!window.confirm("Ban this student from the course? They will lose access to all course materials.")) return;
        try {
            await updateDoc(doc(db, "users", studentId), {
                bannedFrom: arrayUnion(courseId)
            });

            setStudents(students.map(s => {
                if (s.id === studentId) {
                    return {
                        ...s,
                        bannedFrom: [...(s.bannedFrom || []), courseId]
                    };
                }
                return s;
            }));

            if (selectedStudent && selectedStudent.id === studentId) {
                setSelectedStudent(prev => ({
                    ...prev,
                    bannedFrom: [...(prev.bannedFrom || []), courseId]
                }));
            }

            toast({
                title: "Success",
                description: "Student banned from course",
                variant: "default"
            });
        } catch (error) {
            console.error("Error banning student:", error);
            toast({
                title: "Error",
                description: "Failed to ban student",
                variant: "destructive"
            });
        }
    };

    const handleUnban = async (studentId, courseId) => {
        if (!window.confirm("Unban this student? They will regain access to the course.")) return;
        try {
            await updateDoc(doc(db, "users", studentId), {
                bannedFrom: arrayRemove(courseId)
            });

            setStudents(students.map(s => {
                if (s.id === studentId) {
                    return {
                        ...s,
                        bannedFrom: (s.bannedFrom || []).filter(id => id !== courseId)
                    };
                }
                return s;
            }));

            if (selectedStudent && selectedStudent.id === studentId) {
                setSelectedStudent(prev => ({
                    ...prev,
                    bannedFrom: (prev.bannedFrom || []).filter(id => id !== courseId)
                }));
            }

            toast({
                title: "Success",
                description: "Student unbanned from course",
                variant: "default"
            });
        } catch (error) {
            console.error("Error unbanning student:", error);
            toast({
                title: "Error",
                description: "Failed to unban student",
                variant: "destructive"
            });
        }
    };

    // ==================== CURRICULUM PREVIEW FUNCTIONS ====================

    // Load course curriculum for preview
    const handlePreviewCurriculum = async (course) => {
        try {
            setPreviewLoading(true);
            setPreviewCourse(course);

            // Fetch sections for this course
            const sections = await fetchCourseSections(course.id);
            setPreviewSections(sections);

            // Initialize expanded state for sub-sections
            const expandedState = {};
            sections.forEach(section => {
                section.subSections?.forEach(subSection => {
                    if (subSection.id) {
                        expandedState[`${section.id}-${subSection.id}`] = false;
                    }
                });
            });
            setExpandedSubSections(expandedState);

        } catch (error) {
            console.error("Error loading curriculum:", error);
            toast({
                title: "Error",
                description: "Failed to load course curriculum",
                variant: "destructive"
            });
        } finally {
            setPreviewLoading(false);
        }
    };

    // Fetch course sections with subSections and modules
    const fetchCourseSections = async (courseId) => {
        try {
            const sectionsQuery = query(
                collection(db, `courses/${courseId}/sections`),
                orderBy("order", "asc")
            );
            const sectionsSnapshot = await getDocs(sectionsQuery);

            const sections = sectionsSnapshot.docs.map((sectionDoc) => {
                const sectionData = {
                    id: sectionDoc.id,
                    ...sectionDoc.data()
                };

                // Initialize arrays if they don't exist
                sectionData.modules = sectionData.modules || [];
                sectionData.subSections = sectionData.subSections || [];

                // Ensure subSections have proper structure
                if (Array.isArray(sectionData.subSections)) {
                    sectionData.subSections = sectionData.subSections.map((subSection) => ({
                        ...subSection,
                        id: subSection.id || `sub-${Date.now()}-${Math.random()}`,
                        modules: subSection.modules || []
                    }));
                }

                return sectionData;
            });

            return sections;
        } catch (error) {
            console.log(`No sections found for course ${courseId}:`, error);
            return [];
        }
    };

    // Toggle sub-section expansion
    const toggleSubSection = (sectionId, subSectionId) => {
        const key = `${sectionId}-${subSectionId}`;
        setExpandedSubSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Get module icon based on type
    const getModuleIcon = (module) => {
        const type = module.type?.toLowerCase() || 'text';

        switch (type) {
            case 'video':
                return <Video className="h-4 w-4 text-blue-500" />;
            case 'quiz':
                return <CheckSquare className="h-4 w-4 text-purple-500" />;
            case 'assignment':
                return <File className="h-4 w-4 text-green-500" />;
            case 'text':
                return <FileText className="h-4 w-4 text-gray-500" />;
            case 'document':
                return <FileText className="h-4 w-4 text-orange-500" />;
            case 'code':
                return <Code className="h-4 w-4 text-red-500" />;
            case 'image':
                return <ImageIcon className="h-4 w-4 text-pink-500" />;
            case 'audio':
                return <Music className="h-4 w-4 text-yellow-500" />;
            case 'link':
                return <ExternalLink className="h-4 w-4 text-indigo-500" />;
            case 'discussion':
                return <MessageSquare className="h-4 w-4 text-teal-500" />;
            default:
                return <FileText className="h-4 w-4 text-gray-500" />;
        }
    };

    // Get module type badge
    const getModuleTypeBadge = (type) => {
        const typeMap = {
            'video': { label: 'Video', color: 'bg-blue-100 text-blue-800' },
            'quiz': { label: 'Quiz', color: 'bg-purple-100 text-purple-800' },
            'assignment': { label: 'Assignment', color: 'bg-orange-100 text-orange-800' },
            'text': { label: 'Text', color: 'bg-gray-100 text-gray-800' },
            'document': { label: 'Document', color: 'bg-green-100 text-green-800' },
            'code': { label: 'Code', color: 'bg-red-100 text-red-800' },
            'image': { label: 'Image', color: 'bg-pink-100 text-pink-800' },
            'audio': { label: 'Audio', color: 'bg-yellow-100 text-yellow-800' },
            'link': { label: 'Link', color: 'bg-indigo-100 text-indigo-800' },
            'discussion': { label: 'Discussion', color: 'bg-teal-100 text-teal-800' },
            'file': { label: 'File', color: 'bg-amber-100 text-amber-800' }
        };

        const typeInfo = typeMap[type?.toLowerCase()] || { label: type || 'Content', color: 'bg-gray-100 text-gray-800' };
        return <Badge className={`text-xs ${typeInfo.color}`}>{typeInfo.label}</Badge>;
    };

    // Export data
    const handleExportData = async (format) => {
        try {
            setExporting(true);

            let data = [];
            if (view === 'instructors') {
                data = filteredInstructors.map(instructor => ({
                    Name: instructor.fullName || 'N/A',
                    Email: instructor.email,
                    College: instructor.college || 'N/A',
                    'Assigned Students': instructor.studentCount,
                    'Active Students': instructor.activeStudentCount,
                    'Assigned Courses': instructor.courseCount,
                    'Created Date': instructor.createdAt ? new Date(instructor.createdAt).toLocaleDateString() : 'N/A'
                }));
            } else {
                data = filteredStudents.map(student => ({
                    Name: student.fullName || 'N/A',
                    Email: student.email,
                    College: student.college || 'N/A',
                    'Assigned Status': student.isAssigned ? 'Yes' : 'No',
                    'Assigned Date': student.assignedDate ? new Date(student.assignedDate).toLocaleDateString() : 'N/A',
                    'Enrolled Courses': student.enrollmentCount || 0,
                    'Active Courses': student.enrolledCourses?.filter(c =>
                        student.progressMap?.[c.id]?.moduleProgressPercentage > 0
                    ).length || 0
                }));
            }

            if (format === 'csv') {
                const headers = Object.keys(data[0] || {});
                const csvRows = [
                    headers.join(','),
                    ...data.map(row =>
                        headers.map(header =>
                            `"${String(row[header] || '').replace(/"/g, '""')}"`
                        ).join(',')
                    )
                ];

                const csvContent = csvRows.join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${view === 'instructors' ? 'instructors' : 'students'}_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
            }

            toast({
                title: "Success",
                description: `Data exported successfully as ${format.toUpperCase()}`,
                variant: "default"
            });
        } catch (error) {
            console.error("Error exporting data:", error);
            toast({
                title: "Error",
                description: "Failed to export data",
                variant: "destructive"
            });
        } finally {
            setExporting(false);
        }
    };

    // Handle sort
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Filter instructors
    const filteredInstructors = instructors.filter(instructor => {
        const matchesSearch = instructorSearch === "" ||
            instructor.email?.toLowerCase().includes(instructorSearch.toLowerCase()) ||
            instructor.fullName?.toLowerCase().includes(instructorSearch.toLowerCase());
        return matchesSearch;
    });

    // Filter students
    const filteredStudents = students.filter(student => {
        const matchesSearch = searchQuery === "" ||
            student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.fullName?.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesCourse = true;
        if (selectedCourseId !== "all") {
            matchesCourse = student.enrolledCourses?.some(
                course => course.id === selectedCourseId
            ) || false;
        }

        let matchesType = true;
        if (studentTypeFilter === "assigned") {
            matchesType = student.isAssigned === true;
        } else if (studentTypeFilter === "unassigned") {
            matchesType = student.isAssigned === false;
        }

        return matchesSearch && matchesCourse && matchesType;
    });

    // Get available course options for filter
    const availableCourses = courses.filter(course =>
        students.some(student =>
            student.enrolledCourses?.some(ec => ec.id === course.id)
        )
    );

    // Refresh button
    const handleRefresh = () => {
        if (view === 'instructors') {
            fetchInstructors();
        } else {
            fetchStudentData();
        }
    };

    // Handle back to instructors
    const handleBackToInstructors = () => {
        setView('instructors');
        setSelectedInstructor(null);
        setStudents([]);
        setAllCollegeStudents([]);
        setCourses([]);
        setStats({ totalAssigned: 0, activeAssigned: 0, totalCollegeStudents: 0 });
        setPreviewCourse(null);
        setPreviewSections([]);
        setExpandedSubSections({});
    };

    // Handle view instructor students
    const handleViewInstructorStudents = (instructor) => {
        setSelectedInstructor(instructor);
        setView('students');
        setPreviewCourse(null);
        setPreviewSections([]);
        setExpandedSubSections({});
    };

    // Render loading state
    if (view === 'instructors' && instructorsLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span className="ml-2 mt-2">Loading instructors...</span>
            </div>
        );
    }

    if (view === 'students' && loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span className="ml-2 mt-2">Loading students...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    {view === 'students' && selectedInstructor ? (
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBackToInstructors}
                                className="gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Instructors
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">
                                    {selectedInstructor.fullName}'s Students
                                </h1>
                                <p className="text-muted-foreground mt-2">
                                    Manage students from {selectedInstructor.college} college
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                Partner Instructors
                            </h1>
                            <p className="text-muted-foreground mt-2">
                                View and manage partner instructors and their students
                            </p>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Settings className="h-4 w-4" />
                                Options
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleRefresh}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh Data
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Download className="h-4 w-4 mr-2" />
                                    Export Data
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => handleExportData('csv')}>
                                        Export as CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExportData('excel')} disabled>
                                        Export as Excel
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExportData('pdf')} disabled>
                                        Export as PDF
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            {view === 'students' && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => {
                                        const unassignedStudents = filteredStudents
                                            .filter(s => !s.isAssigned)
                                            .map(s => s.id);
                                        if (unassignedStudents.length > 0) {
                                            handleBulkAssign(unassignedStudents);
                                        }
                                    }}>
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Bulk Assign Unassigned
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* INSTRUCTORS VIEW */}
            {view === 'instructors' && (
                <>
                    {/* Filters Row */}
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search Bar */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by email or name..."
                                value={instructorSearch}
                                onChange={(e) => setInstructorSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>

                        {/* Sort Dropdown */}
                        <div className="w-full md:w-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full md:w-auto gap-2">
                                        <Filter className="h-4 w-4" />
                                        Sort
                                        <ChevronDown className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioGroup value={sortConfig.key} onValueChange={handleSort}>
                                        <DropdownMenuRadioItem value="name">
                                            Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="students">
                                            Student Count {sortConfig.key === 'students' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="college">
                                            College {sortConfig.key === 'college' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Instructors</p>
                                        <p className="text-2xl font-bold">{instructors.length}</p>
                                    </div>
                                    <User className="h-8 w-8 text-primary" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Active Instructors</p>
                                        <p className="text-2xl font-bold">
                                            {instructors.filter(i => i.studentCount > 0).length}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            With assigned students
                                        </p>
                                    </div>
                                    <UserCheck className="h-8 w-8 text-blue-600" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                                        <p className="text-2xl font-bold">
                                            {instructors.reduce((sum, i) => sum + i.studentCount, 0)}
                                        </p>
                                    </div>
                                    <GraduationCap className="h-8 w-8 text-green-600" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                                        <p className="text-2xl font-bold">
                                            {instructors.reduce((sum, i) => sum + i.courseCount, 0)}
                                        </p>
                                    </div>
                                    <BookOpen className="h-8 w-8 text-purple-600" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Instructors Table */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Partner Instructors ({filteredInstructors.length})</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        Click on an instructor to view all students from their college
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="gap-1">
                                        <Filter className="h-3 w-3" />
                                        Sorted by: {sortConfig.key} {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredInstructors.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <Search className="h-8 w-8 opacity-50" />
                                        <p>{instructorSearch ? "No instructors match your search" : "No partner instructors found"}</p>
                                        {!instructorSearch && (
                                            <p className="text-sm">Partner instructors will appear here once they are added to the system</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Instructor</TableHead>
                                            <TableHead>Contact</TableHead>
                                            <TableHead>College</TableHead>
                                            <TableHead>Assigned Students</TableHead>
                                            <TableHead>Active Students</TableHead>
                                            <TableHead>Assigned Courses</TableHead>
                                            <TableHead className="w-[100px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredInstructors.map((instructor) => (
                                            <TableRow
                                                key={instructor.id}
                                                className="hover:bg-muted/50 cursor-pointer"
                                                onClick={() => handleViewInstructorStudents(instructor)}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                            {instructor.fullName?.[0] || instructor.email?.[0]?.toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium">{instructor.fullName || "N/A"}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                Partner Instructor
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Mail className="h-3 w-3" />
                                                            {instructor.email}
                                                        </div>
                                                        {instructor.phone && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {instructor.phone}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Building className="h-4 w-4 text-muted-foreground" />
                                                        <span>{instructor.college || "N/A"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-4 w-4 text-blue-600" />
                                                        <span className="font-medium">{instructor.studentCount}</span>
                                                        <span className="text-sm text-muted-foreground">students</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <UserCheck className="h-4 w-4 text-green-600" />
                                                        <span className="font-medium text-green-700">{instructor.activeStudentCount}</span>
                                                        <span className="text-sm text-muted-foreground">active</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen className="h-4 w-4 text-purple-600" />
                                                        <span className="font-medium">{instructor.courseCount}</span>
                                                        <span className="text-sm text-muted-foreground">courses</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewInstructorStudents(instructor);
                                                        }}
                                                        title="View Students"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* STUDENTS VIEW */}
            {view === 'students' && selectedInstructor && (
                <>
                    {/* Instructor Info Card */}
                    <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
                                        {selectedInstructor.fullName?.[0] || selectedInstructor.email?.[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            {selectedInstructor.fullName}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-2">
                                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                                <Mail className="h-4 w-4" />
                                                {selectedInstructor.email}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                                <Building className="h-4 w-4" />
                                                {selectedInstructor.college || "No college"}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                                <Briefcase className="h-4 w-4" />
                                                Partner Instructor
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-700">{stats.totalCollegeStudents}</div>
                                        <div className="text-sm text-gray-600">Total Students in {selectedInstructor.college}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-700">{stats.totalAssigned}</div>
                                        <div className="text-sm text-gray-600">Assigned</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-purple-700">{stats.activeAssigned}</div>
                                        <div className="text-sm text-gray-600">Active</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-orange-700">{courses.length}</div>
                                        <div className="text-sm text-gray-600">Courses</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Info Banner */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-blue-800">College-Based Student Management</h4>
                                <p className="text-sm text-blue-700 mt-1">
                                    This page shows <strong>ALL students from {selectedInstructor.college} college</strong>.
                                    You can assign/unassign students to this instructor and manage their course enrollments.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Curriculum Preview Modal */}
                    {previewCourse && (
                        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                            <div className="bg-background rounded-lg shadow-lg w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
                                {/* Header */}
                                <div className="border-b px-6 py-4 flex items-start justify-between">
                                    <div className="flex items-start gap-4 flex-1">
                                        {previewCourse.thumbnailUrl && (
                                            <img
                                                src={previewCourse.thumbnailUrl}
                                                alt={previewCourse.title}
                                                className="w-24 h-24 object-cover rounded-lg"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h2 className="text-2xl font-bold">{previewCourse.title}</h2>
                                                    <p className="text-muted-foreground mt-1">{previewCourse.description}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {previewCourse.accessCode && (
                                                        <Badge className="font-mono">{previewCourse.accessCode}</Badge>
                                                    )}
                                                    <Badge variant="secondary">{previewCourse.category || "General"}</Badge>
                                                    <Badge variant="outline" className="gap-1">
                                                        <Eye className="h-3 w-3" />
                                                        Preview Mode
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-3 text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Layers className="h-3 w-3" />
                                                    <span>{previewSections.length || 0} sections</span>
                                                </div>
                                                {previewCourse.totalModules > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <BookOpen className="h-3 w-3" />
                                                        <span>{previewCourse.totalModules} modules</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => {
                                        setPreviewCourse(null);
                                        setPreviewSections([]);
                                        setExpandedSubSections({});
                                    }} className="ml-2">
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-auto p-6">
                                    {previewLoading ? (
                                        <div className="flex flex-col items-center justify-center py-12">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                                            <p className="text-muted-foreground">Loading curriculum...</p>
                                        </div>
                                    ) : previewSections.length === 0 ? (
                                        <Card>
                                            <CardContent className="py-12 text-center">
                                                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                                <p className="text-muted-foreground">No curriculum available for this course</p>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <div className="space-y-6">
                                            {previewSections.map((section, sectionIndex) => (
                                                <Card key={section.id || sectionIndex}>
                                                    <CardHeader>
                                                        <CardTitle>
                                                            <div className="flex items-center gap-2">
                                                                <Layers className="h-5 w-5" />
                                                                <span>
                                                                    Section {section.order || sectionIndex + 1}: {section.title || "Untitled Section"}
                                                                </span>
                                                            </div>
                                                        </CardTitle>
                                                        {section.description && (
                                                            <CardDescription>{section.description}</CardDescription>
                                                        )}
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        {/* Section-Level Modules */}
                                                        {section.modules && section.modules.length > 0 && (
                                                            <div className="space-y-3">
                                                                <h4 className="text-sm font-medium text-muted-foreground">
                                                                    Section-Level Modules ({section.modules.length})
                                                                </h4>
                                                                <div className="space-y-2">
                                                                    {section.modules.map((module, moduleIndex) => (
                                                                        <div key={module.id || moduleIndex} className="p-3 border rounded-lg">
                                                                            <div className="flex items-start justify-between">
                                                                                <div className="flex-1">
                                                                                    <div className="flex items-center gap-2 mb-2">
                                                                                        {getModuleIcon(module)}
                                                                                        <span className="font-medium">{module.title || `Module ${moduleIndex + 1}`}</span>
                                                                                    </div>
                                                                                    {module.description && (
                                                                                        <p className="text-sm text-muted-foreground mb-2">
                                                                                            {module.description}
                                                                                        </p>
                                                                                    )}
                                                                                    {module.content && (
                                                                                        <div className="prose prose-sm max-w-none bg-muted/20 p-2 rounded text-sm">
                                                                                            <div dangerouslySetInnerHTML={{
                                                                                                __html: module.content.substring(0, 500) +
                                                                                                    (module.content.length > 500 ? "..." : "")
                                                                                            }} />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="ml-2 flex flex-col items-end gap-1">
                                                                                    {module.type && getModuleTypeBadge(module.type)}
                                                                                    {module.duration && (
                                                                                        <Badge variant="outline" className="text-xs">
                                                                                            <Clock className="h-2 w-2 mr-1" />
                                                                                            {module.duration}
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Sub-Sections */}
                                                        {section.subSections && section.subSections.length > 0 && (
                                                            <div className="space-y-4">
                                                                <h4 className="text-sm font-medium text-muted-foreground">
                                                                    Sub-Sections ({section.subSections.length})
                                                                </h4>
                                                                <div className="space-y-3">
                                                                    {section.subSections.map((subSection, subIndex) => {
                                                                        const subSectionKey = `${section.id}-${subSection.id}`;
                                                                        const isExpanded = expandedSubSections[subSectionKey];
                                                                        const moduleCount = subSection.modules?.length || 0;

                                                                        return (
                                                                            <Collapsible
                                                                                key={subSection.id || subIndex}
                                                                                open={isExpanded}
                                                                                onOpenChange={() => toggleSubSection(section.id, subSection.id)}
                                                                            >
                                                                                <div className="border rounded-lg">
                                                                                    <CollapsibleTrigger className="w-full p-3 text-left hover:bg-muted/20">
                                                                                        <div className="flex items-center justify-between">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                                                                <div>
                                                                                                    <h5 className="font-medium">
                                                                                                        {subSection.title || `Sub-Section ${subIndex + 1}`}
                                                                                                    </h5>
                                                                                                    {subSection.description && (
                                                                                                        <p className="text-sm text-muted-foreground">
                                                                                                            {subSection.description}
                                                                                                        </p>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-2">
                                                                                                {moduleCount > 0 && (
                                                                                                    <Badge variant="outline" className="text-xs">
                                                                                                        {moduleCount} module{moduleCount !== 1 ? 's' : ''}
                                                                                                    </Badge>
                                                                                                )}
                                                                                                {subSection.duration && (
                                                                                                    <Badge variant="secondary" className="text-xs">
                                                                                                        <Clock className="h-2 w-2 mr-1" />
                                                                                                        {subSection.duration}
                                                                                                    </Badge>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </CollapsibleTrigger>

                                                                                    <CollapsibleContent>
                                                                                        <div className="p-4 pt-0 border-t">
                                                                                            {/* Sub-Section Content */}
                                                                                            {subSection.content && (
                                                                                                <div className="mb-4 p-3 bg-muted/30 rounded">
                                                                                                    <h6 className="text-sm font-medium mb-2">Content</h6>
                                                                                                    <div className="prose prose-sm max-w-none">
                                                                                                        <div dangerouslySetInnerHTML={{ __html: subSection.content }} />
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Sub-Section Modules */}
                                                                                            {subSection.modules && subSection.modules.length > 0 ? (
                                                                                                <div className="space-y-3">
                                                                                                    <h6 className="text-sm font-medium text-muted-foreground">
                                                                                                        Modules ({moduleCount})
                                                                                                    </h6>
                                                                                                    <div className="space-y-2">
                                                                                                        {subSection.modules.map((module, moduleIndex) => (
                                                                                                            <div key={module.id || moduleIndex} className="p-3 border rounded bg-card">
                                                                                                                <div className="flex items-start justify-between">
                                                                                                                    <div className="flex-1">
                                                                                                                        <div className="flex items-center gap-2 mb-2">
                                                                                                                            {getModuleIcon(module)}
                                                                                                                            <span className="font-medium text-sm">
                                                                                                                                {module.title || `Module ${moduleIndex + 1}`}
                                                                                                                            </span>
                                                                                                                        </div>
                                                                                                                        {module.description && (
                                                                                                                            <p className="text-xs text-muted-foreground mb-2">
                                                                                                                                {module.description}
                                                                                                                            </p>
                                                                                                                        )}
                                                                                                                        {module.content && (
                                                                                                                            <div className="prose prose-xs max-w-none bg-muted/20 p-2 rounded text-xs">
                                                                                                                                <div dangerouslySetInnerHTML={{
                                                                                                                                    __html: module.content.substring(0, 300) +
                                                                                                                                        (module.content.length > 300 ? "..." : "")
                                                                                                                                }} />
                                                                                                                            </div>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                    <div className="ml-2 flex flex-col items-end gap-1">
                                                                                                                        {module.type && getModuleTypeBadge(module.type)}
                                                                                                                        {module.duration && (
                                                                                                                            <Badge variant="outline" className="text-xs">
                                                                                                                                <Clock className="h-2 w-2 mr-1" />
                                                                                                                                {module.duration}
                                                                                                                            </Badge>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="text-center py-6 text-muted-foreground">
                                                                                                    <FileText className="h-8 w-8 mx-auto mb-2" />
                                                                                                    <p className="text-sm">No modules in this sub-section</p>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </CollapsibleContent>
                                                                                </div>
                                                                            </Collapsible>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* No Content Message */}
                                                        {(!section.modules || section.modules.length === 0) &&
                                                            (!section.subSections || section.subSections.length === 0) && (
                                                                <div className="text-center py-8 text-muted-foreground">
                                                                    <FileText className="h-8 w-8 mx-auto mb-2" />
                                                                    <p className="text-sm">No content in this section</p>
                                                                </div>
                                                            )}
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="border-t px-6 py-4 flex justify-end">
                                    <Button onClick={() => {
                                        setPreviewCourse(null);
                                        setPreviewSections([]);
                                        setExpandedSubSections({});
                                    }}>
                                        Close Preview
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

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

                        {/* Student Type Filter */}
                        <div className="w-full md:w-auto">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <select
                                    className="px-3 py-2 rounded-md border border-input bg-background text-sm w-full md:w-48"
                                    value={studentTypeFilter}
                                    onChange={(e) => setStudentTypeFilter(e.target.value)}
                                >
                                    <option value="all">All Students</option>
                                    <option value="assigned">Assigned to Instructor</option>
                                    <option value="unassigned">Not Assigned</option>
                                </select>
                            </div>
                        </div>

                        {/* Course Filter Dropdown */}
                        {availableCourses.length > 0 && (
                            <div className="w-full md:w-64">
                                <select
                                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                                    value={selectedCourseId}
                                    onChange={(e) => setSelectedCourseId(e.target.value)}
                                >
                                    <option value="all">All Courses</option>
                                    {availableCourses.map(course => (
                                        <option key={course.id} value={course.id}>
                                            {course.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Students Table */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Students ({filteredStudents.length})</CardTitle>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-normal">
                                        <span>
                                            {studentTypeFilter === "all" && `All students from ${selectedInstructor.college} college`}
                                            {studentTypeFilter === "assigned" && "Students assigned to this instructor"}
                                            {studentTypeFilter === "unassigned" && "Students not assigned to this instructor"}
                                        </span>
                                        {selectedCourseId !== "all" && (
                                            <span className="text-primary">
                                                • Filtered by course
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Dialog open={enrollmentDialogOpen} onOpenChange={setEnrollmentDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="gap-2">
                                                <UserPlus className="h-4 w-4" />
                                                Enroll Student
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Enroll Student in Course</DialogTitle>
                                                <DialogDescription>
                                                    Select a student and course to enroll them.
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Student</label>
                                                    <Select
                                                        onValueChange={(value) => {
                                                            const student = students.find(s => s.id === value);
                                                            setSelectedStudentForEnrollment(student);
                                                            if (student) {
                                                                const studentEnrolledCourseIds = student.enrolledCourses?.map(c => c.id) || [];
                                                                const available = courses.filter(c => !studentEnrolledCourseIds.includes(c.id));
                                                                setAvailableCoursesForEnrollment(available);
                                                                setSelectedCourseForEnrollment(available.length > 0 ? available[0].id : "");
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a student" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {students.filter(s => s.isAssigned).map(student => (
                                                                <SelectItem key={student.id} value={student.id}>
                                                                    {student.fullName || student.email}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <p className="text-xs text-muted-foreground">
                                                        Only assigned students can be enrolled in courses
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Course</label>
                                                    <Select
                                                        value={selectedCourseForEnrollment}
                                                        onValueChange={setSelectedCourseForEnrollment}
                                                        disabled={!selectedStudentForEnrollment || availableCoursesForEnrollment.length === 0}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a course" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableCoursesForEnrollment.map(course => (
                                                                <SelectItem key={course.id} value={course.id}>
                                                                    {course.title}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {selectedStudentForEnrollment && availableCoursesForEnrollment.length === 0 && (
                                                        <p className="text-sm text-muted-foreground">
                                                            This student is already enrolled in all available courses.
                                                        </p>
                                                    )}
                                                </div>

                                                {selectedStudentForEnrollment && selectedCourseForEnrollment && (
                                                    <div className="p-4 bg-muted/50 rounded-lg">
                                                        <p className="text-sm font-medium">Enrollment Summary:</p>
                                                        <p className="text-sm">
                                                            <span className="font-medium">Student:</span> {selectedStudentForEnrollment.fullName || selectedStudentForEnrollment.email}
                                                        </p>
                                                        <p className="text-sm">
                                                            <span className="font-medium">Course:</span> {availableCoursesForEnrollment.find(c => c.id === selectedCourseForEnrollment)?.title}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <DialogFooter>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setEnrollmentDialogOpen(false)}
                                                    disabled={enrolling}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={handleEnrollStudent}
                                                    disabled={!selectedStudentForEnrollment || !selectedCourseForEnrollment || enrolling}
                                                >
                                                    {enrolling ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Enrolling...
                                                        </>
                                                    ) : (
                                                        "Enroll Student"
                                                    )}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredStudents.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <Search className="h-8 w-8 opacity-50" />
                                        <p>{searchQuery || studentTypeFilter !== "all" || selectedCourseId !== "all"
                                            ? "No students match your filters"
                                            : `No students found in ${selectedInstructor.college} college`}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Assignment</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>College</TableHead>
                                            <TableHead>Course Progress</TableHead>
                                            <TableHead className="w-[150px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStudents.map((student) => {
                                            const studentMyCourses = courses.filter(c =>
                                                student.enrolledCourses?.some(ec => ec.id === c.id)
                                            );
                                            const displayCourses = selectedCourseId === "all"
                                                ? studentMyCourses
                                                : studentMyCourses.filter(c => c.id === selectedCourseId);

                                            return (
                                                <TableRow key={student.id} className="hover:bg-muted/50">
                                                    <TableCell>
                                                        {student.isAssigned ? (
                                                            <div className="space-y-1">
                                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                                                                    <Check className="h-3 w-3 mr-1" />
                                                                    Assigned
                                                                </Badge>
                                                                {student.assignedDate && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {new Date(student.assignedDate).toLocaleDateString()}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <Badge variant="outline" className="text-gray-600 border-gray-300">
                                                                Not Assigned
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {student.fullName || "N/A"}
                                                    </TableCell>
                                                    <TableCell>{student.email}</TableCell>
                                                    <TableCell>{student.college || "N/A"}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-3">
                                                            {displayCourses.length > 0 ? (
                                                                displayCourses.map(course => {
                                                                    const isBanned = student.bannedFrom?.includes(course.id);
                                                                    const progress = student.progressMap?.[course.id] || {};
                                                                    const moduleProgressPercentage = progress.moduleProgressPercentage || 0;
                                                                    const sectionProgressPercentage = progress.sectionProgressPercentage || 0;
                                                                    const completedModuleCount = progress.completedModuleCount || 0;
                                                                    const completedSectionCount = progress.completedSectionCount || 0;
                                                                    const totalModules = progress.totalModules || course.totalModules || 0;
                                                                    const totalSections = progress.totalSections || course.totalSections || 0;
                                                                    const detailKey = `${student.id}-${course.id}`;
                                                                    const isExpanded = expandedCourseId === detailKey;
                                                                    const hasDetails = moduleProgressDetails[detailKey];

                                                                    return (
                                                                        <div key={course.id} className="space-y-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex items-center justify-between mb-1">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                className="h-5 w-5 p-0"
                                                                                                onClick={() => toggleCourseDetails(student.id, course)}
                                                                                            >
                                                                                                {isExpanded ?
                                                                                                    <ChevronDown className="h-3 w-3" /> :
                                                                                                    <ChevronRight className="h-3 w-3" />
                                                                                                }
                                                                                            </Button>
                                                                                            <span className={`text-sm font-medium truncate ${isBanned ? 'line-through text-destructive' : ''}`}>
                                                                                                {course.title}
                                                                                                {isBanned && (
                                                                                                    <Ban className="h-3 w-3 inline ml-1" />
                                                                                                )}
                                                                                            </span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="text-xs text-muted-foreground">
                                                                                                <span className="font-semibold text-primary">{moduleProgressPercentage}%</span> modules
                                                                                            </div>
                                                                                            <div className="text-xs text-muted-foreground">
                                                                                                <span className="font-semibold text-green-600">{sectionProgressPercentage}%</span> sections
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        {/* Module Progress Bar */}
                                                                                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                                                                            <div
                                                                                                className={`h-full rounded-full ${isBanned ? 'bg-destructive' : 'bg-primary'}`}
                                                                                                style={{ width: `${moduleProgressPercentage}%` }}
                                                                                            />
                                                                                        </div>
                                                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                                            {completedModuleCount}/{totalModules} modules
                                                                                        </span>
                                                                                        <DropdownMenu>
                                                                                            <DropdownMenuTrigger asChild>
                                                                                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                                                                                    <MoreVertical className="h-3 w-3" />
                                                                                                </Button>
                                                                                            </DropdownMenuTrigger>
                                                                                            <DropdownMenuContent align="end" className="w-48">
                                                                                                <DropdownMenuLabel>{course.title}</DropdownMenuLabel>
                                                                                                <DropdownMenuSeparator />
                                                                                                <DropdownMenuItem
                                                                                                    onClick={() => isBanned ? handleUnban(student.id, course.id) : handleBan(student.id, course.id)}
                                                                                                    className={isBanned ? "text-green-600" : "text-destructive"}
                                                                                                >
                                                                                                    {isBanned ? (
                                                                                                        <>
                                                                                                            <CheckCircle className="h-4 w-4 mr-2" />
                                                                                                            Unban Student
                                                                                                        </>
                                                                                                    ) : (
                                                                                                        <>
                                                                                                            <Ban className="h-4 w-4 mr-2" />
                                                                                                            Ban Student
                                                                                                        </>
                                                                                                    )}
                                                                                                </DropdownMenuItem>
                                                                                                <DropdownMenuItem onClick={() => handleViewStudent(student)}>
                                                                                                    <Eye className="h-4 w-4 mr-2" />
                                                                                                    View Details
                                                                                                </DropdownMenuItem>
                                                                                                <DropdownMenuItem onClick={() => handleOpenEnrollmentDialog(student)} disabled={!student.isAssigned}>
                                                                                                    <PlusCircle className="h-4 w-4 mr-2" />
                                                                                                    Enroll in Another Course
                                                                                                </DropdownMenuItem>
                                                                                            </DropdownMenuContent>
                                                                                        </DropdownMenu>
                                                                                    </div>
                                                                                    {/* Section Progress Bar (small) */}
                                                                                    <div className="mt-1 flex items-center gap-2">
                                                                                        <div className="flex-1 h-1 bg-secondary/50 rounded-full overflow-hidden">
                                                                                            <div
                                                                                                className="h-full rounded-full bg-green-500"
                                                                                                style={{ width: `${sectionProgressPercentage}%` }}
                                                                                            />
                                                                                        </div>
                                                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                                            {completedSectionCount}/{totalSections} sections
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Module Details */}
                                                                            {isExpanded && (
                                                                                <Collapsible open={isExpanded}>
                                                                                    <CollapsibleContent className="mt-2 ml-6">
                                                                                        {hasDetails ? (
                                                                                            <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                                                                                                <div className="flex items-center justify-between mb-2">
                                                                                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                                                                                                        <Folder className="h-4 w-4 text-primary" />
                                                                                                        Course Modules & Sections
                                                                                                    </h4>
                                                                                                    <span className="text-xs text-muted-foreground">
                                                                                                        {completedModuleCount}/{totalModules} modules • {completedSectionCount}/{totalSections} sections
                                                                                                    </span>
                                                                                                </div>

                                                                                                {moduleProgressDetails[detailKey]?.modules?.length > 0 ? (
                                                                                                    <div className="space-y-2">
                                                                                                        {moduleProgressDetails[detailKey].modules.map((module, moduleIndex) => (
                                                                                                            <div key={moduleIndex} className="space-y-2">
                                                                                                                <div className="flex items-center justify-between p-2 bg-card rounded-md border">
                                                                                                                    <div className="flex items-center gap-2">
                                                                                                                        {module.isCompleted ? (
                                                                                                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                                                                                                        ) : (
                                                                                                                            <Circle className="h-4 w-4 text-muted-foreground" />
                                                                                                                        )}
                                                                                                                        <span className={`text-sm ${module.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                                                                                            {module.title || `Module ${moduleIndex + 1}`}
                                                                                                                        </span>
                                                                                                                    </div>
                                                                                                                    <div className="flex items-center gap-2">
                                                                                                                        <div className="w-16 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                                                                                                                            <div
                                                                                                                                className="h-full rounded-full bg-green-500"
                                                                                                                                style={{ width: `${module.sectionProgressPercentage}%` }}
                                                                                                                            />
                                                                                                                        </div>
                                                                                                                        <span className="text-xs text-muted-foreground">
                                                                                                                            {module.completedSectionsCount}/{module.totalSections} sections
                                                                                                                        </span>
                                                                                                                    </div>
                                                                                                                </div>

                                                                                                                {/* Sections within module */}
                                                                                                                {module.sections && module.sections.length > 0 && (
                                                                                                                    <div className="ml-6 space-y-1">
                                                                                                                        {module.sections.map((section, sectionIndex) => (
                                                                                                                            <div key={sectionIndex} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded">
                                                                                                                                <div className="flex items-center gap-2 flex-1">
                                                                                                                                    {section.isCompleted ? (
                                                                                                                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                                                                                                                    ) : (
                                                                                                                                        <Circle className="h-3 w-3 text-muted-foreground" />
                                                                                                                                    )}
                                                                                                                                    {getSectionIcon(section.type)}
                                                                                                                                    <span className={`text-xs ${section.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                                                                                                        {section.title || `Section ${sectionIndex + 1}`}
                                                                                                                                        {section.type && (
                                                                                                                                            <span className="ml-2 text-[10px] px-1 py-0.5 bg-muted rounded">
                                                                                                                                                {section.type}
                                                                                                                                            </span>
                                                                                                                                        )}
                                                                                                                                    </span>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                        ))}
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div className="text-center py-4 text-muted-foreground">
                                                                                                        <p className="text-sm">No modules available for this course</p>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="flex items-center justify-center p-4">
                                                                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                                                <span className="text-sm text-muted-foreground">Loading module details...</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </CollapsibleContent>
                                                                                </Collapsible>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <div className="text-xs text-muted-foreground italic">
                                                                    No enrolled courses
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48">
                                                                    <DropdownMenuLabel>Student Actions</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => handleViewStudent(student)}>
                                                                        <Eye className="h-4 w-4 mr-2" />
                                                                        View Details
                                                                    </DropdownMenuItem>
                                                                    {student.isAssigned ? (
                                                                        <>
                                                                            <DropdownMenuItem onClick={() => handleOpenEnrollmentDialog(student)}>
                                                                                <PlusCircle className="h-4 w-4 mr-2" />
                                                                                Enroll in Course
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                onClick={() => handleUnassignStudent(student)}
                                                                                className="text-destructive"
                                                                            >
                                                                                {unassigning && student.id === assigningStudent?.id ? (
                                                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                                ) : (
                                                                                    <X className="h-4 w-4 mr-2" />
                                                                                )}
                                                                                Unassign Student
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    ) : (
                                                                        <DropdownMenuItem
                                                                            onClick={() => handleAssignStudent(student)}
                                                                            className="text-blue-600"
                                                                        >
                                                                            {assigning && student.id === assigningStudent?.id ? (
                                                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                            ) : (
                                                                                <UserCog className="h-4 w-4 mr-2" />
                                                                            )}
                                                                            Assign to Instructor
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Courses Preview Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Course Curriculum Preview</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Preview the curriculum of courses assigned to this instructor (Read-only)
                            </p>
                        </CardHeader>
                        <CardContent>
                            {courses.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p className="text-muted-foreground font-medium">No courses assigned to this instructor</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Assign courses to this instructor first
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {courses.map(course => (
                                        <motion.div
                                            key={course.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                            className="border rounded-lg p-4 hover:border-primary transition-all duration-200 cursor-pointer hover:shadow-md group bg-card"
                                            onClick={() => handlePreviewCurriculum(course)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                            <BookOpen className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold group-hover:text-primary transition-colors">
                                                                {course.title}
                                                            </h4>
                                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                                <div className="flex items-center gap-1">
                                                                    <Folder className="h-3 w-3" />
                                                                    <span>{course.modules?.length || 0} modules</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <FileText className="h-3 w-3" />
                                                                    <span>{calculateTotalSections(course.modules)} sections</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {course.description && (
                                                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                                            {course.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <Eye className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>

                                            <div className="mt-4">
                                                <div className="flex items-center justify-between text-xs mb-1">
                                                    <span className="text-muted-foreground">Curriculum Progress</span>
                                                    <span className="font-medium">{course.modules?.length || 0} modules</span>
                                                </div>
                                                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-primary rounded-full"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: '100%' }}
                                                        transition={{ duration: 0.5, delay: 0.1 }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between">
                                                <Badge variant="outline" className="text-xs">
                                                    Read-only Preview
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs gap-1"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handlePreviewCurriculum(course);
                                                    }}
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    Preview Curriculum
                                                </Button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Student Details Modal */}
                    {selectedStudent && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                            <div className="bg-background rounded-lg shadow-xl w-full max-w-6xl p-6 relative max-h-[90vh] overflow-y-auto border">
                                {/* Close Button */}
                                <button
                                    onClick={() => {
                                        setSelectedStudent(null);
                                        setExpandedCourseId(null);
                                    }}
                                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>

                                <h2 className="text-2xl font-bold mb-6">Student Details</h2>

                                {isModalLoading ? (
                                    <div className="flex flex-col items-center justify-center py-24 space-y-4">
                                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                        <p className="text-muted-foreground font-medium animate-pulse">
                                            Loading student progress data...
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {/* Student Info Header */}
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                                            <div>
                                                <h3 className="text-2xl font-semibold text-foreground">
                                                    {selectedStudent.fullName || "Unnamed Student"}
                                                </h3>
                                                <p className="text-muted-foreground flex items-center gap-2">
                                                    <Mail className="h-4 w-4" />
                                                    {selectedStudent.email}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {selectedStudent.isAssigned ? (
                                                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 py-1 px-3">
                                                        <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                                                        Assigned to {selectedInstructor.fullName}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="py-1 px-3">
                                                        Not Assigned
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* Basic Info Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/30 p-4 rounded-xl">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">College</label>
                                                <p className="text-base font-medium">{selectedStudent.college || "Not specified"}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Account Created</label>
                                                <p className="text-base font-medium">
                                                    {selectedStudent.createdAt ? new Date(selectedStudent.createdAt).toLocaleDateString() : "Unknown"}
                                                </p>
                                            </div>
                                            {selectedStudent.isAssigned && selectedStudent.assignedDate && (
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned Date</label>
                                                    <p className="text-base font-medium text-blue-700">
                                                        {new Date(selectedStudent.assignedDate).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Enrolled Courses with Detailed Progress */}
                                        <div>
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="text-lg font-bold flex items-center gap-2">
                                                    <BookOpen className="h-5 w-5 text-primary" />
                                                    Enrolled Courses ({studentCourses.length})
                                                </h4>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleOpenEnrollmentDialog(selectedStudent)} disabled={!selectedStudent.isAssigned}>
                                                            <PlusCircle className="h-4 w-4 mr-2" />
                                                            Enroll in Course
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            <Download className="h-4 w-4 mr-2" />
                                                            Export Progress Report
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            {studentCourses.length > 0 ? (
                                                <div className="grid grid-cols-1 gap-4">
                                                    {studentCourses.map(course => {
                                                        const isAssignedCourse = courses.some(c => c.id === course.id);
                                                        const isBanned = selectedStudent.bannedFrom?.includes(course.id);
                                                        const progress = studentProgress.find(p => p.courseId === course.id);
                                                        const moduleProgressPercentage = progress?.moduleProgressPercentage || 0;
                                                        const sectionProgressPercentage = progress?.sectionProgressPercentage || 0;
                                                        const detailKey = `${selectedStudent.id}-${course.id}`;
                                                        const isExpanded = expandedCourseId === detailKey;

                                                        return (
                                                            <div
                                                                key={course.id}
                                                                className={`group p-4 border rounded-xl transition-all duration-200 shadow-sm hover:shadow-md 
                                                                    ${isBanned ? 'border-destructive/40 bg-destructive/5' : 'hover:border-primary bg-card'}
                                                                `}
                                                            >
                                                                <div className="flex justify-between items-start mb-2 gap-2">
                                                                    <div className="font-bold text-foreground leading-tight">
                                                                        {course.title}
                                                                    </div>
                                                                    <div className="flex shrink-0 gap-1">
                                                                        {isBanned ? (
                                                                            <Badge variant="destructive" className="h-6">
                                                                                <Ban className="h-3 w-3 mr-1" /> Banned
                                                                            </Badge>
                                                                        ) : isAssignedCourse ? (
                                                                            <Badge className="bg-blue-100 text-blue-800 h-6">Assigned</Badge>
                                                                        ) : null}
                                                                    </div>
                                                                </div>

                                                                {!isBanned ? (
                                                                    <div className="space-y-4">
                                                                        {/* Progress Stats */}
                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <div className="space-y-2">
                                                                                <div className="flex justify-between text-sm items-end">
                                                                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                                                                        <Folder className="h-3.5 w-3.5" />
                                                                                        Module Progress
                                                                                    </span>
                                                                                    <span className="font-bold text-primary text-base">
                                                                                        {moduleProgressPercentage}%
                                                                                    </span>
                                                                                </div>
                                                                                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                                                                                        style={{ width: `${moduleProgressPercentage}%` }}
                                                                                    />
                                                                                </div>
                                                                                <div className="flex justify-between text-xs font-medium">
                                                                                    <span className="text-muted-foreground">
                                                                                        {progress?.completedModuleCount || 0} / {progress?.totalModules || course.totalModules || 0} Modules
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            <div className="space-y-2">
                                                                                <div className="flex justify-between text-sm items-end">
                                                                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                                                                        <FileText className="h-3.5 w-3.5" />
                                                                                        Section Progress
                                                                                    </span>
                                                                                    <span className="font-bold text-green-600 text-base">
                                                                                        {sectionProgressPercentage}%
                                                                                    </span>
                                                                                </div>
                                                                                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className="h-full bg-green-500 rounded-full transition-all duration-500 ease-out"
                                                                                        style={{ width: `${sectionProgressPercentage}%` }}
                                                                                    />
                                                                                </div>
                                                                                <div className="flex justify-between text-xs font-medium">
                                                                                    <span className="text-muted-foreground">
                                                                                        {progress?.completedSectionCount || 0} / {progress?.totalSections || course.totalSections || 0} Sections
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Module Details Toggle */}
                                                                        <div className="pt-2">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="w-full justify-start text-sm"
                                                                                onClick={() => toggleCourseDetails(selectedStudent.id, course)}
                                                                            >
                                                                                {isExpanded ? (
                                                                                    <ChevronDown className="h-4 w-4 mr-2" />
                                                                                ) : (
                                                                                    <ChevronRight className="h-4 w-4 mr-2" />
                                                                                )}
                                                                                {isExpanded ? "Hide" : "View"} Module Details
                                                                            </Button>
                                                                        </div>

                                                                        {/* Module Details */}
                                                                        {isExpanded && (
                                                                            <Collapsible open={isExpanded}>
                                                                                <CollapsibleContent className="mt-4 pt-4 border-t">
                                                                                    {moduleProgressDetails[detailKey] ? (
                                                                                        <div className="space-y-3">
                                                                                            <h5 className="text-sm font-semibold flex items-center gap-2">
                                                                                                <Folder className="h-4 w-4 text-primary" />
                                                                                                Course Modules & Sections
                                                                                            </h5>

                                                                                            {moduleProgressDetails[detailKey]?.modules?.length > 0 ? (
                                                                                                <div className="space-y-2">
                                                                                                    {moduleProgressDetails[detailKey].modules.map((module, moduleIndex) => (
                                                                                                        <div key={moduleIndex} className="space-y-2">
                                                                                                            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                                                                                                <div className="flex items-center gap-2">
                                                                                                                    {module.isCompleted ? (
                                                                                                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                                                                                                    ) : (
                                                                                                                        <Circle className="h-4 w-4 text-muted-foreground" />
                                                                                                                    )}
                                                                                                                    <span className={`text-sm font-medium ${module.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                                                                                        {module.title || `Module ${moduleIndex + 1}`}
                                                                                                                    </span>
                                                                                                                </div>
                                                                                                                <div className="flex items-center gap-2">
                                                                                                                    <div className="w-20 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                                                                                                                        <div
                                                                                                                            className="h-full rounded-full bg-green-500"
                                                                                                                            style={{ width: `${module.sectionProgressPercentage}%` }}
                                                                                                                        />
                                                                                                                    </div>
                                                                                                                    <span className="text-xs text-muted-foreground">
                                                                                                                        {module.completedSectionsCount}/{module.totalSections} sections
                                                                                                                    </span>
                                                                                                                </div>
                                                                                                            </div>

                                                                                                            {/* Sections within module */}
                                                                                                            {module.sections && module.sections.length > 0 && (
                                                                                                                <div className="ml-6 space-y-1">
                                                                                                                    {module.sections.map((section, sectionIndex) => (
                                                                                                                        <div key={sectionIndex} className="flex items-center gap-2 p-1.5 hover:bg-muted/30 rounded">
                                                                                                                            <div className="flex items-center gap-2 flex-1">
                                                                                                                                {section.isCompleted ? (
                                                                                                                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                                                                                                                ) : (
                                                                                                                                    <Circle className="h-3 w-3 text-muted-foreground" />
                                                                                                                                )}
                                                                                                                                {getSectionIcon(section.type)}
                                                                                                                                <span className={`text-xs ${section.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                                                                                                    {section.title || `Section ${sectionIndex + 1}`}
                                                                                                                                    {section.type && (
                                                                                                                                        <span className="ml-2 text-[10px] px-1 py-0.5 bg-muted rounded">
                                                                                                                                            {section.type}
                                                                                                                                        </span>
                                                                                                                                    )}
                                                                                                                                </span>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    ))}
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="text-center py-4 text-muted-foreground">
                                                                                                    <p className="text-sm">No modules available for this course</p>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="flex items-center justify-center p-4">
                                                                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                                            <span className="text-sm text-muted-foreground">Loading module details...</span>
                                                                                        </div>
                                                                                    )}
                                                                                </CollapsibleContent>
                                                                            </Collapsible>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="mt-4 p-3 bg-destructive/10 rounded-lg text-sm text-destructive font-medium flex items-center gap-2">
                                                                        <AlertCircle className="h-4 w-4" />
                                                                        Access to this course has been restricted.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                                                    <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                                    <p className="font-medium">No courses found for this student.</p>
                                                    <p className="text-sm mt-2">
                                                        {selectedStudent.isAssigned
                                                            ? "Enroll this student in a course to get started."
                                                            : "Assign this student to the instructor first to enroll in courses."}
                                                    </p>
                                                    {selectedStudent.isAssigned && (
                                                        <Button
                                                            onClick={() => handleOpenEnrollmentDialog(selectedStudent)}
                                                            className="mt-4 gap-2"
                                                        >
                                                            <UserPlus className="h-4 w-4" />
                                                            Enroll in Course
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Footer */}
                                        <div className="mt-8 flex flex-col sm:flex-row justify-between gap-3 border-t pt-6">
                                            <div className="flex gap-2">
                                                {!selectedStudent.isAssigned ? (
                                                    <Button
                                                        onClick={() => handleAssignStudent(selectedStudent)}
                                                        className="gap-2"
                                                        disabled={assigning}
                                                    >
                                                        {assigning && selectedStudent.id === assigningStudent?.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <UserCog className="h-4 w-4" />
                                                        )}
                                                        Assign to {selectedInstructor.fullName}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => handleOpenEnrollmentDialog(selectedStudent)}
                                                        className="gap-2"
                                                        disabled={!selectedStudent.isAssigned}
                                                    >
                                                        <PlusCircle className="h-4 w-4" />
                                                        Enroll in Another Course
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedStudent(null);
                                                        setExpandedCourseId(null);
                                                    }}
                                                >
                                                    Close
                                                </Button>
                                                {selectedStudent.enrollmentCount > 0 && (
                                                    <Button className="shadow-sm gap-2">
                                                        <Eye className="h-4 w-4" />
                                                        View Full Progress Report
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// Add missing RefreshCw icon component
const RefreshCw = ({ className, ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M8 16H3v5" />
    </svg>
);