import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
    Megaphone,
    Send,
    Loader2,
    Clock,
    BookOpen,
    Calendar,
    AlertCircle,
    Bell,
    Users
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

export default function InstructorAnnouncements() {
    const { user, userData } = useAuth();
    const [courses, setCourses] = useState([]);
    const [assignedCourses, setAssignedCourses] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState("all");
    const [formData, setFormData] = useState({
        courseId: "",
        title: "",
        message: "",
        priority: "normal" // normal, important, urgent
    });

    useEffect(() => {
        if (user && userData) {
            fetchData();
        }
    }, [user, userData]);

    const fetchData = async () => {
        try {
            setLoading(true);

            let myCourses = [];

            if (userData.role === "instructor") {
                // Regular instructor - get courses they created
                const qCourses = query(collection(db, "courses"), where("instructorId", "==", user.uid));
                const coursesSnap = await getDocs(qCourses);
                myCourses = coursesSnap.docs.map(doc => ({
                    id: doc.id,
                    title: doc.data().title,
                    type: "created"
                }));
            } else if (userData.role === "partner_instructor") {
                // Partner instructor - get courses assigned to them
                const mentorCourseAssignmentsRef = collection(db, "mentorCourseAssignments");
                const q = query(
                    mentorCourseAssignmentsRef,
                    where("mentorId", "==", user.uid),
                    where("status", "==", "active")
                );

                const assignmentsSnap = await getDocs(q);
                const courseIds = assignmentsSnap.docs.map(doc => doc.data().courseId);

                if (courseIds.length > 0) {
                    // Fetch course details for assigned courses
                    for (let i = 0; i < courseIds.length; i += 10) {
                        const batchIds = courseIds.slice(i, i + 10);
                        const coursesRef = collection(db, "courses");
                        const coursesQ = query(coursesRef, where("__name__", "in", batchIds));
                        const coursesSnap = await getDocs(coursesQ);

                        coursesSnap.forEach(courseDoc => {
                            myCourses.push({
                                id: courseDoc.id,
                                title: courseDoc.data().title,
                                type: "assigned"
                            });
                        });
                    }
                }

                // Also get courses created by partner instructor (if any)
                const createdCoursesQ = query(collection(db, "courses"), where("instructorId", "==", user.uid));
                const createdCoursesSnap = await getDocs(createdCoursesQ);
                const createdCourses = createdCoursesSnap.docs.map(doc => ({
                    id: doc.id,
                    title: doc.data().title,
                    type: "created"
                }));

                myCourses = [...myCourses, ...createdCourses];
            }

            setCourses(myCourses);
            setAssignedCourses(myCourses.filter(course => course.type === "assigned"));

            if (myCourses.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    courseId: myCourses[0].id
                }));
                fetchAnnouncements(myCourses.map(c => c.id));
            } else {
                setAnnouncements([]);
                setLoading(false);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
            setLoading(false);
        }
    };

    const fetchAnnouncements = async (courseIds) => {
        try {
            // Fetch announcements for the instructor's courses
            if (courseIds.length === 0) {
                setAnnouncements([]);
                setLoading(false);
                return;
            }

            let announcementsData = [];

            // Since Firestore 'in' query is limited to 10, we need to batch
            for (let i = 0; i < courseIds.length; i += 10) {
                const batchIds = courseIds.slice(i, i + 10);
                const q = query(
                    collection(db, "announcements"),
                    where("courseId", "in", batchIds)
                );
                const snap = await getDocs(q);

                snap.docs.forEach(doc => {
                    announcementsData.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
            }

            // Sort by date, newest first
            announcementsData.sort((a, b) => {
                const aTime = a.createdAt?.toMillis() || 0;
                const bTime = b.createdAt?.toMillis() || 0;
                return bTime - aTime;
            });

            setAnnouncements(announcementsData);
        } catch (error) {
            console.error("Error fetching announcements:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.message || !formData.courseId) {
            alert("Please fill in all fields");
            return;
        }

        try {
            setSubmitting(true);
            const selectedCourse = courses.find(c => c.id === formData.courseId);

            await addDoc(collection(db, "announcements"), {
                courseId: formData.courseId,
                courseTitle: selectedCourse?.title || "Unknown Course",
                instructorId: user.uid,
                instructorName: userData.fullName || user.email,
                instructorRole: userData.role,
                title: formData.title,
                message: formData.message,
                priority: formData.priority,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Also create notification for students in this course
            await createStudentNotifications(formData.courseId, formData.title);

            setFormData(prev => ({
                ...prev,
                title: "",
                message: "",
                priority: "normal"
            }));

            fetchAnnouncements(courses.map(c => c.id)); // Refresh list

            alert("Announcement sent successfully!");
        } catch (error) {
            console.error("Error sending announcement:", error);
            alert("Failed to send announcement.");
        } finally {
            setSubmitting(false);
        }
    };

    const createStudentNotifications = async (courseId, announcementTitle) => {
        try {
            // Get all students enrolled in this course
            const enrollmentsRef = collection(db, "enrollments");
            const q = query(
                enrollmentsRef,
                where("courseId", "==", courseId),
                where("status", "==", "active")
            );

            const enrollmentsSnap = await getDocs(q);

            // Create notifications for each student
            const batchPromises = [];

            enrollmentsSnap.forEach((enrollmentDoc) => {
                const enrollmentData = enrollmentDoc.data();
                const notificationRef = collection(db, "users", enrollmentData.userId, "notifications");

                const notification = {
                    type: "announcement",
                    title: "New Announcement",
                    message: `${userData.fullName || user.email} posted: "${announcementTitle}"`,
                    courseId: courseId,
                    instructorId: user.uid,
                    read: false,
                    createdAt: serverTimestamp()
                };

                batchPromises.push(addDoc(notificationRef, notification));
            });

            await Promise.all(batchPromises);
        } catch (error) {
            console.error("Error creating notifications:", error);
            // Don't fail the announcement if notifications fail
        }
    };

    const getPriorityBadge = (priority) => {
        switch (priority) {
            case "urgent":
                return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Urgent</Badge>;
            case "important":
                return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Important</Badge>;
            default:
                return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Normal</Badge>;
        }
    };

    const getPriorityIcon = (priority) => {
        switch (priority) {
            case "urgent":
                return <AlertCircle className="h-4 w-4 text-red-600" />;
            case "important":
                return <Bell className="h-4 w-4 text-amber-600" />;
            default:
                return <Megaphone className="h-4 w-4 text-blue-600" />;
        }
    };

    const filteredAnnouncements = announcements.filter(ann => {
        if (activeTab === "all") return true;
        if (activeTab === "urgent") return ann.priority === "urgent";
        if (activeTab === "important") return ann.priority === "important";
        if (activeTab === "normal") return ann.priority === "normal" || !ann.priority;
        return true;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="mt-4">Loading announcements...</span>
            </div>
        );
    }

    const isPartnerInstructor = userData?.role === "partner_instructor";

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
                    {isPartnerInstructor && (
                        <Badge variant="outline" className="gap-1">
                            <Users className="h-3 w-3" />
                            Partner Instructor
                        </Badge>
                    )}
                </div>
                <p className="text-muted-foreground">
                    {isPartnerInstructor
                        ? "Send announcements to students in your assigned courses"
                        : "Communicate important updates with your students"}
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Create Announcement */}
                <Card className="md:col-span-2 lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Megaphone className="h-5 w-5 text-primary" />
                            Create New Announcement
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Course</label>
                                <Select
                                    value={formData.courseId}
                                    onValueChange={(value) => setFormData({ ...formData, courseId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a course" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courses.map(course => (
                                            <SelectItem key={course.id} value={course.id}>
                                                <div className="flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4 text-primary" />
                                                    <div>
                                                        <span>{course.title}</span>
                                                        {course.type === "assigned" && (
                                                            <span className="text-xs text-muted-foreground ml-2">
                                                                (Assigned)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Priority</label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="normal">
                                            <div className="flex items-center gap-2">
                                                <Megaphone className="h-4 w-4 text-blue-600" />
                                                <span>Normal</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="important">
                                            <div className="flex items-center gap-2">
                                                <Bell className="h-4 w-4 text-amber-600" />
                                                <span>Important</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="urgent">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4 text-red-600" />
                                                <span>Urgent</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Title</label>
                                <Input
                                    placeholder="e.g., New Assessment Released!"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    maxLength={100}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Message</label>
                                <Textarea
                                    placeholder="Write your announcement here..."
                                    className="min-h-[150px]"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    maxLength={1000}
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                    {formData.message.length}/1000 characters
                                </p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full gap-2"
                                disabled={submitting || !formData.title || !formData.message || !formData.courseId}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" />
                                        Post Announcement
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Past Announcements */}
                <Card className="md:col-span-2 lg:col-span-1">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-primary" />
                                Announcement History
                            </CardTitle>
                            <Badge variant="outline">
                                {announcements.length} total
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid grid-cols-4 mb-4">
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="urgent">Urgent</TabsTrigger>
                                <TabsTrigger value="important">Important</TabsTrigger>
                                <TabsTrigger value="normal">Normal</TabsTrigger>
                            </TabsList>

                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                {filteredAnnouncements.length === 0 ? (
                                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                        <Megaphone className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                                        <p className="text-muted-foreground font-medium">
                                            No announcements yet
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {activeTab !== "all"
                                                ? `No ${activeTab} announcements found`
                                                : "Create your first announcement to get started"}
                                        </p>
                                    </div>
                                ) : (
                                    filteredAnnouncements.map(ann => {
                                        const isMyCourse = courses.some(c => c.id === ann.courseId);

                                        return (
                                            <Card key={ann.id} className="relative">
                                                <CardContent className="p-4 space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-2">
                                                            {getPriorityIcon(ann.priority || "normal")}
                                                            <h3 className="font-semibold">{ann.title}</h3>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {getPriorityBadge(ann.priority || "normal")}
                                                            {!isMyCourse && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    Other Instructor
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-md">
                                                        {ann.message}
                                                    </p>

                                                    <div className="flex flex-wrap gap-4 pt-2 border-t text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <BookOpen className="h-3 w-3" />
                                                            <span className="truncate max-w-[150px]">
                                                                {ann.courseTitle}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            <span>
                                                                {ann.createdAt?.toDate().toLocaleDateString()} at{" "}
                                                                {ann.createdAt?.toDate().toLocaleTimeString([], {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })
                                )}
                            </div>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>

            {/* Info for Partner Instructors */}
            {isPartnerInstructor && assignedCourses.length > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                            <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-blue-800">Partner Instructor Information</h3>
                                <p className="text-sm text-blue-700 mt-1">
                                    You have access to {assignedCourses.length} assigned course{assignedCourses.length !== 1 ? 's' : ''}.
                                    Announcements you post will be visible to all students enrolled in the selected course.
                                </p>
                                <div className="mt-3 space-y-1">
                                    <p className="text-xs text-blue-600">
                                        • You can send announcements to students in your assigned courses
                                    </p>
                                    <p className="text-xs text-blue-600">
                                        • Students will receive notifications for your announcements
                                    </p>
                                    <p className="text-xs text-blue-600">
                                        • Use priority levels to highlight important messages
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}