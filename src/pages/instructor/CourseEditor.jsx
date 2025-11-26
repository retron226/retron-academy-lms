import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, storage } from "../../lib/firebase";
import { doc, getDoc, setDoc, updateDoc, addDoc, collection } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import CurriculumEditor from "./CurriculumEditor";

export default function CourseEditor() {
    const { courseId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const isNew = !courseId;

    const [loading, setLoading] = useState(false);
    const [course, setCourse] = useState({
        title: "",
        description: "",
        thumbnailUrl: "",
        accessCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        instructorId: user?.uid,
        createdAt: new Date().toISOString(),
    });
    const [thumbnailFile, setThumbnailFile] = useState(null);

    useEffect(() => {
        if (!isNew && user) {
            fetchCourse();
        }
    }, [courseId, user]);

    const fetchCourse = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, "courses", courseId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setCourse({ id: docSnap.id, ...docSnap.data() });
            } else {
                navigate("/instructor/courses");
            }
        } catch (error) {
            console.error("Error fetching course:", error);
        } finally {
            setLoading(false);
        }
    };

    const uploadToCloudinary = async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "elearning-lms");
        formData.append("cloud_name", "djiplqjqu");

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/djiplqjqu/image/upload`,
                {
                    method: "POST",
                    body: formData,
                }
            );
            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            console.error("Error uploading to Cloudinary:", error);
            throw error;
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let url = course.thumbnailUrl;
            if (thumbnailFile) {
                url = await uploadToCloudinary(thumbnailFile);
            }

            const courseData = {
                ...course,
                thumbnailUrl: url,
                instructorId: user.uid,
            };

            if (isNew) {
                await addDoc(collection(db, "courses"), courseData);
            } else {
                await updateDoc(doc(db, "courses", courseId), courseData);
            }

            navigate("/instructor/courses");
        } catch (error) {
            console.error("Error saving course:", error);
            alert("Failed to save course");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !isNew && !course.id) return <div>Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate("/instructor/courses")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">
                    {isNew ? "Create Course" : "Edit Course"}
                </h1>
            </div>

            <form id="course-form" onSubmit={handleSave} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Course Title</label>
                            <Input
                                required
                                value={course.title}
                                onChange={(e) => setCourse({ ...course, title: e.target.value })}
                                placeholder="e.g. Advanced React Patterns"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <textarea
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={course.description}
                                onChange={(e) => setCourse({ ...course, description: e.target.value })}
                                placeholder="Course description..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Access Code</label>
                            <div className="flex gap-2">
                                <Input
                                    value={course.accessCode}
                                    onChange={(e) => setCourse({ ...course, accessCode: e.target.value })}
                                    placeholder="ACCESS-CODE"
                                    readOnly
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCourse({ ...course, accessCode: Math.random().toString(36).substring(2, 8).toUpperCase() })}
                                >
                                    Generate
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Share this code with students to allow them to enroll.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Thumbnail Image</label>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setThumbnailFile(e.target.files[0])}
                            />
                            {(course.thumbnailUrl || thumbnailFile) && (
                                <div className="mt-2 aspect-video w-40 overflow-hidden rounded-md bg-muted">
                                    <img
                                        src={thumbnailFile ? URL.createObjectURL(thumbnailFile) : course.thumbnailUrl}
                                        alt="Preview"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </form>

            {!isNew && <CurriculumEditor courseId={courseId} />}

            <div className="flex justify-end pb-10">
                <Button type="submit" form="course-form" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isNew ? "Create Course" : "Save Changes"}
                </Button>
            </div>
        </div>
    );
}
