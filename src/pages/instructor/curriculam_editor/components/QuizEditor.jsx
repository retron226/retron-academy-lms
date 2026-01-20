import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";

export default function QuizEditor({ module, setModule }) {
    const [quizQuestions, setQuizQuestions] = useState(module.quizData || []);
    const [currentQuestion, setCurrentQuestion] = useState({
        question: "",
        options: ["", "", "", ""],
        correctOption: 0,
        points: 1
    });

    const handleAddQuestion = () => {
        if (!currentQuestion.question.trim()) {
            alert("Please enter a question");
            return;
        }

        if (currentQuestion.options.some(opt => !opt.trim())) {
            alert("Please fill in all options");
            return;
        }

        setQuizQuestions([...quizQuestions, currentQuestion]);
        setModule({ ...module, quizData: [...quizQuestions, currentQuestion] });
        setCurrentQuestion({
            question: "",
            options: ["", "", "", ""],
            correctOption: 0,
            points: 1
        });
    };

    const handleRemoveQuestion = (index) => {
        const newQuestions = quizQuestions.filter((_, i) => i !== index);
        setQuizQuestions(newQuestions);
        setModule({ ...module, quizData: newQuestions });
    };

    const handleUpdateQuestion = (index, field, value) => {
        const newQuestions = [...quizQuestions];
        newQuestions[index][field] = value;
        setQuizQuestions(newQuestions);
        setModule({ ...module, quizData: newQuestions });
    };

    const handleUpdateOption = (qIndex, oIndex, value) => {
        const newQuestions = [...quizQuestions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuizQuestions(newQuestions);
        setModule({ ...module, quizData: newQuestions });
    };

    return (
        <div className="space-y-6">
            {/* Add Question Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Add Question</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Question Text</label>
                        <Input
                            placeholder="Enter your question here..."
                            value={currentQuestion.question}
                            onChange={(e) => setCurrentQuestion({
                                ...currentQuestion,
                                question: e.target.value
                            })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Options</label>
                        <div className="grid grid-cols-2 gap-3">
                            {currentQuestion.options.map((opt, idx) => (
                                <div key={idx} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="correctOption"
                                            checked={currentQuestion.correctOption === idx}
                                            onChange={() => setCurrentQuestion({
                                                ...currentQuestion,
                                                correctOption: idx
                                            })}
                                            className="h-4 w-4"
                                        />
                                        <span className="text-sm font-medium">
                                            Option {String.fromCharCode(65 + idx)}
                                        </span>
                                    </div>
                                    <Input
                                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                        value={opt}
                                        onChange={(e) => {
                                            const newOptions = [...currentQuestion.options];
                                            newOptions[idx] = e.target.value;
                                            setCurrentQuestion({
                                                ...currentQuestion,
                                                options: newOptions
                                            });
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Points</label>
                        <Input
                            type="number"
                            min="1"
                            max="10"
                            value={currentQuestion.points}
                            onChange={(e) => setCurrentQuestion({
                                ...currentQuestion,
                                points: parseInt(e.target.value) || 1
                            })}
                            className="w-24"
                        />
                    </div>

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                            type="button"
                            onClick={handleAddQuestion}
                            className="w-full"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Question
                        </Button>
                    </motion.div>
                </CardContent>
            </Card>

            {/* Questions List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">
                        Questions ({quizQuestions.length})
                    </h3>
                    {quizQuestions.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                            Total Points: {quizQuestions.reduce((sum, q) => sum + q.points, 0)}
                        </span>
                    )}
                </div>

                <AnimatePresence>
                    {quizQuestions.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-8 border-2 border-dashed rounded-lg"
                        >
                            <p className="text-muted-foreground">No questions added yet</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Add questions using the form above
                            </p>
                        </motion.div>
                    ) : (
                        <div className="space-y-4">
                            {quizQuestions.map((q, idx) => (
                                <QuestionItem
                                    key={idx}
                                    question={q}
                                    index={idx}
                                    onUpdateQuestion={handleUpdateQuestion}
                                    onUpdateOption={handleUpdateOption}
                                    onRemove={() => handleRemoveQuestion(idx)}
                                />
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function QuestionItem({ question, index, onUpdateQuestion, onUpdateOption, onRemove }) {
    const [editing, setEditing] = useState(false);
    const [editQuestion, setEditQuestion] = useState(question);

    const handleSave = () => {
        onUpdateQuestion(index, "question", editQuestion.question);
        onUpdateQuestion(index, "correctOption", editQuestion.correctOption);
        onUpdateQuestion(index, "points", editQuestion.points);
        editQuestion.options.forEach((opt, optIdx) => {
            onUpdateOption(index, optIdx, opt);
        });
        setEditing(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="border rounded-lg p-4 bg-card"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-primary">Q{index + 1}</span>
                        <span className="text-sm px-2 py-1 bg-primary/10 text-primary rounded-full">
                            {question.points} point{question.points !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {editing ? (
                        <div className="space-y-3">
                            <Input
                                value={editQuestion.question}
                                onChange={(e) => setEditQuestion({
                                    ...editQuestion,
                                    question: e.target.value
                                })}
                                className="font-medium"
                            />

                            <div className="grid grid-cols-2 gap-2">
                                {editQuestion.options.map((opt, optIdx) => (
                                    <div key={optIdx} className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name={`edit-correct-${index}`}
                                                checked={editQuestion.correctOption === optIdx}
                                                onChange={() => setEditQuestion({
                                                    ...editQuestion,
                                                    correctOption: optIdx
                                                })}
                                                className="h-4 w-4"
                                            />
                                            <span className="text-sm font-medium">
                                                {String.fromCharCode(65 + optIdx)}
                                            </span>
                                        </div>
                                        <Input
                                            value={opt}
                                            onChange={(e) => {
                                                const newOptions = [...editQuestion.options];
                                                newOptions[optIdx] = e.target.value;
                                                setEditQuestion({
                                                    ...editQuestion,
                                                    options: newOptions
                                                });
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium">Points:</label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={editQuestion.points}
                                    onChange={(e) => setEditQuestion({
                                        ...editQuestion,
                                        points: parseInt(e.target.value) || 1
                                    })}
                                    className="w-20"
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="font-medium mb-3">{question.question}</p>
                            <div className="grid grid-cols-2 gap-2">
                                {question.options.map((opt, optIdx) => (
                                    <div
                                        key={optIdx}
                                        className={`p-2 rounded border ${question.correctOption === optIdx
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-muted/30'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                                {String.fromCharCode(65 + optIdx)}.
                                            </span>
                                            <span>{opt}</span>
                                            {question.correctOption === optIdx && (
                                                <span className="text-xs text-green-600 font-medium ml-auto">
                                                    ✓ Correct
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 ml-4">
                    {editing ? (
                        <>
                            <Button size="sm" variant="outline" onClick={handleSave}>
                                Save
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    setEditQuestion(question);
                                    setEditing(false);
                                }}
                            >
                                Cancel
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditing(true)}
                            >
                                Edit
                            </Button>
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive/90"
                                    onClick={onRemove}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </motion.div>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
}