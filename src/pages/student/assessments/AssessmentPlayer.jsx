import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Loader2, CheckCircle } from "lucide-react";

export default function AssessmentPlayer() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [assessment, setAssessment] = useState(null);
    const [answers, setAnswers] = useState({}); // { questionIndex: optionIndex }
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchAssessment();
    }, [id]);

    const fetchAssessment = async () => {
        try {
            const docSnap = await getDoc(doc(db, "assessments", id));
            if (docSnap.exists()) {
                setAssessment({ id: docSnap.id, ...docSnap.data() });
            } else {
                navigate("/student/assessments");
            }
        } catch (error) {
            console.error("Error fetching assessment:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (qIndex, oIndex) => {
        setAnswers(prev => ({ ...prev, [qIndex]: oIndex }));
    };

    const handleSubmit = async () => {
        if (!window.confirm("Are you sure you want to submit? You cannot change your answers later.")) return;
        setSubmitting(true);

        try {
            // Calculate score
            let score = 0;
            assessment.questions.forEach((q, i) => {
                if (answers[i] === parseInt(q.correctAnswer)) {
                    score++;
                }
            });

            await setDoc(doc(db, "assessments", id, "submissions", user.uid), {
                studentId: user.uid,
                studentEmail: user.email,
                studentName: user.displayName || user.email,
                answers: answers,
                score: score,
                submittedAt: new Date().toISOString()
            });

            alert(`Submitted! Your score: ${score}/${assessment.questions.length}`);
            navigate("/student/assessments");
        } catch (error) {
            console.error("Error submitting:", error);
            alert("Failed to submit.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div>Loading quiz...</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-20">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">{assessment.title}</h1>
                <p className="text-muted-foreground">{assessment.description}</p>
            </div>

            {assessment.questions.map((q, qIndex) => (
                <Card key={qIndex}>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            <span className="mr-2 text-muted-foreground">{qIndex + 1}.</span>
                            {q.text}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {q.options.map((opt, oIndex) => (
                            <div
                                key={oIndex}
                                onClick={() => handleSelect(qIndex, oIndex)}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${answers[qIndex] === oIndex
                                        ? "border-primary bg-primary/5"
                                        : "hover:bg-muted"
                                    }`}
                            >
                                <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${answers[qIndex] === oIndex ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                                    }`}>
                                    {answers[qIndex] === oIndex && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
                                </div>
                                <span>{opt}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-end gap-4 md:pl-64">
                <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={submitting || Object.keys(answers).length < assessment.questions.length}
                >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Assessment
                </Button>
            </div>
        </div>
    );
}
