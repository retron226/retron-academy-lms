import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Plus, FileText, Trash2, BarChart } from "lucide-react";

export default function InstructorAssessments() {
    const { user } = useAuth();
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchAssessments();
        }
    }, [user]);

    const fetchAssessments = async () => {
        try {
            const q = query(collection(db, "assessments"), where("instructorId", "==", user.uid));
            const snap = await getDocs(q);
            setAssessments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching assessments:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure? This will delete the assessment and all student results.")) {
            try {
                await deleteDoc(doc(db, "assessments", id));
                setAssessments(assessments.filter(a => a.id !== id));
            } catch (error) {
                console.error("Error deleting assessment:", error);
            }
        }
    };

    if (loading) return <div>Loading assessments...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
                <Link to="new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Create Assessment
                    </Button>
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {assessments.map((assessment) => (
                    <Card key={assessment.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="line-clamp-1">{assessment.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-4">
                            <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                                {assessment.description || "No description"}
                            </p>
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>{assessment.questions?.length || 0} Questions</span>
                                <span className="font-mono bg-muted px-2 py-1 rounded text-xs">
                                    {assessment.accessCode}
                                </span>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Link to={`edit/${assessment.id}`} className="flex-1">
                                    <Button variant="outline" className="w-full">
                                        <FileText className="mr-2 h-4 w-4" /> Edit
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
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {assessments.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        No assessments created yet. Click "Create Assessment" to get started.
                    </div>
                )}
            </div>
        </div>
    );
}
