import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { db } from "../../../lib/firebase";
import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where
} from "firebase/firestore";
import { useAuth } from "../../../contexts/AuthContext";
import { Button } from "../../../components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "../../../components/ui/table";
import {
    Download,
    ArrowLeft,
    Users,
    Filter,
    AlertCircle
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "../../../components/ui/select";

export default function AssessmentResults() {
    const { id } = useParams();
    const { user, userRole } = useAuth();
    const navigate = useNavigate();

    const [assessment, setAssessment] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [filteredSubmissions, setFilteredSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPartnerInstructor, setIsPartnerInstructor] = useState(false);
    const [partnerCourses, setPartnerCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState("all");
    const [permissionDenied, setPermissionDenied] = useState(false);

    useEffect(() => {
        checkPartnerInstructorStatus();
    }, [user]);

    useEffect(() => {
        if (user && assessment && isPartnerInstructor) {
            checkPartnerInstructorAccess();
        }
    }, [user, assessment, isPartnerInstructor]);

    useEffect(() => {
        if (user && !permissionDenied) {
            fetchData();
        }
    }, [id, user, permissionDenied]);

    useEffect(() => {
        filterSubmissions();
    }, [selectedCourse, submissions]);

    const checkPartnerInstructorStatus = async () => {
        try {
            if (userRole === "partner_instructor") {
                setIsPartnerInstructor(true);
                return;
            }

            const partnerInstructorRef = doc(db, "partnerInstructors", user?.uid);
            const partnerSnap = await getDoc(partnerInstructorRef);

            if (partnerSnap.exists()) {
                setIsPartnerInstructor(true);
                fetchPartnerCourses();
            }
        } catch (error) {
            console.error("Error checking partner instructor status:", error);
        }
    };

    const fetchPartnerCourses = async () => {
        try {
            const partnerInstructorRef = doc(db, "partnerInstructors", user.uid);
            const partnerSnap = await getDoc(partnerInstructorRef);

            if (partnerSnap.exists()) {
                const partnerData = partnerSnap.data();
                const assignedCourses = partnerData.assignedCourses || [];

                const coursePromises = assignedCourses.map(async (courseId) => {
                    const courseRef = doc(db, "courses", courseId);
                    const courseSnap = await getDoc(courseRef);
                    if (courseSnap.exists()) {
                        return {
                            id: courseId,
                            title: courseSnap.data().title
                        };
                    }
                    return null;
                });

                const courses = (await Promise.all(coursePromises)).filter(Boolean);
                setPartnerCourses(courses);
            }
        } catch (error) {
            console.error("Error fetching partner courses:", error);
        }
    };

    const checkPartnerInstructorAccess = async () => {
        try {
            // For partner instructors, check if they have access to this assessment
            const partnerInstructorRef = doc(db, "partnerInstructors", user.uid);
            const partnerSnap = await getDoc(partnerInstructorRef);

            if (partnerSnap.exists()) {
                const partnerData = partnerSnap.data();
                const assignedCourses = partnerData.assignedCourses || [];

                // If assessment has a courseId, check if it's in assigned courses
                if (assessment?.courseId && !assignedCourses.includes(assessment.courseId)) {
                    // Check if assessment was created by this partner instructor
                    if (assessment.instructorId !== user.uid) {
                        setPermissionDenied(true);
                        return;
                    }
                }
            }
        } catch (error) {
            console.error("Error checking partner instructor access:", error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const assessmentSnap = await getDoc(doc(db, "assessments", id));
            if (!assessmentSnap.exists()) {
                navigate("/instructor/assessments");
                return;
            }

            const assessmentData = {
                id: assessmentSnap.id,
                ...assessmentSnap.data()
            };
            setAssessment(assessmentData);

            // For partner instructors, filter students by assigned courses
            let submissionsQuery;

            if (isPartnerInstructor && assessmentData.courseId) {
                // Get all submissions for this assessment
                submissionsQuery = collection(db, "assessments", id, "submissions");

                // We'll filter client-side based on course enrollment
            } else {
                // Regular instructor gets all submissions
                submissionsQuery = collection(db, "assessments", id, "submissions");
            }

            const submissionsSnap = await getDocs(submissionsQuery);
            const submissionsData = [];

            for (const subDoc of submissionsSnap.docs) {
                const subData = subDoc.data();

                // For partner instructors, check if student is enrolled in the course
                if (isPartnerInstructor && assessmentData.courseId) {
                    try {
                        // Check if student is enrolled in the course
                        const enrollmentRef = doc(
                            db,
                            "courses",
                            assessmentData.courseId,
                            "enrolledStudents",
                            subData.studentId
                        );
                        const enrollmentSnap = await getDoc(enrollmentRef);

                        if (!enrollmentSnap.exists()) {
                            continue; // Skip students not enrolled in this course
                        }
                    } catch (error) {
                        console.error("Error checking enrollment:", error);
                        continue;
                    }
                }

                let displayName = subData.studentName;
                let studentEmail = subData.studentEmail;

                // Try to fetch user profile for better display name
                if (displayName && displayName.includes("@")) {
                    try {
                        const userSnap = await getDoc(doc(db, "users", subData.studentId));
                        if (userSnap.exists()) {
                            const userData = userSnap.data();
                            if (userData.fullName) {
                                displayName = userData.fullName;
                            }
                            if (userData.email && !studentEmail) {
                                studentEmail = userData.email;
                            }
                        }
                    } catch (e) {
                        console.error("Error fetching user profile", e);
                    }
                }

                submissionsData.push({
                    uid: subDoc.id,
                    ...subData,
                    displayName: displayName || studentEmail,
                    studentEmail: studentEmail,
                    submittedAt: subData.submittedAt || subData.timestamp || null
                });
            }

            // Sort by submission date (newest first)
            submissionsData.sort((a, b) => {
                const dateA = a.submittedAt ? new Date(a.submittedAt) : new Date(0);
                const dateB = b.submittedAt ? new Date(b.submittedAt) : new Date(0);
                return dateB - dateA;
            });

            setSubmissions(submissionsData);
            setFilteredSubmissions(submissionsData);
        } catch (error) {
            console.error("Error fetching results:", error);
            alert("Error loading assessment results");
        } finally {
            setLoading(false);
        }
    };

    const filterSubmissions = () => {
        if (selectedCourse === "all") {
            setFilteredSubmissions(submissions);
        } else {
            // Filter by course (if we had course data per submission)
            // For now, we'll implement if we add course filtering later
            setFilteredSubmissions(submissions);
        }
    };

    const exportXLSX = async () => {
        if (!assessment || filteredSubmissions.length === 0) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Results");

        // Header row
        const headers = [
            "Student Name",
            "Email",
            ...assessment.questions.map((q, i) => `Q${i + 1}: ${q.text.substring(0, 30)}${q.text.length > 30 ? '...' : ''}`),
            "Total Score",
            "Percentage",
            "Submitted At"
        ];

        worksheet.addRow(headers);

        // Style header
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE8F4FF' }
        };

        // Data rows
        filteredSubmissions.forEach((sub) => {
            let score = 0;

            const row = [
                sub.displayName,
                sub.studentEmail || "N/A"
            ];

            assessment.questions.forEach((q, i) => {
                const answerIndex = sub.answers ? sub.answers[i] : null;

                let isCorrect = false;
                let answerText = "Not answered";

                if (answerIndex !== null && answerIndex !== undefined) {
                    if (q.type === "multiple") {
                        // Multiple choice questions
                        const correctAnswers = q.correctAnswers || [];
                        const studentAnswers = Array.isArray(sub.answers[i]) ? sub.answers[i] : [sub.answers[i]];
                        isCorrect = studentAnswers.every(ans => correctAnswers.includes(ans)) &&
                            correctAnswers.length === studentAnswers.length;
                        answerText = isCorrect ? "Correct" : "Incorrect";
                    } else {
                        // Single choice or other types
                        isCorrect = parseInt(answerIndex) === parseInt(q.correctAnswer);
                        answerText = isCorrect ? "Correct" : "Incorrect";
                    }
                }

                if (isCorrect) score++;
                row.push(answerText);
            });

            const percentage = assessment.questions.length > 0
                ? ((score / assessment.questions.length) * 100).toFixed(1)
                : "0.0";

            row.push(`${score}/${assessment.questions.length}`);
            row.push(`${percentage}%`);
            row.push(sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : "N/A");

            worksheet.addRow(row);
        });

        // Auto width and styling
        worksheet.columns.forEach((column, index) => {
            let maxLength = 0;
            worksheet.eachRow({ includeEmpty: false }, (row) => {
                const cell = row.getCell(index + 1);
                const cellLength = cell.value ? cell.value.toString().length : 0;
                if (cellLength > maxLength) {
                    maxLength = cellLength;
                }
            });
            column.width = Math.min(Math.max(maxLength + 2, 10), 50);
        });

        // Style score cells
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const scoreCell = row.getCell(assessment.questions.length + 3); // Total Score column
            const percentageCell = row.getCell(assessment.questions.length + 4); // Percentage column

            const percentage = parseFloat(percentageCell.value?.toString().replace('%', '') || 0);

            if (percentage >= 80) {
                scoreCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFC6EFCE' }
                };
                percentageCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFC6EFCE' }
                };
            } else if (percentage >= 60) {
                scoreCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFEB9C' }
                };
                percentageCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFEB9C' }
                };
            } else {
                scoreCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFC7CE' }
                };
                percentageCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFC7CE' }
                };
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(
            new Blob([buffer]),
            `${assessment.title.replace(/\s+/g, "_")}_Results_${new Date().toISOString().split('T')[0]}.xlsx`
        );
    };

    const calculateStatistics = () => {
        if (filteredSubmissions.length === 0) return null;

        const totalQuestions = assessment.questions.length;
        const totalSubmissions = filteredSubmissions.length;

        // Calculate average score
        const totalScore = filteredSubmissions.reduce((sum, sub) => {
            let score = 0;
            assessment.questions.forEach((q, i) => {
                const answerIndex = sub.answers ? sub.answers[i] : null;
                if (answerIndex !== null && answerIndex !== undefined) {
                    if (q.type === "multiple") {
                        const correctAnswers = q.correctAnswers || [];
                        const studentAnswers = Array.isArray(sub.answers[i]) ? sub.answers[i] : [sub.answers[i]];
                        const isCorrect = studentAnswers.every(ans => correctAnswers.includes(ans)) &&
                            correctAnswers.length === studentAnswers.length;
                        if (isCorrect) score++;
                    } else {
                        if (parseInt(answerIndex) === parseInt(q.correctAnswer)) {
                            score++;
                        }
                    }
                }
            });
            return sum + score;
        }, 0);

        const averageScore = totalScore / totalSubmissions;
        const averagePercentage = (averageScore / totalQuestions) * 100;

        return {
            totalSubmissions,
            averageScore: averageScore.toFixed(1),
            averagePercentage: averagePercentage.toFixed(1)
        };
    };

    if (permissionDenied) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <h2 className="text-2xl font-bold">Access Denied</h2>
                <p className="text-gray-600 text-center">
                    You don't have permission to view results for this assessment.
                </p>
                <Link to="/instructor/assessments">
                    <Button>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Assessments
                    </Button>
                </Link>
            </div>
        );
    }

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading results...</p>
            </div>
        </div>
    );

    if (!assessment) return (
        <div className="text-center py-12">
            <p className="text-gray-600">Assessment not found</p>
            <Link to="/instructor/assessments" className="mt-4 inline-block">
                <Button>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Assessments
                </Button>
            </Link>
        </div>
    );

    const statistics = calculateStatistics();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/instructor/assessments">
                        <Button variant="ghost">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold tracking-tight">
                                Results: {assessment.title}
                            </h1>
                            {isPartnerInstructor && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                    <Users className="h-3 w-3" />
                                    Partner Instructor
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                            <p>{filteredSubmissions.length} Submission{filteredSubmissions.length !== 1 ? 's' : ''}</p>
                            <p>{assessment.questions.length} Questions</p>
                            {assessment.courseTitle && (
                                <p>Course: {assessment.courseTitle}</p>
                            )}
                        </div>
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={exportXLSX}
                    disabled={filteredSubmissions.length === 0}
                >
                    <Download className="mr-2 h-4 w-4" /> Export Excel
                </Button>
            </div>

            {/* Statistics Card */}
            {statistics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border rounded-lg p-4">
                        <div className="text-sm text-gray-500">Total Submissions</div>
                        <div className="text-2xl font-bold">{statistics.totalSubmissions}</div>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                        <div className="text-sm text-gray-500">Average Score</div>
                        <div className="text-2xl font-bold">
                            {statistics.averageScore}/{assessment.questions.length}
                        </div>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                        <div className="text-sm text-gray-500">Average Percentage</div>
                        <div className="text-2xl font-bold">{statistics.averagePercentage}%</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Filters:</span>
                </div>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by course" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Students</SelectItem>
                        {partnerCourses.map(course => (
                            <SelectItem key={course.id} value={course.id}>
                                {course.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Results Table */}
            <div className="border rounded-lg overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Student Name</TableHead>
                            <TableHead className="w-[200px]">Email</TableHead>
                            {assessment.questions.map((q, i) => (
                                <TableHead key={i} className="text-center min-w-[60px] max-w-[80px]">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium">Q{i + 1}</span>
                                        <span className="text-xs text-gray-500 truncate">
                                            {q.type === "multiple" ? "(MC)" : q.type === "paragraph" ? "(P)" : "(SC)"}
                                        </span>
                                    </div>
                                </TableHead>
                            ))}
                            <TableHead className="text-right min-w-[100px]">Score</TableHead>
                            <TableHead className="text-right min-w-[100px]">Percentage</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSubmissions.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={assessment.questions.length + 4}
                                    className="text-center py-8"
                                >
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <div className="text-gray-400">
                                            No submissions yet for this assessment.
                                        </div>
                                        {isPartnerInstructor && (
                                            <div className="text-sm text-gray-500">
                                                Students enrolled in your course will appear here after they submit.
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSubmissions.map((sub) => {
                                let score = 0;

                                return (
                                    <TableRow key={sub.uid} className="hover:bg-gray-50">
                                        <TableCell className="font-medium">
                                            {sub.displayName}
                                        </TableCell>
                                        <TableCell className="text-gray-600 text-sm">
                                            {sub.studentEmail || "N/A"}
                                        </TableCell>
                                        {assessment.questions.map((q, i) => {
                                            const answerIndex = sub.answers ? sub.answers[i] : null;
                                            let isCorrect = false;
                                            let displayText = "—";

                                            if (answerIndex !== null && answerIndex !== undefined) {
                                                if (q.type === "multiple") {
                                                    const correctAnswers = q.correctAnswers || [];
                                                    const studentAnswers = Array.isArray(sub.answers[i]) ? sub.answers[i] : [sub.answers[i]];
                                                    isCorrect = studentAnswers.every(ans => correctAnswers.includes(ans)) &&
                                                        correctAnswers.length === studentAnswers.length;
                                                    displayText = isCorrect ? "✓" : "✗";
                                                } else {
                                                    isCorrect = parseInt(answerIndex) === parseInt(q.correctAnswer);
                                                    displayText = isCorrect ? "✓" : "✗";
                                                }
                                            }

                                            if (isCorrect) score++;

                                            return (
                                                <TableCell key={i} className="p-0">
                                                    <div
                                                        className={`h-10 w-full flex items-center justify-center ${isCorrect
                                                            ? "bg-green-50 text-green-700 border-r"
                                                            : "bg-red-50 text-red-700 border-r"
                                                            }`}
                                                        title={q.text.substring(0, 50) + (q.text.length > 50 ? '...' : '')}
                                                    >
                                                        {displayText}
                                                    </div>
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell className="text-right font-bold">
                                            {score}/{assessment.questions.length}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={`px-2 py-1 rounded-full text-sm font-medium ${(score / assessment.questions.length) >= 0.8
                                                ? "bg-green-100 text-green-800"
                                                : (score / assessment.questions.length) >= 0.6
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : "bg-red-100 text-red-800"
                                                }`}>
                                                {((score / assessment.questions.length) * 100).toFixed(1)}%
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Summary at bottom */}
            {filteredSubmissions.length > 0 && (
                <div className="text-sm text-gray-600">
                    Showing {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}
                    {selectedCourse !== "all" && ` for selected course`}
                </div>
            )}
        </div>
    );
}