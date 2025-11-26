import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Megaphone, Send } from "lucide-react";

export default function InstructorAnnouncements() {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        courseId: "",
        title: "",
        message: ""
    });

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            // 1. Fetch my courses
            const qCourses = query(collection(db, "courses"), where("instructorId", "==", user.uid));
            const coursesSnap = await getDocs(qCourses);
            const coursesData = coursesSnap.docs.map(doc => ({ id: doc.id, title: doc.data().title }));
            setCourses(coursesData);

            if (coursesData.length > 0) {
                setFormData(prev => ({ ...prev, courseId: coursesData[0].id }));
                fetchAnnouncements(coursesData.map(c => c.id));
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
            setLoading(false);
        }
    };

    const fetchAnnouncements = async (courseIds) => {
        try {
            // Firestore 'in' query is limited to 10. For now, let's just fetch all announcements where instructorId matches
            // Ideally we store instructorId on the announcement for easier querying
            const q = query(
                collection(db, "announcements"),
                where("instructorId", "==", user.uid)
            );
            const snap = await getDocs(q);
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
            setAnnouncements(data);
        } catch (error) {
            console.error("Error fetching announcements:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.message || !formData.courseId) return;

        try {
            const course = courses.find(c => c.id === formData.courseId);

            await addDoc(collection(db, "announcements"), {
                courseId: formData.courseId,
                courseTitle: course?.title || "Unknown Course",
                instructorId: user.uid,
                instructorName: user.email, // Or display name if available
                title: formData.title,
                message: formData.message,
                createdAt: serverTimestamp()
            });

            setFormData(prev => ({ ...prev, title: "", message: "" }));
            fetchAnnouncements(courses.map(c => c.id)); // Refresh list
            alert("Announcement sent!");
        } catch (error) {
            console.error("Error sending announcement:", error);
            alert("Failed to send announcement.");
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Create Announcement */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Megaphone className="h-5 w-5" />
                            New Announcement
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Course</label>
                                <select
                                    className="w-full p-2 border rounded-md bg-background"
                                    value={formData.courseId}
                                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                                >
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Title</label>
                                <Input
                                    placeholder="e.g., New Module Released!"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Message</label>
                                <Textarea
                                    placeholder="Write your update here..."
                                    className="min-h-[100px]"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                <Send className="mr-2 h-4 w-4" /> Post Announcement
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Past Announcements */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">History</h2>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {announcements.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No announcements yet.</p>
                        ) : (
                            announcements.map(ann => (
                                <Card key={ann.id}>
                                    <CardContent className="p-4 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-semibold">{ann.title}</h3>
                                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                                {ann.courseTitle}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ann.message}</p>
                                        <p className="text-xs text-muted-foreground pt-2 border-t mt-2">
                                            Posted on {ann.createdAt?.toDate().toLocaleDateString()}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
