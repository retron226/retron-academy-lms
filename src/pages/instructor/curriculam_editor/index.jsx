import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { motion } from "framer-motion";
import SectionList from "./components/SectionList";
import AddSectionForm from "./components/AddSectionForm";
import ModuleEditor from "./components/ModuleEditor";
import { db } from "../../../lib/firebase";
import { Card } from "../../../components/ui/card";

export default function CurriculumEditor({ courseId }) {
    const [sections, setSections] = useState([]);
    const [editingModule, setEditingModule] = useState(null);

    useEffect(() => {
        if (!courseId) return;

        const q = query(collection(db, "courses", courseId, "sections"), orderBy("order", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sectionsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                subSections: doc.data().subSections || []
            }));
            setSections(sectionsData);
        });

        return () => unsubscribe();
    }, [courseId]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            <Card>
                <CardHeader className="bg-gradient-to-r from-accent/5 to-accent/10">
                    <CardTitle>Course Curriculum</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <SectionList
                        sections={sections}
                        courseId={courseId}
                        onEditModule={setEditingModule}
                    />

                    <AddSectionForm courseId={courseId} sectionsLength={sections.length} />
                </CardContent>
            </Card>

            {editingModule && (
                <ModuleEditor
                    isOpen={!!editingModule}
                    onClose={() => setEditingModule(null)}
                    moduleData={editingModule}
                    courseId={courseId}
                />
            )}
        </motion.div>
    );
}