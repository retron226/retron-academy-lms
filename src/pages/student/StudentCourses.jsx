import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    doc,
    arrayUnion,
    getDoc,
    documentId,
    orderBy
} from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
    Loader2,
    PlayCircle,
    BookOpen,
    CheckCircle,
    Clock,
    AlertCircle,
    BarChart,
    Lock,
    FileText,
    Video,
    MessageSquare,
    Code,
    Image,
    Music,
    ExternalLink,
    Ban,
    AlertTriangle,
    ShieldAlert,
    Mail,
    GraduationCap,
    Users,
    BarChart3
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";

export default function StudentCourses() {
    const { user, userData } = useAuth();
    const navigate = useNavigate();
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startingCourse, setStartingCourse] = useState(null);
    const [bannedCourses, setBannedCourses] = useState([]);
    const [showBannedDialog, setShowBannedDialog] = useState(false);
    const [selectedBannedCourse, setSelectedBannedCourse] = useState(null);

    // Stats
    const [stats, setStats] = useState({
        totalCourses: 0,
        activeCourses: 0,
        bannedCourses: 0,
        averageProgress: 0,
        completedCourses: 0
    });

    useEffect(() => {
        if (userData) {
            fetchEnrolledCourses();
        } else {
            setEnrolledCourses([]);
            setLoading(false);
        }
    }, [userData]);

    const fetchEnrolledCourses = async () => {
        try {
            if (!userData.enrolledCourses || userData.enrolledCourses.length === 0) {
                setEnrolledCourses([]);
                setBannedCourses([]);
                setStats({
                    totalCourses: 0,
                    activeCourses: 0,
                    bannedCourses: 0,
                    averageProgress: 0,
                    completedCourses: 0
                });
                setLoading(false);
                return;
            }


            console.log("userDATA:   ");
            console.log(userData);

            const enrolledIds = userData.enrolledCourses;
            const bannedFrom = userData.bannedFrom || [];
            const mentorId = userData.mentorId; // Assuming mentorId is stored in userData

            const chunks = [];
            for (let i = 0; i < enrolledIds.length; i += 10) {
                chunks.push(enrolledIds.slice(i, i + 10));
            }

            let allCourses = [];

            for (const chunk of chunks) {
                // 1. Fetch Course Data
                const coursesQuery = query(collection(db, "courses"), where(documentId(), "in", chunk));
                const coursesSnap = await getDocs(coursesQuery);

                // 2. Fetch Student Progress
                const progressQuery = query(collection(db, "users", user.uid, "courseProgress"), where(documentId(), "in", chunk));
                const progressSnap = await getDocs(progressQuery);

                const progressMap = {};
                progressSnap.forEach(doc => {
                    progressMap[doc.id] = doc.data();
                });

                // 3. NEW: Fetch Assignment Status (The Kill-Switch)
                // We fetch the status for each course in the chunk to see if the mentor is still active
                const assignmentMap = {};
                if (mentorId) {
                    await Promise.all(chunk.map(async (courseId) => {
                        const assignmentId = `${mentorId}_${courseId}`;
                        const assignmentSnap = await getDoc(doc(db, "mentorCourseAssignments", assignmentId));
                        assignmentMap[courseId] = assignmentSnap.exists() ? assignmentSnap.data().status : "inactive";
                    }));
                }

                // 4. Process each course
                const chunkCourses = await Promise.all(coursesSnap.docs.map(async (courseDoc) => {
                    const courseData = courseDoc.data();
                    const courseId = courseDoc.id;

                    // Logic: A course is "Banned" if it's in the banned list OR the assignment is not active
                    const isAssignmentInactive = mentorId && assignmentMap[courseId] !== "active";
                    const isBanned = bannedFrom.includes(courseId) || isAssignmentInactive;

                    const progress = progressMap[courseId] || {
                        completedModules: [],
                        quizAttempts: {},
                        started: false
                    };

                    if (isBanned) {
                        return {
                            id: courseId,
                            ...courseData,
                            isBanned: true,
                            bannedReason: isAssignmentInactive ? "Access revoked by institution" : "Access restricted by instructor",
                            bannedDate: progress.lastAccessed || new Date().toISOString(),
                            totalModules: 0,
                            progress,
                            nextModulePath: null,
                            nextQuiz: null,
                            quizAttempted: false,
                            completedCount: progress.completedModules?.length || 0,
                            progressPercent: 0,
                            completed: false,
                            started: progress.started || false
                        };
                    }

                    // --- EXISTING ACTIVE COURSE LOGIC START ---
                    let totalModules = 0;
                    let allModules = [];

                    try {
                        const sectionsRef = collection(db, `courses/${courseId}/sections`);
                        const sectionsQuery = query(sectionsRef, orderBy("order", "asc"));
                        const sectionsSnap = await getDocs(sectionsQuery);
                        const sectionsData = [];

                        sectionsSnap.forEach(sectionDoc => {
                            const sectionData = sectionDoc.data();
                            const sectionId = sectionDoc.id;

                            const directModules = Array.isArray(sectionData.modules) ? sectionData.modules : [];
                            totalModules += directModules.length;

                            let subSectionModulesCount = 0;
                            let subSectionModules = [];
                            const subSections = Array.isArray(sectionData.subSections) ? sectionData.subSections : [];

                            subSections.forEach(subSection => {
                                const subSectionModulesList = Array.isArray(subSection.modules) ? subSection.modules : [];
                                subSectionModulesCount += subSectionModulesList.length;
                                subSectionModules = subSectionModules.concat(subSectionModulesList);
                            });

                            totalModules += subSectionModulesCount;
                            const sectionAllModules = [...directModules, ...subSectionModules];

                            const processedModules = sectionAllModules.map(module => {
                                const fromSubSection = subSectionModules.includes(module);
                                let subSection = fromSubSection ? subSections.find(ss => Array.isArray(ss.modules) && ss.modules.includes(module)) : null;

                                let path = fromSubSection && subSection
                                    ? `/student/course/${courseId}/section/${sectionId}/sub-section/${subSection.id}/module/${module.id}`
                                    : `/student/course/${courseId}/section/${sectionId}/module/${module.id}`;

                                return {
                                    ...module,
                                    id: module.id || `${sectionId}-${module.title?.replace(/\s+/g, '-').toLowerCase()}`,
                                    sectionId,
                                    isSubSection: fromSubSection,
                                    subSectionId: subSection?.id || null,
                                    path,
                                    order: typeof module.order === 'number' ? module.order : 999
                                };
                            });

                            allModules = allModules.concat(processedModules);
                            sectionsData.push({ id: sectionId, ...sectionData, order: sectionData.order || 0, processedModules });
                        });

                        sectionsData.sort((a, b) => (a.order || 0) - (b.order || 0));
                        allModules.sort((a, b) => {
                            const sA = sectionsData.find(s => s.id === a.sectionId);
                            const sB = sectionsData.find(s => s.id === b.sectionId);
                            if (sA && sB && sA.order !== sB.order) return sA.order - sB.order;
                            return (a.order || 0) - (b.order || 0);
                        });
                    } catch (error) {
                        console.error(`Error fetching sections:`, error);
                    }

                    const isStarted = progress.started || (progress.completedModules?.length > 0) || progress.lastAccessed;
                    if (!progress.started && isStarted) {
                        try {
                            const progressRef = doc(db, "users", user.uid, "courseProgress", courseId);
                            await updateDoc(progressRef, { started: true, lastAccessed: new Date().toISOString() });
                            progress.started = true;
                        } catch (e) { console.error(e); }
                    }

                    let nextModulePath = allModules.length > 0 ? (allModules.find(m => !progress.completedModules?.includes(m.id))?.path || allModules[0].path) : null;

                    const completedCount = progress.completedModules?.length || 0;
                    const progressPercent = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

                    return {
                        id: courseId,
                        ...courseData,
                        isBanned: false,
                        totalModules,
                        progress,
                        nextModulePath,
                        completedCount,
                        progressPercent,
                        completed: progressPercent === 100 && totalModules > 0,
                        started: progress.started || false,
                        lastAccessed: progress.lastAccessed
                    };
                    // --- EXISTING ACTIVE COURSE LOGIC END ---
                }));

                allCourses = [...allCourses, ...chunkCourses];
            }

            const activeCourses = allCourses.filter(c => !c.isBanned);
            const bannedCoursesList = allCourses.filter(c => c.isBanned);

            activeCourses.sort((a, b) => {
                if (!a.started && b.started) return -1;
                if (a.started && !b.started) return 1;
                return b.progressPercent - a.progressPercent;
            });

            setStats({
                totalCourses: allCourses.length,
                activeCourses: activeCourses.length,
                bannedCourses: bannedCoursesList.length,
                completedCourses: activeCourses.filter(c => c.completed).length,
                averageProgress: activeCourses.length > 0 ? Math.round(activeCourses.reduce((s, c) => s + c.progressPercent, 0) / activeCourses.length) : 0
            });

            setEnrolledCourses(activeCourses);
            setBannedCourses(bannedCoursesList);
        } catch (error) {
            console.error("Error fetching enrolled courses:", error);
        } finally {
            setLoading(false);
        }
    };
    const handleStartCourse = async (courseId) => {
        console.log("course id: ", courseId);
        if (startingCourse === courseId) return;

        setStartingCourse(courseId);
        try {
            // Find the course
            const course = enrolledCourses.find(c => c.id === courseId);

            // If course hasn't been started yet, mark it as started
            if (course && !course.started) {
                const progressRef = doc(db, "users", user.uid, "courseProgress", courseId);
                await updateDoc(progressRef, {
                    started: true,
                    lastAccessed: new Date().toISOString()
                });
            }

            // if (course?.nextModulePath) {
            //     navigate(course.nextModulePath);
            // } else {
            navigate(`/student/course/${courseId}`);
            // }
        } catch (error) {
            console.error("Error starting course:", error);
        } finally {
            setStartingCourse(null);
        }
    };

    const handleAttemptQuiz = (courseId, quizPath) => {
        navigate(quizPath);
    };

    const handleViewBannedCourseDetails = (course) => {
        setSelectedBannedCourse(course);
        setShowBannedDialog(true);
    };

    const getModuleIcon = (moduleType) => {
        if (!moduleType) return <FileText className="h-4 w-4" />;

        const type = moduleType.toLowerCase();
        switch (type) {
            case 'video':
            case 'video_lesson':
                return <Video className="h-4 w-4 text-blue-500" />;
            case 'article':
            case 'text':
            case 'text_lesson':
            case 'document':
                return <FileText className="h-4 w-4 text-green-500" />;
            case 'quiz':
            case 'assessment':
            case 'test':
                return <BarChart className="h-4 w-4 text-purple-500" />;
            case 'assignment':
                return <FileText className="h-4 w-4 text-orange-500" />;
            case 'discussion':
                return <MessageSquare className="h-4 w-4 text-pink-500" />;
            case 'code':
                return <Code className="h-4 w-4 text-indigo-500" />;
            case 'image':
                return <Image className="h-4 w-4 text-cyan-500" />;
            case 'audio':
                return <Music className="h-4 w-4 text-red-500" />;
            case 'link':
                return <ExternalLink className="h-4 w-4 text-teal-500" />;
            default:
                return <FileText className="h-4 w-4 text-gray-500" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                <span>Loading your courses...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 w-full h-full flex flex-col">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">My Learning</h1>
                <p className="text-muted-foreground">
                    Continue your learning journey or start a new course
                </p>
            </div>

            {/* Stats Summary - MOVED TO TOP */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Enrolled</p>
                                <p className="text-2xl font-bold">{stats.totalCourses}</p>
                                <p className="text-xs text-muted-foreground">
                                    All courses
                                </p>
                            </div>
                            <GraduationCap className="h-8 w-8 text-primary" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Active Courses</p>
                                <p className="text-2xl font-bold">{stats.activeCourses}</p>
                                <p className="text-xs text-muted-foreground">
                                    {stats.completedCourses} completed
                                </p>
                            </div>
                            <BookOpen className="h-8 w-8 text-green-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Average Progress</p>
                                <p className="text-2xl font-bold">{stats.averageProgress}%</p>
                                <p className="text-xs text-muted-foreground">
                                    Across all courses
                                </p>
                            </div>
                            <BarChart3 className="h-8 w-8 text-blue-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Restricted</p>
                                <p className="text-2xl font-bold text-destructive">{stats.bannedCourses}</p>
                                <p className="text-xs text-muted-foreground">
                                    Access restricted
                                </p>
                            </div>
                            <Ban className="h-8 w-8 text-destructive" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                                <p className="text-2xl font-bold">
                                    {stats.activeCourses > 0 ? Math.round((stats.completedCourses / stats.activeCourses) * 100) : 0}%
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Of active courses
                                </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-purple-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Active Courses Section - MOVED TO MIDDLE */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-semibold">Your Active Courses</h2>
                    </div>
                    <Badge variant="outline" className="gap-1">
                        {enrolledCourses.length} course{enrolledCourses.length !== 1 ? 's' : ''}
                    </Badge>
                </div>

                {enrolledCourses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                        <BookOpen className="h-16 w-16 mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold mb-2">No Active Courses</h3>
                        <p className="text-center">
                            {bannedCourses.length > 0 ?
                                "All your enrolled courses are currently restricted. Check the Restricted section below." :
                                "You are not enrolled in any courses yet. Explore available courses to get started."}
                        </p>
                        {bannedCourses.length === 0 && (
                            <Button className="mt-4">
                                Explore Courses
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {enrolledCourses.map((course) => {
                            // Determine the status badge text and variant
                            let statusText = "";
                            let statusVariant = "secondary";

                            if (course.completed) {
                                statusText = "Completed";
                                statusVariant = "success";
                            } else if (course.progressPercent > 0) {
                                statusText = `${course.progressPercent}%`;
                                statusVariant = "default";
                            } else if (course.started) {
                                statusText = "In Progress";
                                statusVariant = "default";
                            } else {
                                statusText = "Not Started";
                                statusVariant = "secondary";
                            }

                            return (
                                <Card key={course.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden border">
                                    {/* Course Thumbnail */}
                                    <div className="aspect-video w-full overflow-hidden bg-muted relative">
                                        {course.thumbnailUrl ? (
                                            <img
                                                src={course.thumbnailUrl}
                                                alt={course.title}
                                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-muted-foreground">
                                                <BookOpen className="h-12 w-12 opacity-50" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 right-3">
                                            <Badge variant={statusVariant}>
                                                {statusText}
                                            </Badge>
                                        </div>
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <PlayCircle className="h-12 w-12 text-white" />
                                        </div>
                                    </div>

                                    <CardContent className="p-6 space-y-4">
                                        {/* Course Title & Description */}
                                        <div>
                                            <h3 className="font-bold text-lg line-clamp-1 mb-1">{course.title}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {course.description}
                                            </p>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">Progress</span>
                                                <span className="text-primary font-semibold">
                                                    {course.completedCount}/{course.totalModules} modules
                                                </span>
                                            </div>
                                            <Progress value={course.progressPercent} className="h-2" />
                                        </div>

                                        {/* Next Actions */}
                                        <div className="space-y-3 pt-2">
                                            {/* Quiz Available */}
                                            {course.nextQuiz?.isAvailable && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-sm text-purple-600 font-medium">
                                                        <BarChart className="h-4 w-4" />
                                                        <span>Quiz Available</span>
                                                    </div>
                                                    <div className="bg-purple-50 p-3 rounded-md border border-purple-200">
                                                        <div className="text-sm font-medium mb-1">{course.nextQuiz.title}</div>
                                                        <div className="text-xs text-purple-600 mb-2">
                                                            From: {course.nextQuiz.sectionTitle}
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            className="w-full bg-purple-600 hover:bg-purple-700"
                                                            onClick={() => handleAttemptQuiz(course.id, course.nextQuiz.path)}
                                                        >
                                                            Attempt Quiz
                                                        </Button>
                                                        <div className="text-xs text-muted-foreground mt-2 text-center">
                                                            Can be attempted only once
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Quiz Already Attempted */}
                                            {course.quizAttempted && !course.nextQuiz?.isAvailable && (
                                                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md">
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span>All quizzes attempted</span>
                                                </div>
                                            )}

                                            {/* Continue/Start Button */}
                                            <Button
                                                onClick={() => handleStartCourse(course.id)}
                                                disabled={startingCourse === course.id}
                                                className="w-full gap-2"
                                            >
                                                {startingCourse === course.id ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Loading...
                                                    </>
                                                ) : (
                                                    <>
                                                        {course.completed ? (
                                                            <>
                                                                <CheckCircle className="h-4 w-4" />
                                                                Review Course
                                                            </>
                                                        ) : course.progressPercent === 0 && !course.started ? (
                                                            <>
                                                                <PlayCircle className="h-4 w-4" />
                                                                Start Course
                                                            </>
                                                        ) : (
                                                            <>
                                                                <PlayCircle className="h-4 w-4" />
                                                                Continue Learning
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </Button>

                                            {/* Course Info */}
                                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{course.duration || "Self-paced"}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        {course.totalModules} modules
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Empty State for All Completed */}
            {enrolledCourses.length > 0 && enrolledCourses.every(c => c.completed) && (
                <div className="text-center py-8 border-2 border-dashed rounded-xl">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Amazing Progress! 🎉</h3>
                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                        You've successfully completed all your active courses. Keep up the great work and explore new learning opportunities!
                    </p>
                    <Button className="gap-2">
                        <BookOpen className="h-4 w-4" />
                        Explore More Courses
                    </Button>
                </div>
            )}

            {/* Banned Courses Section - MOVED TO BOTTOM */}
            {bannedCourses.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                            <h2 className="text-xl font-semibold text-amber-700">Restricted Courses</h2>
                            <Badge variant="destructive" className="ml-2">
                                {bannedCourses.length} course{bannedCourses.length !== 1 ? 's' : ''}
                            </Badge>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => setShowBannedDialog(true)}
                        >
                            View All
                        </Button>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {bannedCourses.slice(0, 3).map((course) => (
                            <Card
                                key={course.id}
                                className="border-destructive/40 bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer"
                                onClick={() => handleViewBannedCourseDetails(course)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0">
                                            <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center">
                                                <Ban className="h-6 w-6 text-destructive" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-bold text-lg line-clamp-1 text-destructive">
                                                    {course.title}
                                                </h3>
                                                <Badge variant="destructive" className="ml-2">
                                                    <Ban className="h-3 w-3 mr-1" />
                                                    Restricted
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                                Access to this course has been restricted by your instructor.
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-destructive/80">
                                                <AlertCircle className="h-4 w-4" />
                                                <span>Contact your instructor for access</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {bannedCourses.length > 3 && (
                        <div className="text-center">
                            <Button
                                variant="link"
                                className="text-destructive"
                                onClick={() => setShowBannedDialog(true)}
                            >
                                + {bannedCourses.length - 3} more restricted course{bannedCourses.length - 3 !== 1 ? 's' : ''}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Banned Courses Dialog */}
            <Dialog open={showBannedDialog} onOpenChange={setShowBannedDialog}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <ShieldAlert className="h-5 w-5" />
                            Restricted Courses ({bannedCourses.length})
                        </DialogTitle>
                        <DialogDescription>
                            Access to these courses has been restricted by your instructors.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {bannedCourses.map((course) => (
                            <div
                                key={course.id}
                                className="p-4 border border-destructive/30 rounded-lg bg-destructive/5 hover:bg-destructive/10 transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                                            <Ban className="h-5 w-5 text-destructive" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-semibold text-destructive">{course.title}</h4>
                                            <Badge variant="destructive" className="text-xs">
                                                <Lock className="h-3 w-3 mr-1" />
                                                Restricted
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            {course.description || "No description available"}
                                        </p>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="space-y-1">
                                                <div className="text-xs text-muted-foreground">Progress Before Restriction</div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-destructive/50 rounded-full"
                                                            style={{ width: `${Math.min(course.progressPercent, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-medium text-destructive/80">
                                                        {course.completedCount} modules
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-xs text-muted-foreground">Last Accessed</div>
                                                <div className="flex items-center gap-1 text-destructive/80">
                                                    <Clock className="h-3 w-3" />
                                                    <span>
                                                        {course.bannedDate ?
                                                            new Date(course.bannedDate).toLocaleDateString() :
                                                            "Unknown"
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4" />
                                                <span className="font-medium">Access Restricted</span>
                                            </div>
                                            <p className="mt-1 text-xs">
                                                {course.bannedReason || "Your instructor has restricted access to this course. Please contact them for more information."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <div className="w-full flex flex-col sm:flex-row gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowBannedDialog(false)}
                                className="flex-1"
                            >
                                Close
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    // You can add functionality to contact support or instructors
                                    setShowBannedDialog(false);
                                }}
                                className="flex-1 gap-2"
                            >
                                <Mail className="h-4 w-4" />
                                Contact Support
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}