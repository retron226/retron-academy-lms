import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../../lib/firebase";
import {
    doc,
    getDoc,
    setDoc,
    addDoc,
    collection,
    updateDoc,
    query,
    where,
    getDocs
} from "firebase/firestore";
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
    Type,
    Image,
    Upload,
    X,
    Users,
    BookOpen
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
import { uploadToCloudinary } from "../../../utils/cloudinary";

// Question type constants
const QUESTION_TYPES = {
    SINGLE_CHOICE: "single",
    MULTIPLE_CHOICE: "multiple",
    PARAGRAPH: "paragraph",
    IMAGE_TEXT: "image_text"
};

export default function AssessmentEditor() {
    const { id } = useParams();
    const { user, userRole } = useAuth();
    const navigate = useNavigate();
    const isNew = !id;
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [uploadingImages, setUploadingImages] = useState({});
    const [isPartnerInstructor, setIsPartnerInstructor] = useState(false);
    const [partnerCourses, setPartnerCourses] = useState([]);
    const [fetchingCourses, setFetchingCourses] = useState(false);
    const [assessment, setAssessment] = useState({
        title: "",
        description: "",
        accessCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        instructorId: user?.uid,
        instructorName: user?.displayName || user?.email,
        questions: [],
        createdAt: new Date().toISOString(),
        courseId: null, // Added for partner instructor course association
        courseTitle: null
    });

    useEffect(() => {
        if (!user) return;

        checkPartnerInstructorStatus();
    }, [user]);

    useEffect(() => {
        if (isPartnerInstructor && isNew) {
            fetchPartnerCourses();
        }
    }, [isPartnerInstructor, isNew]);

    useEffect(() => {
        if (!isNew && user) {
            fetchAssessment();
        }
    }, [id, user]);

    // Check if user is a partner instructor
    const checkPartnerInstructorStatus = async () => {
        try {
            if (userRole === "partner_instructor") {
                setIsPartnerInstructor(true);
                return;
            }

            // Fallback check
            const partnerInstructorRef = doc(db, "partner_instructors", user.uid);
            const partnerSnap = await getDoc(partnerInstructorRef);

            if (partnerSnap.exists()) {
                setIsPartnerInstructor(true);
            }
        } catch (error) {
            console.error("Error checking partner instructor status:", error);
        }
    };

    // Fetch courses assigned to partner instructor
    const fetchPartnerCourses = async () => {
        setFetchingCourses(true);
        try {
            const partnerInstructorRef = doc(db, "partner_instructors", user.uid);
            const partnerSnap = await getDoc(partnerInstructorRef);

            if (partnerSnap.exists()) {
                const partnerData = partnerSnap.data();
                const assignedCourses = partnerData.assignedCourses || [];

                // Fetch course details for each assigned course
                const coursePromises = assignedCourses.map(async (courseId) => {
                    const courseRef = doc(db, "courses", courseId);
                    const courseSnap = await getDoc(courseRef);
                    if (courseSnap.exists()) {
                        return {
                            id: courseId,
                            title: courseSnap.data().title,
                            ...courseSnap.data()
                        };
                    }
                    return null;
                });

                const courses = (await Promise.all(coursePromises)).filter(Boolean);
                setPartnerCourses(courses);
            }
        } catch (error) {
            console.error("Error fetching partner courses:", error);
        } finally {
            setFetchingCourses(false);
        }
    };

    const fetchAssessment = async () => {
        setLoading(true);
        try {
            const docSnap = await getDoc(doc(db, "assessments", id));
            if (docSnap.exists()) {
                const data = docSnap.data();

                // Check permissions for partner instructors
                if (isPartnerInstructor) {
                    const partnerInstructorRef = doc(db, "partner_instructors", user.uid);
                    const partnerSnap = await getDoc(partnerInstructorRef);

                    if (partnerSnap.exists()) {
                        const partnerData = partnerSnap.data();
                        const assignedCourses = partnerData.assignedCourses || [];

                        // If assessment has a courseId, check if it's in assigned courses
                        if (data.courseId && !assignedCourses.includes(data.courseId)) {
                            alert("You don't have permission to edit this assessment");
                            navigate("/instructor/assessments");
                            return;
                        }
                    }
                }

                // Ensure questions have type field
                const questions = data.questions?.map(q => ({
                    ...q,
                    type: q.type || QUESTION_TYPES.SINGLE_CHOICE,
                    correctAnswers: q.correctAnswers || (q.correctAnswer !== undefined ? [q.correctAnswer] : []),
                    imageUrl: q.imageUrl || null
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
            alert("Error loading assessment");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // Validate questions
        if (assessment.questions.length === 0) {
            alert("Please add at least one question");
            return;
        }

        // Validate question text and options
        for (const [index, question] of assessment.questions.entries()) {
            if (!question.text.trim()) {
                alert(`Question ${index + 1} has no text`);
                return;
            }

            if (question.type !== QUESTION_TYPES.PARAGRAPH && question.options) {
                const validOptions = question.options.filter(opt => opt.trim() !== "");
                if (validOptions.length < 2) {
                    alert(`Question ${index + 1} needs at least 2 valid options`);
                    return;
                }

                if (question.type === QUESTION_TYPES.SINGLE_CHOICE ||
                    question.type === QUESTION_TYPES.IMAGE_TEXT) {
                    if (question.correctAnswer === undefined ||
                        question.correctAnswer >= validOptions.length) {
                        alert(`Question ${index + 1} needs a valid correct answer`);
                        return;
                    }
                } else if (question.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
                    if (!question.correctAnswers?.length) {
                        alert(`Question ${index + 1} needs at least one correct answer`);
                        return;
                    }
                }
            }
        }

        setLoading(true);

        try {
            const isUploading = Object.values(uploadingImages).some(status => status);
            if (isUploading) {
                alert("Please wait for all images to finish uploading");
                setLoading(false);
                return;
            }

            // Prepare data with proper ownership fields
            const data = {
                ...assessment,
                instructorId: user.uid,
                instructorName: user.displayName || user.email,
                createdBy: user.uid,
                updatedAt: new Date().toISOString(),
                questions: assessment.questions.map(q => ({
                    id: q.id,
                    text: q.text.trim(),
                    type: q.type,
                    imageUrl: q.imageUrl || null,
                    options: q.type !== QUESTION_TYPES.PARAGRAPH ?
                        (q.options || []).map(opt => opt.trim()).filter(opt => opt !== "") :
                        undefined,
                    correctAnswer: (q.type === QUESTION_TYPES.SINGLE_CHOICE ||
                        q.type === QUESTION_TYPES.IMAGE_TEXT) ? q.correctAnswer : null,
                    correctAnswers: q.type === QUESTION_TYPES.MULTIPLE_CHOICE ? q.correctAnswers : [],
                }))
            };

            // For partner instructors, add course information
            if (isPartnerInstructor && assessment.courseId) {
                const selectedCourse = partnerCourses.find(c => c.id === assessment.courseId);
                if (selectedCourse) {
                    data.courseId = selectedCourse.id;
                    data.courseTitle = selectedCourse.title;
                }
            }

            if (isNew) {
                data.createdAt = new Date().toISOString();
                await addDoc(collection(db, "assessments"), data);
            } else {
                // Check if partner instructor is editing someone else's assessment
                if (isPartnerInstructor) {
                    const originalDoc = await getDoc(doc(db, "assessments", id));
                    if (originalDoc.exists()) {
                        const originalData = originalDoc.data();
                        if (originalData.instructorId !== user.uid) {
                            alert("You can only edit assessments you created");
                            setLoading(false);
                            return;
                        }
                    }
                }

                await updateDoc(doc(db, "assessments", id), data);
            }

            navigate("/instructor/assessments");
        } catch (error) {
            console.error("Error saving assessment:", error);
            alert(`Failed to save: ${error.message}`);
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

        if (type === QUESTION_TYPES.PARAGRAPH) {
            setAssessment(prev => ({
                ...prev,
                questions: [...prev.questions, newQuestion]
            }));
        } else if (type === QUESTION_TYPES.IMAGE_TEXT) {
            setAssessment(prev => ({
                ...prev,
                questions: [
                    ...prev.questions,
                    {
                        ...newQuestion,
                        options: ["", "", "", ""],
                        correctAnswer: 0,
                        imageUrl: null
                    }
                ]
            }));
        } else {
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

        question.options.splice(oIndex, 1);

        if (question.type === QUESTION_TYPES.SINGLE_CHOICE || question.type === QUESTION_TYPES.IMAGE_TEXT) {
            if (question.correctAnswer === oIndex) {
                question.correctAnswer = 0;
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

        if (question.type === QUESTION_TYPES.SINGLE_CHOICE || question.type === QUESTION_TYPES.IMAGE_TEXT) {
            updateQuestion(qIndex, "correctAnswer", answerIndex);
        } else if (question.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
            const newCorrectAnswers = [...(question.correctAnswers || [])];
            const answerIndexNum = Number(answerIndex);

            if (newCorrectAnswers.includes(answerIndexNum)) {
                const index = newCorrectAnswers.indexOf(answerIndexNum);
                newCorrectAnswers.splice(index, 1);
            } else {
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
            delete question.options;
            delete question.correctAnswer;
            delete question.correctAnswers;
            delete question.imageUrl;
        } else if (newType === QUESTION_TYPES.IMAGE_TEXT) {
            if (!question.options) {
                question.options = ["", "", "", ""];
            }
            question.correctAnswer = question.correctAnswer !== undefined ? question.correctAnswer : 0;
            delete question.correctAnswers;
        } else {
            delete question.imageUrl;

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

    const handleImageUpload = async (qIndex, file) => {
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("Image size must be less than 5MB");
            return;
        }

        setUploadingImages(prev => ({ ...prev, [qIndex]: true }));

        try {
            const imageUrl = await uploadToCloudinary(file);
            updateQuestion(qIndex, "imageUrl", imageUrl);
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload image");
        } finally {
            setUploadingImages(prev => ({ ...prev, [qIndex]: false }));
        }
    };

    const removeImage = (qIndex) => {
        updateQuestion(qIndex, "imageUrl", null);
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(assessment.title, 10, 10);

        if (assessment.courseTitle) {
            doc.setFontSize(12);
            doc.text(`Course: ${assessment.courseTitle}`, 10, 18);
            doc.setFontSize(10);
            doc.text(`Access Code: ${assessment.accessCode}`, 10, 26);
        } else {
            doc.setFontSize(12);
            doc.text(`Access Code: ${assessment.accessCode}`, 10, 18);
        }

        let y = assessment.courseTitle ? 34 : 26;
        assessment.questions.forEach((q, i) => {
            if (y > 270) { doc.addPage(); y = 10; }

            doc.setFont(undefined, 'bold');
            doc.text(`Q${i + 1}: ${q.text}`, 10, y);
            y += 7;

            if (q.imageUrl) {
                doc.setFont(undefined, 'italic');
                doc.text("[Image included in online version]", 15, y);
                y += 6;
                doc.setFont(undefined, 'normal');
            }

            if (q.type === QUESTION_TYPES.PARAGRAPH) {
                doc.text("Answer: ___________________________", 15, y);
                y += 10;
            } else {
                q.options.forEach((opt, j) => {
                    let prefix = "";
                    if ((q.type === QUESTION_TYPES.SINGLE_CHOICE || q.type === QUESTION_TYPES.IMAGE_TEXT) && j === parseInt(q.correctAnswer)) {
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

    if (loading && !isNew && !assessment.id) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate("/instructor/assessments")}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {isNew ? "Create Assessment" : "Edit Assessment"}
                        </h1>
                        {isPartnerInstructor && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <Users className="h-3 w-3" />
                                <span>Partner Instructor Mode</span>
                            </div>
                        )}
                    </div>
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
                            <Label htmlFor="title">Title *</Label>
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
                                rows={3}
                            />
                        </div>

                        {/* Course Selection for Partner Instructors (New Assessments) */}
                        {isPartnerInstructor && isNew && (
                            <div className="space-y-2">
                                <Label htmlFor="course">Course *</Label>
                                {fetchingCourses ? (
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading your assigned courses...
                                    </div>
                                ) : partnerCourses.length > 0 ? (
                                    <Select
                                        required
                                        value={assessment.courseId || ""}
                                        onValueChange={(value) => {
                                            const selectedCourse = partnerCourses.find(c => c.id === value);
                                            setAssessment({
                                                ...assessment,
                                                courseId: value,
                                                courseTitle: selectedCourse?.title
                                            });
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a course" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {partnerCourses.map(course => (
                                                <SelectItem key={course.id} value={course.id}>
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen className="h-3 w-3" />
                                                        {course.title}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="text-amber-600 bg-amber-50 p-3 rounded-md">
                                        <p className="font-medium">No courses assigned</p>
                                        <p className="text-sm mt-1">
                                            You need to be assigned to at least one course to create assessments.
                                            Contact your institution administrator.
                                        </p>
                                    </div>
                                )}
                                <p className="text-xs text-gray-500">
                                    As a partner instructor, you can only create assessments for your assigned courses.
                                </p>
                            </div>
                        )}

                        {/* Display course info for existing assessments */}
                        {!isNew && assessment.courseTitle && (
                            <div className="space-y-2">
                                <Label>Course</Label>
                                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                                    <BookOpen className="h-4 w-4 text-gray-500" />
                                    <span>{assessment.courseTitle}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Questions</h2>
                        <div className="text-sm text-gray-500">
                            {assessment.questions.length} question{assessment.questions.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {/* Question Type Selector */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => addQuestion(QUESTION_TYPES.SINGLE_CHOICE)}
                            className="flex items-center gap-2"
                            disabled={isPartnerInstructor && !assessment.courseId}
                        >
                            <Square className="h-4 w-4" />
                            Single Choice
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => addQuestion(QUESTION_TYPES.MULTIPLE_CHOICE)}
                            className="flex items-center gap-2"
                            disabled={isPartnerInstructor && !assessment.courseId}
                        >
                            <CheckSquare className="h-4 w-4" />
                            Multiple Choice
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => addQuestion(QUESTION_TYPES.PARAGRAPH)}
                            className="flex items-center gap-2"
                            disabled={isPartnerInstructor && !assessment.courseId}
                        >
                            <Type className="h-4 w-4" />
                            Paragraph
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => addQuestion(QUESTION_TYPES.IMAGE_TEXT)}
                            className="flex items-center gap-2"
                            disabled={isPartnerInstructor && !assessment.courseId}
                        >
                            <Image className="h-4 w-4" />
                            Image + Text
                        </Button>
                    </div>

                    {isPartnerInstructor && !assessment.courseId && isNew && (
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                            <p className="text-amber-800 font-medium">
                                Select a course first to add questions
                            </p>
                        </div>
                    )}

                    {assessment.questions.map((q, qIndex) => (
                        <Card key={q.id}>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold">Q{qIndex + 1}</span>
                                            {q.imageUrl && (
                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                    Has Image
                                                </span>
                                            )}
                                        </div>
                                        <Select
                                            value={q.type}
                                            onValueChange={(value) => changeQuestionType(qIndex, value)}
                                        >
                                            <SelectTrigger className="w-[160px]">
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
                                                <SelectItem value={QUESTION_TYPES.IMAGE_TEXT}>
                                                    <div className="flex items-center gap-2">
                                                        <Image className="h-3 w-3" />
                                                        Image + Text
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <Input
                                            placeholder="Question text *"
                                            value={q.text}
                                            onChange={(e) => updateQuestion(qIndex, "text", e.target.value)}
                                            required
                                        />

                                        {q.type === QUESTION_TYPES.IMAGE_TEXT && (
                                            <div className="space-y-2">
                                                <Label>Question Image (Optional)</Label>
                                                {q.imageUrl ? (
                                                    <div className="relative border rounded-md p-2">
                                                        <img
                                                            src={q.imageUrl}
                                                            alt="Question"
                                                            className="max-h-48 mx-auto rounded"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute top-2 right-2 h-6 w-6 bg-white"
                                                            onClick={() => removeImage(qIndex)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="border-2 border-dashed rounded-md p-6 text-center">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            ref={fileInputRef}
                                                            onChange={(e) => {
                                                                const file = e.target.files[0];
                                                                if (file) {
                                                                    handleImageUpload(qIndex, file);
                                                                }
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            disabled={uploadingImages[qIndex]}
                                                            className="flex items-center gap-2"
                                                        >
                                                            {uploadingImages[qIndex] ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Upload className="h-4 w-4" />
                                                            )}
                                                            {uploadingImages[qIndex] ? "Uploading..." : "Upload Image"}
                                                        </Button>
                                                        <p className="text-sm text-gray-500 mt-2">
                                                            Supports JPG, PNG, GIF (Max 5MB)
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {(q.type === QUESTION_TYPES.SINGLE_CHOICE ||
                                            q.type === QUESTION_TYPES.MULTIPLE_CHOICE ||
                                            q.type === QUESTION_TYPES.IMAGE_TEXT) ? (
                                            <>
                                                <div className="space-y-2">
                                                    <Label>Options *</Label>
                                                    <div className="space-y-3">
                                                        {q.options.map((opt, oIndex) => (
                                                            <div key={oIndex} className="flex gap-2 items-center">
                                                                {q.type === QUESTION_TYPES.MULTIPLE_CHOICE ? (
                                                                    <Checkbox
                                                                        checked={q.correctAnswers?.includes(oIndex) || false}
                                                                        onCheckedChange={() => handleCorrectAnswerChange(qIndex, oIndex)}
                                                                    />
                                                                ) : (
                                                                    <input
                                                                        type="radio"
                                                                        name={`correct-${q.id}`}
                                                                        checked={parseInt(q.correctAnswer) === oIndex}
                                                                        onChange={() => handleCorrectAnswerChange(qIndex, oIndex)}
                                                                        className="h-4 w-4"
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
                                        ) : q.type === QUESTION_TYPES.PARAGRAPH ? (
                                            <div className="space-y-2">
                                                <Label>Answer Format</Label>
                                                <div className="p-4 border rounded-md bg-gray-50">
                                                    <p className="text-gray-600">
                                                        Students will see a paragraph text area for their answer
                                                    </p>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive self-start"
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
                            <p className="text-sm text-gray-400">
                                Use the buttons above to add questions
                                {isPartnerInstructor && !assessment.courseId && " (select a course first)"}
                            </p>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}