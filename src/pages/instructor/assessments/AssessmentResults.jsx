import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { db } from "../../../lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { Button } from "../../../components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "../../../components/ui/table";
import { Download, ArrowLeft } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export default function AssessmentResults() {
    const { id } = useParams();
    const [assessment, setAssessment] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const assessmentSnap = await getDoc(doc(db, "assessments", id));
            if (!assessmentSnap.exists()) return;

            const assessmentData = { id: assessmentSnap.id, ...assessmentSnap.data() };
            setAssessment(assessmentData);

            const submissionsSnap = await getDocs(
                collection(db, "assessments", id, "submissions")
            );

            const userPromises = submissionsSnap.docs.map(async (subDoc) => {
                const subData = subDoc.data();
                let displayName = subData.studentName;

                if (displayName && displayName.includes("@")) {
                    try {
                        const userSnap = await getDoc(doc(db, "users", subData.studentId));
                        if (userSnap.exists() && userSnap.data().fullName) {
                            displayName = userSnap.data().fullName;
                        }
                    } catch (e) {
                        console.error("Error fetching user profile", e);
                    }
                }

                return {
                    uid: subDoc.id,
                    ...subData,
                    displayParams: {
                        name: displayName || subData.studentEmail
                    }
                };
            });

            setSubmissions(await Promise.all(userPromises));
        } catch (error) {
            console.error("Error fetching results:", error);
        } finally {
            setLoading(false);
        }
    };

    // ✅ ExcelJS Export
    const exportXLSX = async () => {
        if (!assessment || submissions.length === 0) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Results");

        // Header row
        const headers = [
            "Student Name",
            ...assessment.questions.map((_, i) => `Q${i + 1}`),
            "Total Score"
        ];

        worksheet.addRow(headers);

        // Style header
        worksheet.getRow(1).font = { bold: true };

        // Data rows
        submissions.forEach((sub) => {
            let score = 0;

            const row = [
                sub.displayParams?.name || sub.studentName || sub.studentEmail
            ];

            assessment.questions.forEach((q, i) => {
                const answerIndex = sub.answers[i];
                const isCorrect = answerIndex === parseInt(q.correctAnswer);
                if (isCorrect) score++;
                row.push(isCorrect ? "Correct" : "Wrong");
            });

            row.push(`${score}/${assessment.questions.length}`);
            worksheet.addRow(row);
        });

        // Auto width
        worksheet.columns.forEach((column) => {
            column.width = 18;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(
            new Blob([buffer]),
            `${assessment.title.replace(/\s+/g, "_")}_Results.xlsx`
        );
    };

    if (loading) return <div>Loading results...</div>;
    if (!assessment) return <div>Assessment not found</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/instructor/assessments">
                        <Button variant="ghost">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Results: {assessment.title}
                        </h1>
                        <p className="text-muted-foreground">
                            {submissions.length} Submissions
                        </p>
                    </div>
                </div>
                <Button variant="outline" onClick={exportXLSX}>
                    <Download className="mr-2 h-4 w-4" /> Export Excel
                </Button>
            </div>

            <div className="border rounded-lg overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Student Name</TableHead>
                            {assessment.questions.map((_, i) => (
                                <TableHead key={i} className="text-center w-[50px]">
                                    Q{i + 1}
                                </TableHead>
                            ))}
                            <TableHead className="text-right">Score</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {submissions.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={assessment.questions.length + 2}
                                    className="text-center py-8"
                                >
                                    No submissions yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            submissions.map((sub) => {
                                let score = 0;
                                return (
                                    <TableRow key={sub.uid}>
                                        <TableCell className="font-medium">
                                            {sub.displayParams?.name ||
                                                sub.studentName ||
                                                sub.studentEmail}
                                        </TableCell>
                                        {assessment.questions.map((q, i) => {
                                            const answerIndex = sub.answers[i];
                                            const isCorrect =
                                                answerIndex === parseInt(q.correctAnswer);
                                            if (isCorrect) score++;

                                            return (
                                                <TableCell key={i} className="p-0">
                                                    <div
                                                        className={`h-10 w-full flex items-center justify-center ${isCorrect
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-red-100 text-red-700"
                                                            }`}
                                                    >
                                                        {isCorrect ? "✓" : "✗"}
                                                    </div>
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell className="text-right font-bold">
                                            {score}/{assessment.questions.length}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
