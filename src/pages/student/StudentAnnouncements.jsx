import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Megaphone } from "lucide-react";

export default function StudentAnnouncements() {
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchAnnouncements();
        }
    }, [user]);

    const fetchAnnouncements = async () => {
        try {
            // 1. Get user's enrolled courses
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const enrolledCourseIds = userDoc.data()?.enrolledCourses || [];

            if (enrolledCourseIds.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Fetch announcements for these courses
            // Firestore 'in' query limited to 10. If user has > 10 courses, we need to batch or fetch all.
            // For MVP, assuming < 10 enrolled courses.
            const q = query(
                collection(db, "announcements"),
                where("courseId", "in", enrolledCourseIds.slice(0, 10))
            );

            const snap = await getDocs(q);
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort client-side to avoid needing a composite index
            data.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());

            setAnnouncements(data);

        } catch (error) {
            console.error("Error fetching announcements:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading announcements...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>

            <div className="space-y-4">
                {announcements.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No announcements from your instructors yet.
                        </CardContent>
                    </Card>
                ) : (
                    announcements.map(ann => (
                        <Card key={ann.id}>
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className="p-2 bg-primary/10 rounded-full">
                                    <Megaphone className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <CardTitle className="text-lg">{ann.title}</CardTitle>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <span className="font-medium text-foreground">{ann.courseTitle}</span>
                                        <span>•</span>
                                        <span>{ann.createdAt?.toDate().toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{ann.message}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
