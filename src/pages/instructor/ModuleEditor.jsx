import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase";
import { Loader2, X } from "lucide-react";

export default function ModuleEditor({ isOpen, onClose, onSave, initialData }) {
    const [module, setModule] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [videoUrl, setVideoUrl] = useState("");

    // Quiz State
    const [quizQuestions, setQuizQuestions] = useState(initialData.quizData || []);
    const [currentQuestion, setCurrentQuestion] = useState({ question: "", options: ["", "", "", ""], correctOption: 0 });

    if (!isOpen) return null;

    const handleAddQuestion = () => {
        if (!currentQuestion.question.trim()) return;
        setQuizQuestions([...quizQuestions, currentQuestion]);
        setCurrentQuestion({ question: "", options: ["", "", "", ""], correctOption: 0 });
    };

    const handleRemoveQuestion = (index) => {
        setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let content = module.content;
            let quizData = null;

            if (module.type === 'video' && videoUrl) {
                content = videoUrl;
            }

            if (module.type === 'quiz') {
                quizData = quizQuestions;
                content = "Quiz Module"; // Placeholder content for quiz type
            }

            onSave({ ...module, content, quizData });
        } catch (error) {
            console.error("Error saving module:", error);
            alert("Failed to save module");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background w-full max-w-lg rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">
                        {module.type === 'video' && "Add Video Lesson"}
                        {module.type === 'text' && "Add Text Lesson"}
                        {module.type === 'quiz' && "Add Quiz"}
                    </h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Title</label>
                        <Input
                            required
                            value={module.title}
                            onChange={(e) => setModule({ ...module, title: e.target.value })}
                            placeholder="Module Title"
                        />
                    </div>

                    {module.type === 'video' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">YouTube Video URL</label>
                            <Input
                                value={videoUrl || module.content}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                            />
                            {(module.content || videoUrl) && (
                                <p className="text-xs text-muted-foreground">
                                    Current video: {videoUrl || module.content}
                                </p>
                            )}
                        </div>
                    )}

                    {module.type === 'text' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Content (Markdown)</label>
                            <textarea
                                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={module.content}
                                onChange={(e) => setModule({ ...module, content: e.target.value })}
                                placeholder="# Lesson Content..."
                            />
                        </div>
                    )}

                    {module.type === 'quiz' && (
                        <div className="space-y-4">
                            <div className="border p-4 rounded-md space-y-4">
                                <h3 className="font-semibold">Add Question</h3>
                                <Input
                                    placeholder="Question Text"
                                    value={currentQuestion.question}
                                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    {currentQuestion.options.map((opt, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                type="radio"
                                                name="correctOption"
                                                checked={currentQuestion.correctOption === idx}
                                                onChange={() => setCurrentQuestion({ ...currentQuestion, correctOption: idx })}
                                            />
                                            <Input
                                                placeholder={`Option ${idx + 1}`}
                                                value={opt}
                                                onChange={(e) => {
                                                    const newOptions = [...currentQuestion.options];
                                                    newOptions[idx] = e.target.value;
                                                    setCurrentQuestion({ ...currentQuestion, options: newOptions });
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <Button type="button" onClick={handleAddQuestion} size="sm">Add Question</Button>
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-semibold">Questions ({quizQuestions.length})</h3>
                                {quizQuestions.map((q, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-muted p-2 rounded">
                                        <span className="truncate flex-1">{idx + 1}. {q.question}</span>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveQuestion(idx)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Module
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
