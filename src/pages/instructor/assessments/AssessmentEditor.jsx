import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../lib/firebase";
import { doc, getDoc, setDoc, addDoc, collection, updateDoc } from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Loader2, Save, ArrowLeft, Plus, Trash2, Download } from "lucide-react";
import jsPDF from "jspdf";

export default function AssessmentEditor() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const isNew = !id;

    const [loading, setLoading] = useState(false);
    const [assessment, setAssessment] = useState({
        title: "",
        description: "",
        accessCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        instructorId: user?.uid,
        questions: [], // { id, text, options: [], correctAnswer }
        createdAt: new Date().toISOString(),
    });

    useEffect(() => {
        if (!isNew && user) {
            fetchAssessment();
        }
    }, [id, user]);

    const fetchAssessment = async () => {
        setLoading(true);
        try {
            const docSnap = await getDoc(doc(db, "assessments", id));
            if (docSnap.exists()) {
                setAssessment({ id: docSnap.id, ...docSnap.data() });
            } else {
                navigate("/instructor/assessments");
            }
        } catch (error) {
            console.error("Error fetching assessment:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = { ...assessment, instructorId: user.uid };
            if (isNew) {
                await addDoc(collection(db, "assessments"), data);
            } else {
                await updateDoc(doc(db, "assessments", id), data);
            }
            navigate("/instructor/assessments");
        } catch (error) {
            console.error("Error saving assessment:", error);
            alert("Failed to save assessment");
        } finally {
            setLoading(false);
        }
    };

    const addQuestion = () => {
        setAssessment(prev => ({
            ...prev,
            questions: [
                ...prev.questions,
                {
                    id: Date.now(),
                    text: "",
                    options: ["", "", "", ""],
                    correctAnswer: 0 // Index of correct option
                }
            ]
        }));
    };

    const updateQuestion = (index, field, value) => {
        const newQuestions = [...assessment.questions];
        newQuestions[index][field] = value;
        setAssessment({ ...assessment, questions: newQuestions });
    };

    const updateOption = (qIndex, oIndex, value) => {
        const newQuestions = [...assessment.questions];
        newQuestions[qIndex].options[oIndex] = value;
        setAssessment({ ...assessment, questions: newQuestions });
    };

    const removeQuestion = (index) => {
        const newQuestions = assessment.questions.filter((_, i) => i !== index);
        setAssessment({ ...assessment, questions: newQuestions });
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(assessment.title, 10, 10);
        doc.setFontSize(12);
        doc.text(`Access Code: ${assessment.accessCode}`, 10, 20);

        let y = 30;
        assessment.questions.forEach((q, i) => {
            if (y > 270) { doc.addPage(); y = 10; }

            doc.setFont(undefined, 'bold');
            doc.text(`Q${i + 1}: ${q.text}`, 10, y);
            y += 7;

            doc.setFont(undefined, 'normal');
            q.options.forEach((opt, j) => {
                const isCorrect = j === parseInt(q.correctAnswer);
                const prefix = isCorrect ? "(Correct) " : "";
                doc.text(`${String.fromCharCode(65 + j)}. ${opt} ${prefix}`, 15, y);
                y += 6;
            });
            y += 5;
        });

        doc.save(`${assessment.title.replace(/\s+/g, '_')}_Questions.pdf`);
    };

    if (loading && !isNew && !assessment.id) return <div>Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate("/instructor/assessments")}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {isNew ? "Create Assessment" : "Edit Assessment"}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    {!isNew && (
                        <Button variant="outline" onClick={exportPDF}>
                            <Download className="mr-2 h-4 w-4" /> Export PDF
                        </Button>
                    )}
                    <Button type="submit" form="assessment-form" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Assessment
                    </Button>
                </div>
            </div>

            <form id="assessment-form" onSubmit={handleSave} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title</label>
                            <Input
                                required
                                value={assessment.title}
                                onChange={(e) => setAssessment({ ...assessment, title: e.target.value })}
                                placeholder="e.g. Final Exam"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                                value={assessment.description}
                                onChange={(e) => setAssessment({ ...assessment, description: e.target.value })}
                                placeholder="Assessment description..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Access Code</label>
                            <div className="flex gap-2">
                                <Input
                                    value={assessment.accessCode}
                                    readOnly
                                    className="font-mono"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setAssessment({ ...assessment, accessCode: Math.random().toString(36).substring(2, 8).toUpperCase() })}
                                >
                                    Generate
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Questions</h2>
                    </div>

                    {assessment.questions.map((q, qIndex) => (
                        <Card key={q.id}>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex gap-4">
                                    <span className="font-bold pt-2">Q{qIndex + 1}</span>
                                    <div className="flex-1 space-y-4">
                                        <Input
                                            placeholder="Question text"
                                            value={q.text}
                                            onChange={(e) => updateQuestion(qIndex, "text", e.target.value)}
                                            required
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {q.options.map((opt, oIndex) => (
                                                <div key={oIndex} className="flex gap-2 items-center">
                                                    <input
                                                        type="radio"
                                                        name={`correct-${q.id}`}
                                                        checked={parseInt(q.correctAnswer) === oIndex}
                                                        onChange={() => updateQuestion(qIndex, "correctAnswer", oIndex)}
                                                        className="h-4 w-4"
                                                    />
                                                    <Input
                                                        placeholder={`Option ${oIndex + 1}`}
                                                        value={opt}
                                                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                                        required
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive"
                                        onClick={() => removeQuestion(qIndex)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <Button type="button" variant="outline" className="w-full border-dashed" onClick={addQuestion}>
                        <Plus className="mr-2 h-4 w-4" /> Add Question
                    </Button>
                </div>
            </form>


        </div>
    );
}
