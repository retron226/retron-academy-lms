import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Loader2, FileText, CheckCircle } from "lucide-react";

export default function StudentAssessments() {
    const { user, userData } = useAuth();
    const [enrolledAssessments, setEnrolledAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [accessCode, setAccessCode] = useState("");
    const [enrolling, setEnrolling] = useState(false);

    useEffect(() => {
        if (userData) {
            fetchEnrolledAssessments();
        }
    }, [userData]);

    const fetchEnrolledAssessments = async () => {
        try {
            if (!userData.enrolledAssessments || userData.enrolledAssessments.length === 0) {
                setEnrolledAssessments([]);
                setLoading(false);
                return;
            }

            const promises = userData.enrolledAssessments.map(async (id) => {
                const docSnap = await getDoc(doc(db, "assessments", id));
                if (!docSnap.exists()) return null;

                // Check if submitted
                const subSnap = await getDoc(doc(db, "assessments", id, "submissions", user.uid));
                return {
                    id: docSnap.id,
                    ...docSnap.data(),
                    submitted: subSnap.exists(),
                    score: subSnap.exists() ? subSnap.data().score : null
                };
            });

            const results = await Promise.all(promises);
            setEnrolledAssessments(results.filter(a => a !== null));
        } catch (error) {
            console.error("Error fetching assessments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEnroll = async (e) => {
        e.preventDefault();
        if (!accessCode.trim()) return;
        setEnrolling(true);

        try {
            const q = query(collection(db, "assessments"), where("accessCode", "==", accessCode.trim().toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("Invalid access code.");
                setEnrolling(false);
                return;
            }

            const assessmentDoc = querySnapshot.docs[0];
            const assessmentId = assessmentDoc.id;

            if (userData.enrolledAssessments?.includes(assessmentId)) {
                alert("Already enrolled.");
                setEnrolling(false);
                return;
            }

            await updateDoc(doc(db, "users", user.uid), {
                enrolledAssessments: arrayUnion(assessmentId)
            });

            // Refresh
            window.location.reload(); // Simple reload to refresh auth context data
        } catch (error) {
            console.error("Error enrolling:", error);
            alert("Failed to enroll.");
        } finally {
            setEnrolling(false);
        }
    };

    if (loading) return <div>Loading assessments...</div>;

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Enroll in Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleEnroll} className="flex gap-4 max-w-md">
                        <Input
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            placeholder="Enter Access Code"
                            className="uppercase"
                        />
                        <Button type="submit" disabled={enrolling}>
                            {enrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enroll
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {enrolledAssessments.map((assessment) => (
                    <Card key={assessment.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="line-clamp-1">{assessment.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-4">
                            <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                                {assessment.description}
                            </p>
                            <div className="flex items-center justify-between text-sm">
                                <span>{assessment.questions?.length || 0} Questions</span>
                                {assessment.submitted ? (
                                    <span className="text-green-600 font-medium flex items-center gap-1">
                                        <CheckCircle className="h-4 w-4" /> Score: {assessment.score}
                                    </span>
                                ) : (
                                    <span className="text-amber-600">Pending</span>
                                )}
                            </div>
                            {assessment.submitted ? (
                                <Button disabled variant="secondary" className="w-full">
                                    Completed
                                </Button>
                            ) : (
                                <Link to={`${assessment.id}`}>
                                    <Button className="w-full">
                                        <FileText className="mr-2 h-4 w-4" /> Start Quiz
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
