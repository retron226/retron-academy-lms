import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Plus, Trash2, GripVertical, Video, FileText, HelpCircle } from "lucide-react";
import ModuleEditor from "./ModuleEditor";

export default function CurriculumEditor({ courseId }) {
    const [sections, setSections] = useState([]);
    const [newSectionTitle, setNewSectionTitle] = useState("");
    const [editingModule, setEditingModule] = useState(null); // { sectionId, module: null | moduleData }

    useEffect(() => {
        if (!courseId) return;

        // Real-time listener for sections
        const q = query(collection(db, "courses", courseId, "sections"), orderBy("order", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sectionsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSections(sectionsData);

            // Calculate total modules and update course document
            const totalModules = sectionsData.reduce((acc, section) => acc + (section.modules?.length || 0), 0);
            updateDoc(doc(db, "courses", courseId), { totalModules }).catch(err => console.error("Error updating total modules:", err));
        });

        return () => unsubscribe();
    }, [courseId]);

    const handleAddSection = async (e) => {
        e.preventDefault();
        if (!newSectionTitle.trim()) return;

        try {
            await addDoc(collection(db, "courses", courseId, "sections"), {
                title: newSectionTitle,
                order: sections.length,
                modules: [] // We'll store modules as an array in the section doc for simplicity, or subcollection? 
                // Plan says "modules (array)" inside sections.
            });
            setNewSectionTitle("");
        } catch (error) {
            console.error("Error adding section:", error);
        }
    };

    const handleDeleteSection = async (sectionId) => {
        if (window.confirm("Delete this section and all its modules?")) {
            try {
                await deleteDoc(doc(db, "courses", courseId, "sections", sectionId));
            } catch (error) {
                console.error("Error deleting section:", error);
            }
        }
    };

    const handleAddModule = (sectionId, type) => {
        setEditingModule({
            sectionId,
            module: {
                id: Date.now().toString(), // Temporary ID for new module
                title: "",
                type,
                content: ""
            },
            isNew: true
        });
    };

    const handleEditModule = (sectionId, module) => {
        setEditingModule({
            sectionId,
            module,
            isNew: false
        });
    };

    const handleSaveModule = async (sectionId, moduleData) => {
        try {
            const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
            const section = sections.find(s => s.id === sectionId);
            let newModules = [...(section.modules || [])];

            if (editingModule.isNew) {
                newModules.push(moduleData);
            } else {
                newModules = newModules.map(m => m.id === moduleData.id ? moduleData : m);
            }

            await updateDoc(sectionRef, { modules: newModules });
            setEditingModule(null);
        } catch (error) {
            console.error("Error saving module:", error);
        }
    };

    const handleDeleteModule = async (sectionId, moduleId) => {
        if (window.confirm("Delete this module?")) {
            try {
                const sectionRef = doc(db, "courses", courseId, "sections", sectionId);
                const section = sections.find(s => s.id === sectionId);
                const newModules = section.modules.filter(m => m.id !== moduleId);
                await updateDoc(sectionRef, { modules: newModules });
            } catch (error) {
                console.error("Error deleting module:", error);
            }
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Curriculum</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Sections List */}
                    <div className="space-y-4">
                        {sections.map((section) => (
                            <div key={section.id} className="border rounded-lg p-4 bg-card">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                                        <h3 className="font-semibold text-lg">{section.title}</h3>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteSection(section.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>

                                {/* Modules List */}
                                <div className="space-y-2 pl-6">
                                    {section.modules?.map((module) => (
                                        <div
                                            key={module.id}
                                            className="flex items-center justify-between p-3 bg-muted/50 rounded-md group"
                                        >
                                            <div className="flex items-center gap-3">
                                                {module.type === 'video' && <Video className="h-4 w-4" />}
                                                {module.type === 'text' && <FileText className="h-4 w-4" />}
                                                {module.type === 'quiz' && <HelpCircle className="h-4 w-4" />}
                                                <span>{module.title}</span>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditModule(section.id, module)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteModule(section.id, module.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add Module Buttons */}
                                    <div className="flex gap-2 mt-2">
                                        <Button variant="outline" size="sm" onClick={() => handleAddModule(section.id, 'video')}>
                                            <Plus className="h-3 w-3 mr-1" /> Video
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => handleAddModule(section.id, 'text')}>
                                            <Plus className="h-3 w-3 mr-1" /> Text
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => handleAddModule(section.id, 'quiz')}>
                                            <Plus className="h-3 w-3 mr-1" /> Quiz
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add Section */}
                    <form onSubmit={handleAddSection} className="flex gap-2 pt-4 border-t">
                        <Input
                            value={newSectionTitle}
                            onChange={(e) => setNewSectionTitle(e.target.value)}
                            placeholder="New Section Title"
                        />
                        <Button type="submit">Add Section</Button>
                    </form>
                </CardContent>
            </Card>

            {editingModule && (
                <ModuleEditor
                    isOpen={!!editingModule}
                    onClose={() => setEditingModule(null)}
                    onSave={(data) => handleSaveModule(editingModule.sectionId, data)}
                    initialData={editingModule.module}
                    courseId={courseId}
                />
            )}
        </div>
    );
}
