import { useState, useEffect, useRef } from "react";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Ban, MoreVertical, CheckCircle, XCircle } from "lucide-react";
import { createPortal } from "react-dom";

export default function InstructorStudents() {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourseId, setSelectedCourseId] = useState("all");
    const [openMenuId, setOpenMenuId] = useState(null); // composite id: studentId-courseId
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    // Handle scroll to close menu
    useEffect(() => {
        const handleScroll = () => setOpenMenuId(null);
        window.addEventListener("scroll", handleScroll, true);
        return () => window.removeEventListener("scroll", handleScroll, true);
    }, []);

    const fetchData = async () => {
        try {
            // 1. Fetch all courses by this instructor
            const qCourses = query(collection(db, "courses"), where("instructorId", "==", user.uid));
            const coursesSnap = await getDocs(qCourses);
            const coursesData = coursesSnap.docs.map(doc => ({
                id: doc.id,
                title: doc.data().title,
                totalModules: doc.data().totalModules || 0
            }));
            setCourses(coursesData);

            // 2. Fetch all students
            const qStudents = query(collection(db, "users"), where("role", "==", "student"));
            const studentsSnap = await getDocs(qStudents);

            const myCourseIds = coursesData.map(c => c.id);

            // 3. Filter and fetch progress
            const studentsData = await Promise.all(studentsSnap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(student =>
                    student.enrolledCourses?.some(courseId => myCourseIds.includes(courseId))
                )
                .map(async student => {
                    // Fetch progress for each of my courses this student is enrolled in
                    const progressMap = {};
                    for (const courseId of myCourseIds) {
                        if (student.enrolledCourses?.includes(courseId)) {
                            try {
                                const progressSnap = await getDoc(doc(db, "users", student.id, "courseProgress", courseId));
                                progressMap[courseId] = progressSnap.exists() ? progressSnap.data() : { completedModules: [] };
                            } catch (e) {
                                console.error("Error fetching progress", e);
                            }
                        }
                    }
                    return { ...student, progressMap };
                }));

            setStudents(studentsData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleBan = async (studentId, courseId) => {
        if (!window.confirm("Ban this student from the course?")) return;
        try {
            await updateDoc(doc(db, "users", studentId), {
                bannedFrom: arrayUnion(courseId)
            });

            setStudents(students.map(s => {
                if (s.id === studentId) {
                    return { ...s, bannedFrom: [...(s.bannedFrom || []), courseId] };
                }
                return s;
            }));
        } catch (error) {
            console.error("Error banning student:", error);
        }
    };

    const handleUnban = async (studentId, courseId) => {
        try {
            await updateDoc(doc(db, "users", studentId), {
                bannedFrom: arrayRemove(courseId)
            });

            setStudents(students.map(s => {
                if (s.id === studentId) {
                    return { ...s, bannedFrom: (s.bannedFrom || []).filter(id => id !== courseId) };
                }
                return s;
            }));
        } catch (error) {
            console.error("Error unbanning student:", error);
        }
    };

    const handleMenuClick = (e, menuId) => {
        e.stopPropagation();
        if (openMenuId === menuId) {
            setOpenMenuId(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + window.scrollY,
                left: rect.right - 192 + window.scrollX // 192px is w-48
            });
            setOpenMenuId(menuId);
        }
    };

    const filteredStudents = selectedCourseId === "all"
        ? students
        : students.filter(s => s.enrolledCourses?.includes(selectedCourseId));

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Enrolled Students</h1>
                <select
                    className="p-2 border rounded-md"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                >
                    <option value="all">All Courses</option>
                    {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                </select>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                {selectedCourseId === "all" && <TableHead>Enrolled Courses</TableHead>}
                                <TableHead>Progress</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.map((student) => {
                                const studentMyCourses = courses.filter(c => student.enrolledCourses?.includes(c.id));
                                // If filtering by course, only show that course's data
                                const displayCourses = selectedCourseId === "all"
                                    ? studentMyCourses
                                    : studentMyCourses.filter(c => c.id === selectedCourseId);

                                return (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium">{student.fullName || "N/A"}</TableCell>
                                        <TableCell>{student.email}</TableCell>
                                        {selectedCourseId === "all" && (
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {displayCourses.map(c => (
                                                        <span key={c.id} className="text-xs bg-muted px-2 py-1 rounded-full w-fit">
                                                            {c.title}
                                                        </span>
                                                    ))}
                                                </div>
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <div className="flex flex-col gap-2">
                                                {displayCourses.map(c => {
                                                    const completed = student.progressMap?.[c.id]?.completedModules?.length || 0;
                                                    const total = c.totalModules || 0;
                                                    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

                                                    return (
                                                        <div key={c.id} className="flex items-center gap-2 text-xs">
                                                            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary"
                                                                    style={{ width: `${percent}%` }}
                                                                />
                                                            </div>
                                                            <span>{percent}% ({c.title})</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-2">
                                                {displayCourses.map(c => {
                                                    const isBanned = student.bannedFrom?.includes(c.id);
                                                    const menuId = `${student.id}-${c.id}`;

                                                    return (
                                                        <div key={c.id} className="relative">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={(e) => handleMenuClick(e, menuId)}
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>

                                                            {openMenuId === menuId && createPortal(
                                                                <div
                                                                    className="fixed bg-popover border rounded-md shadow-md z-[9999] overflow-hidden w-48"
                                                                    style={{ top: menuPosition.top, left: menuPosition.left }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <div className="p-2 text-xs font-medium text-muted-foreground border-b bg-muted/50">
                                                                        {c.title}
                                                                    </div>
                                                                    <button
                                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2 text-destructive"
                                                                        onClick={() => {
                                                                            isBanned ? handleUnban(student.id, c.id) : handleBan(student.id, c.id);
                                                                            setOpenMenuId(null);
                                                                        }}
                                                                    >
                                                                        {isBanned ? (
                                                                            <>
                                                                                <CheckCircle className="h-4 w-4" /> Unban Student
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Ban className="h-4 w-4" /> Ban Student
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>,
                                                                document.body
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {filteredStudents.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={selectedCourseId === "all" ? 5 : 4} className="text-center py-8 text-muted-foreground">
                                        No students found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
