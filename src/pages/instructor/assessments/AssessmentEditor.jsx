import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../lib/firebase";
import { doc, getDoc, setDoc, addDoc, collection, updateDoc } from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import {
    Loader2,
    Save,
    ArrowLeft,
    Plus,
    Trash2,
    Download,
    CheckSquare,
    Square,
    Type
} from "lucide-react";
import jsPDF from "jspdf";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "../../../components/ui/select";
import { Checkbox } from "../../../components/ui/checkbox";

// Question type constants
const QUESTION_TYPES = {
    SINGLE_CHOICE: "single",
    MULTIPLE_CHOICE: "multiple",
    PARAGRAPH: "paragraph"
};

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
        questions: [], // { id, text, type, options: [], correctAnswers: [], correctAnswer (for single) }
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
                const data = docSnap.data();
                // Ensure questions have type field (default to single choice for backward compatibility)
                const questions = data.questions?.map(q => ({
                    ...q,
                    type: q.type || QUESTION_TYPES.SINGLE_CHOICE,
                    correctAnswers: q.correctAnswers || (q.correctAnswer !== undefined ? [q.correctAnswer] : [])
                })) || [];

                setAssessment({
                    id: docSnap.id,
                    ...data,
                    questions
                });
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
            // Prepare data for Firestore
            const data = {
                ...assessment,
                instructorId: user.uid,
                questions: assessment.questions.map(q => ({
                    id: q.id,
                    text: q.text,
                    type: q.type,
                    options: q.options || [],
                    correctAnswer: q.type === QUESTION_TYPES.SINGLE_CHOICE ? q.correctAnswer : null,
                    correctAnswers: q.type === QUESTION_TYPES.MULTIPLE_CHOICE ? q.correctAnswers : [],
                    // For paragraph type, no correct answers needed
                }))
            };

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

    const addQuestion = (type = QUESTION_TYPES.SINGLE_CHOICE) => {
        const newQuestion = {
            id: Date.now(),
            text: "",
            type: type,
        };

        // Set initial structure based on question type
        if (type === QUESTION_TYPES.PARAGRAPH) {
            // Paragraph questions don't need options or correct answers
            setAssessment(prev => ({
                ...prev,
                questions: [...prev.questions, newQuestion]
            }));
        } else {
            // For single and multiple choice, add options
            setAssessment(prev => ({
                ...prev,
                questions: [
                    ...prev.questions,
                    {
                        ...newQuestion,
                        options: ["", "", "", ""],
                        correctAnswer: type === QUESTION_TYPES.SINGLE_CHOICE ? 0 : null,
                        correctAnswers: type === QUESTION_TYPES.MULTIPLE_CHOICE ? [] : null
                    }
                ]
            }));
        }
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

    const addOption = (qIndex) => {
        const newQuestions = [...assessment.questions];
        newQuestions[qIndex].options.push("");
        setAssessment({ ...assessment, questions: newQuestions });
    };

    const removeOption = (qIndex, oIndex) => {
        const newQuestions = [...assessment.questions];
        const question = newQuestions[qIndex];

        // Remove the option
        question.options.splice(oIndex, 1);

        // Update correct answers if needed
        if (question.type === QUESTION_TYPES.SINGLE_CHOICE) {
            if (question.correctAnswer === oIndex) {
                question.correctAnswer = 0; // Reset to first option
            } else if (question.correctAnswer > oIndex) {
                question.correctAnswer -= 1;
            }
        } else if (question.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
            question.correctAnswers = question.correctAnswers
                .filter(ans => ans !== oIndex)
                .map(ans => ans > oIndex ? ans - 1 : ans);
        }

        setAssessment({ ...assessment, questions: newQuestions });
    };

    const handleCorrectAnswerChange = (qIndex, answerIndex) => {
        const question = assessment.questions[qIndex];

        if (question.type === QUESTION_TYPES.SINGLE_CHOICE) {
            updateQuestion(qIndex, "correctAnswer", answerIndex);
        } else if (question.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
            const newCorrectAnswers = [...(question.correctAnswers || [])];
            const answerIndexNum = Number(answerIndex);

            if (newCorrectAnswers.includes(answerIndexNum)) {
                // Remove if already selected
                const index = newCorrectAnswers.indexOf(answerIndexNum);
                newCorrectAnswers.splice(index, 1);
            } else {
                // Add if not selected
                newCorrectAnswers.push(answerIndexNum);
            }

            updateQuestion(qIndex, "correctAnswers", newCorrectAnswers.sort((a, b) => a - b));
        }
    };

    const removeQuestion = (index) => {
        const newQuestions = assessment.questions.filter((_, i) => i !== index);
        setAssessment({ ...assessment, questions: newQuestions });
    };

    const changeQuestionType = (index, newType) => {
        const newQuestions = [...assessment.questions];
        const question = newQuestions[index];

        question.type = newType;

        if (newType === QUESTION_TYPES.PARAGRAPH) {
            // Remove options for paragraph type
            delete question.options;
            delete question.correctAnswer;
            delete question.correctAnswers;
        } else {
            // Add default options if not present
            if (!question.options) {
                question.options = ["", "", "", ""];
            }

            if (newType === QUESTION_TYPES.SINGLE_CHOICE) {
                question.correctAnswer = question.correctAnswer !== undefined ? question.correctAnswer : 0;
                delete question.correctAnswers;
            } else if (newType === QUESTION_TYPES.MULTIPLE_CHOICE) {
                question.correctAnswers = question.correctAnswers || [];
                delete question.correctAnswer;
            }
        }

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

            if (q.type === QUESTION_TYPES.PARAGRAPH) {
                doc.text("Answer: ___________________________", 15, y);
                y += 10;
            } else {
                q.options.forEach((opt, j) => {
                    let prefix = "";
                    if (q.type === QUESTION_TYPES.SINGLE_CHOICE && j === parseInt(q.correctAnswer)) {
                        prefix = "(Correct) ";
                    } else if (q.type === QUESTION_TYPES.MULTIPLE_CHOICE && q.correctAnswers?.includes(j)) {
                        prefix = "(Correct) ";
                    }
                    doc.text(`${String.fromCharCode(65 + j)}. ${opt} ${prefix}`, 15, y);
                    y += 6;
                });
            }
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
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                required
                                value={assessment.title}
                                onChange={(e) => setAssessment({ ...assessment, title: e.target.value })}
                                placeholder="e.g. Final Exam"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={assessment.description}
                                onChange={(e) => setAssessment({ ...assessment, description: e.target.value })}
                                placeholder="Assessment description..."
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Questions</h2>
                    </div>

                    {/* Question Type Selector */}
                    <div className="flex gap-2 mb-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => addQuestion(QUESTION_TYPES.SINGLE_CHOICE)}
                            className="flex items-center gap-2"
                        >
                            <Square className="h-4 w-4" />
                            Single Choice
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => addQuestion(QUESTION_TYPES.MULTIPLE_CHOICE)}
                            className="flex items-center gap-2"
                        >
                            <CheckSquare className="h-4 w-4" />
                            Multiple Choice
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => addQuestion(QUESTION_TYPES.PARAGRAPH)}
                            className="flex items-center gap-2"
                        >
                            <Type className="h-4 w-4" />
                            Paragraph
                        </Button>
                    </div>

                    {assessment.questions.map((q, qIndex) => (
                        <Card key={q.id}>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex flex-col gap-2">
                                        <span className="font-bold pt-2">Q{qIndex + 1}</span>
                                        <Select
                                            value={q.type}
                                            onValueChange={(value) => changeQuestionType(qIndex, value)}
                                        >
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue placeholder="Type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={QUESTION_TYPES.SINGLE_CHOICE}>
                                                    <div className="flex items-center gap-2">
                                                        <Square className="h-3 w-3" />
                                                        Single Choice
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value={QUESTION_TYPES.MULTIPLE_CHOICE}>
                                                    <div className="flex items-center gap-2">
                                                        <CheckSquare className="h-3 w-3" />
                                                        Multiple Choice
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value={QUESTION_TYPES.PARAGRAPH}>
                                                    <div className="flex items-center gap-2">
                                                        <Type className="h-3 w-3" />
                                                        Paragraph
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <Input
                                            placeholder="Question text"
                                            value={q.text}
                                            onChange={(e) => updateQuestion(qIndex, "text", e.target.value)}
                                            required
                                        />

                                        {q.type === QUESTION_TYPES.PARAGRAPH ? (
                                            <div className="space-y-2">
                                                <Label>Answer Format</Label>
                                                <div className="p-4 border rounded-md bg-gray-50">
                                                    <p className="text-gray-600">Paragraph answer field will be shown to students</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-2">
                                                    <Label>Options</Label>
                                                    <div className="space-y-3">
                                                        {q.options.map((opt, oIndex) => (
                                                            <div key={oIndex} className="flex gap-2 items-center">
                                                                {q.type === QUESTION_TYPES.SINGLE_CHOICE ? (
                                                                    <input
                                                                        type="radio"
                                                                        name={`correct-${q.id}`}
                                                                        checked={parseInt(q.correctAnswer) === oIndex}
                                                                        onChange={() => handleCorrectAnswerChange(qIndex, oIndex)}
                                                                        className="h-4 w-4"
                                                                    />
                                                                ) : (
                                                                    <Checkbox
                                                                        checked={q.correctAnswers?.includes(oIndex) || false}
                                                                        onCheckedChange={() => handleCorrectAnswerChange(qIndex, oIndex)}
                                                                    />
                                                                )}
                                                                <Input
                                                                    placeholder={`Option ${oIndex + 1}`}
                                                                    value={opt}
                                                                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                                                    required
                                                                />
                                                                {q.options.length > 2 && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-destructive"
                                                                        onClick={() => removeOption(qIndex, oIndex)}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {q.options.length < 6 && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => addOption(qIndex)}
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        Add Option
                                                    </Button>
                                                )}
                                            </>
                                        )}
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

                    {assessment.questions.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg">
                            <p className="text-gray-500 mb-4">No questions added yet</p>
                            <p className="text-sm text-gray-400">Use the buttons above to add questions</p>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}