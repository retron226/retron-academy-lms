import { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import {
    ChevronDown, ChevronRight, Trash2, Edit2, Clock,
    GripVertical, Plus, MoreVertical, Copy, Folder,
    Video, FileText, HelpCircle, BarChart
} from "lucide-react";
import ModuleList from "./ModuleList";
import AddModuleButtons from "./AddModuleButtons";
import { ModalContext } from "../../../../contexts/ModalContext";
import { useToast } from "../../../../contexts/ToastComponent";

// Default fallback functions to prevent crashes
const defaultModalFunctions = {
    showModal: () => Promise.resolve({}),
    showFormModal: () => Promise.resolve({}),
    showConfirmModal: () => Promise.resolve(false),
    showChoiceModal: () => Promise.resolve(null),
    showSelectModal: () => Promise.resolve(null),
    showMultiSelectModal: () => Promise.resolve([]),
    showCustomModal: () => Promise.resolve(null),
    closeModal: () => { },
    isOpen: false
};

export default function SubSectionList({
    subSections,
    sectionId,
    courseId,
    onEditModule,
    onAddSubSection,
    onEditSubSection,
    onDeleteSubSection,
    onDuplicateSubSection,
    className = ""
}) {
    const [expandedSubSections, setExpandedSubSections] = useState({});
    const [draggingSubSection, setDraggingSubSection] = useState(null);
    const [dragOverSubSection, setDragOverSubSection] = useState(null);

    // Get modal functions from context, use defaults if not available
    const modalContext = useContext(ModalContext);
    const {
        showFormModal,
        showConfirmModal
    } = modalContext || defaultModalFunctions;

    const { toast } = useToast();

    if (!subSections || subSections.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`text-center py-6 ${className}`}
            >
                <div className="inline-flex flex-col items-center p-6 border-2 border-dashed rounded-lg bg-muted/20">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <h4 className="font-medium mb-1">No Sub-sections Yet</h4>
                    <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                        Create sub-sections to organize content into smaller, manageable parts
                    </p>
                    <Button
                        onClick={handleAddSubSection}
                        variant="outline"
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add First Sub-section
                    </Button>
                </div>
            </motion.div>
        );
    }

    const toggleSubSection = (subSectionId) => {
        setExpandedSubSections(prev => ({
            ...prev,
            [subSectionId]: !prev[subSectionId]
        }));
    };

    const handleAddSubSection = async () => {
        try {
            // If parent provides onAddSubSection, use it
            if (onAddSubSection) {
                onAddSubSection();
                return;
            }

            // Check if modal functions are available
            if (typeof showFormModal !== 'function') {
                toast({
                    title: "Info",
                    description: "Add sub-section functionality is not available in this context",
                    variant: "default",
                });
                return;
            }

            const result = await showFormModal({
                title: "Add New Sub-Section",
                fields: [
                    {
                        name: "title",
                        label: "Sub-Section Title",
                        type: "text",
                        required: true,
                        placeholder: "Enter sub-section title",
                        defaultValue: "New Sub-Section"
                    },
                    {
                        name: "duration",
                        label: "Duration",
                        type: "text",
                        required: false,
                        placeholder: "e.g., 45 min",
                        defaultValue: "60 min"
                    },
                    {
                        name: "description",
                        label: "Description (Optional)",
                        type: "textarea",
                        required: false,
                        placeholder: "Enter description"
                    },
                    {
                        name: "objectives",
                        label: "Learning Objectives (Optional)",
                        type: "textarea",
                        required: false,
                        placeholder: "Enter comma-separated objectives"
                    }
                ],
                submitText: "Add Sub-Section",
                cancelText: "Cancel"
            });

            if (result) {
                toast({
                    title: "Info",
                    description: "Sub-section functionality will be implemented",
                    variant: "default",
                });
            }
        } catch (error) {
            console.error("Error adding sub-section:", error);
            toast({
                title: "Error",
                description: "Failed to add sub-section",
                variant: "destructive",
            });
        }
    };

    const handleEditSubSection = async (subSection) => {
        try {
            if (typeof showFormModal !== 'function') {
                toast({
                    title: "Info",
                    description: "Edit sub-section functionality is not available in this context",
                    variant: "default",
                });
                return;
            }

            const result = await showFormModal({
                title: "Edit Sub-Section",
                fields: [
                    {
                        name: "title",
                        label: "Sub-Section Title",
                        type: "text",
                        required: true,
                        defaultValue: subSection.title,
                        placeholder: "Enter sub-section title"
                    },
                    {
                        name: "duration",
                        label: "Duration",
                        type: "text",
                        required: false,
                        defaultValue: subSection.duration || "60 min",
                        placeholder: "e.g., 45 min"
                    },
                    {
                        name: "description",
                        label: "Description",
                        type: "textarea",
                        required: false,
                        defaultValue: subSection.description || "",
                        placeholder: "Enter description"
                    },
                    {
                        name: "objectives",
                        label: "Learning Objectives",
                        type: "textarea",
                        required: false,
                        defaultValue: subSection.objectives?.join(', ') || "",
                        placeholder: "Enter comma-separated objectives"
                    }
                ],
                submitText: "Save Changes",
                cancelText: "Cancel"
            });

            if (result && onEditSubSection) {
                onEditSubSection(subSection.id, {
                    ...subSection,
                    title: result.title,
                    duration: result.duration,
                    description: result.description,
                    objectives: result.objectives ? result.objectives.split(',').map(obj => obj.trim()).filter(obj => obj) : []
                });
                toast({
                    title: "Success",
                    description: "Sub-section updated successfully",
                    variant: "default",
                });
            }
        } catch (error) {
            console.error("Error editing sub-section:", error);
            toast({
                title: "Error",
                description: "Failed to edit sub-section",
                variant: "destructive",
            });
        }
    };

    const handleDeleteSubSection = async (subSectionId, subSectionTitle) => {
        try {
            if (typeof showConfirmModal !== 'function') {
                toast({
                    title: "Info",
                    description: "Delete functionality is not available in this context",
                    variant: "default",
                });
                return;
            }

            const confirmed = await showConfirmModal({
                title: "Delete Sub-Section",
                message: `Are you sure you want to delete "${subSectionTitle}"? This will also delete all modules within it.`,
                confirmText: "Delete",
                cancelText: "Cancel",
                variant: "destructive"
            });

            if (confirmed && onDeleteSubSection) {
                await onDeleteSubSection(subSectionId, subSectionTitle);
            }
        } catch (error) {
            console.error("Error deleting sub-section:", error);
            toast({
                title: "Error",
                description: "Failed to delete sub-section",
                variant: "destructive",
            });
        }
    };

    const handleDuplicateSubSection = async (subSection) => {
        try {
            if (typeof showFormModal !== 'function') {
                toast({
                    title: "Info",
                    description: "Duplicate functionality is not available in this context",
                    variant: "default",
                });
                return;
            }

            const result = await showFormModal({
                title: "Duplicate Sub-Section",
                fields: [{
                    name: "title",
                    label: "New Sub-Section Title",
                    type: "text",
                    required: true,
                    defaultValue: `${subSection.title} (Copy)`,
                    placeholder: "Enter new sub-section title"
                }],
                submitText: "Duplicate",
                cancelText: "Cancel"
            });

            if (result && onDuplicateSubSection) {
                await onDuplicateSubSection(subSection.id, result.title);
                toast({
                    title: "Success",
                    description: "Sub-section duplicated successfully",
                    variant: "default",
                });
            }
        } catch (error) {
            console.error("Error duplicating sub-section:", error);
            toast({
                title: "Error",
                description: "Failed to duplicate sub-section",
                variant: "destructive",
            });
        }
    };

    const handleDragStart = (e, subSectionId) => {
        setDraggingSubSection(subSectionId);
        e.dataTransfer.setData('text/plain', subSectionId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, subSectionId) => {
        e.preventDefault();
        setDragOverSubSection(subSectionId);
    };

    const handleDragLeave = () => {
        setDragOverSubSection(null);
    };

    const handleDrop = async (e, targetSubSectionId) => {
        e.preventDefault();
        const draggedSubSectionId = e.dataTransfer.getData('text/plain');

        if (draggedSubSectionId === targetSubSectionId) {
            setDragOverSubSection(null);
            return;
        }

        try {
            if (typeof showConfirmModal !== 'function') {
                toast({
                    title: "Info",
                    description: "Drag and drop functionality is not available in this context",
                    variant: "default",
                });
                return;
            }

            const confirmed = await showConfirmModal({
                title: "Reorder Sub-Sections",
                message: "Are you sure you want to move this sub-section?",
                confirmText: "Move",
                cancelText: "Cancel"
            });

            if (confirmed) {
                // Implement reorderSubSections function
                console.log(`Move sub-section ${draggedSubSectionId} to position of ${targetSubSectionId}`);
                toast({
                    title: "Success",
                    description: "Sub-section moved successfully",
                    variant: "default",
                });
            }
        } catch (error) {
            console.error("Error moving sub-section:", error);
            toast({
                title: "Error",
                description: "Failed to move sub-section",
                variant: "destructive",
            });
        }

        setDragOverSubSection(null);
        setDraggingSubSection(null);
    };

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Sub-sections Header with Stats */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Sub-sections</h3>
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                        {subSections.length} {subSections.length === 1 ? 'part' : 'parts'}
                    </span>
                    <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full">
                        {subSections.reduce((sum, sub) => sum + (sub.modules?.length || 0), 0)} modules
                    </span>
                </div>
            </div>

            {/* Sub-sections Stats */}
            <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded">
                    <Video className="h-3 w-3 text-blue-600" />
                    <span className="font-medium">{subSections.reduce((sum, sub) => sum + (sub.modules?.filter(m => m.type === 'video').length || 0), 0)}</span>
                    <span className="text-muted-foreground">videos</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded">
                    <FileText className="h-3 w-3 text-green-600" />
                    <span className="font-medium">{subSections.reduce((sum, sub) => sum + (sub.modules?.filter(m => m.type === 'text').length || 0), 0)}</span>
                    <span className="text-muted-foreground">texts</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded">
                    <HelpCircle className="h-3 w-3 text-purple-600" />
                    <span className="font-medium">{subSections.reduce((sum, sub) => sum + (sub.modules?.filter(m => m.type === 'quiz').length || 0), 0)}</span>
                    <span className="text-muted-foreground">quizzes</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded">
                    <Clock className="h-3 w-3 text-amber-600" />
                    <span className="font-medium">
                        {subSections.reduce((sum, sub) => sum + (parseDuration(sub.duration) || 0), 0)} min
                    </span>
                    <span className="text-muted-foreground">total</span>
                </div>
            </div>

            {/* Sub-sections List */}
            <div className="space-y-2">
                {subSections.map((subSection, index) => (
                    <SubSectionItem
                        key={subSection.id}
                        subSection={subSection}
                        index={index}
                        sectionId={sectionId}
                        courseId={courseId}
                        isExpanded={expandedSubSections[subSection.id]}
                        isDragging={draggingSubSection === subSection.id}
                        isDragOver={dragOverSubSection === subSection.id}
                        onToggle={() => toggleSubSection(subSection.id)}
                        onEdit={() => handleEditSubSection(subSection)}
                        onDelete={() => handleDeleteSubSection(subSection.id, subSection.title)}
                        onDuplicate={() => handleDuplicateSubSection(subSection)}
                        onEditModule={onEditModule}
                        onDragStart={(e) => handleDragStart(e, subSection.id)}
                        onDragOver={(e) => handleDragOver(e, subSection.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, subSection.id)}
                    />
                ))}
            </div>

            {/* Add Sub-section Button */}
            <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="pt-2"
            >
                <Button
                    onClick={handleAddSubSection}
                    variant="outline"
                    className="w-full gap-2 border-dashed"
                >
                    <Plus className="h-4 w-4" />
                    Add Another Sub-section
                </Button>
            </motion.div>
        </div>
    );
}

function SubSectionItem({
    subSection,
    index,
    sectionId,
    courseId,
    isExpanded,
    isDragging,
    isDragOver,
    onToggle,
    onEdit,
    onDelete,
    onDuplicate,
    onEditModule,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop
}) {
    const [showOptions, setShowOptions] = useState(false);

    // Calculate module stats
    const moduleStats = {
        total: subSection.modules?.length || 0,
        video: subSection.modules?.filter(m => m.type === 'video').length || 0,
        text: subSection.modules?.filter(m => m.type === 'text').length || 0,
        quiz: subSection.modules?.filter(m => m.type === 'quiz').length || 0
    };

    // Handle editing a module - this will prefill the content
    const handleEditModule = (module) => {
        if (onEditModule) {
            onEditModule({
                sectionId,
                subSectionId: subSection.id,
                module: {
                    id: module.id,
                    title: module.title || "",
                    type: module.type || "text",
                    content: module.content || "",
                    description: module.description || "",
                    duration: module.duration || "10 min",
                    isActive: module.isActive !== false,
                    // Include additional module-specific data
                    videoUrl: module.videoUrl || "",
                    transcript: module.transcript || "",
                    quizQuestions: module.quizQuestions || [],
                    attachments: module.attachments || [],
                    tags: module.tags || [],
                    objectives: module.objectives || []
                },
                isNew: false // This is an edit, not a new module
            });
        }
    };

    // Handle adding a new module
    const handleAddModule = (type) => {
        if (onEditModule) {
            onEditModule({
                sectionId,
                subSectionId: subSection.id,
                module: {
                    id: Date.now().toString(),
                    title: "",
                    type,
                    content: "",
                    description: "",
                    duration: type === 'video' ? "15 min" : type === 'quiz' ? "10 min" : "5 min",
                    isActive: true,
                    // Initialize type-specific fields
                    videoUrl: type === 'video' ? "" : undefined,
                    quizQuestions: type === 'quiz' ? [] : undefined,
                    attachments: [],
                    tags: [],
                    objectives: []
                },
                isNew: true // This is a new module
            });
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{
                opacity: 1,
                y: 0,
                scale: isDragOver ? 1.02 : 1,
                backgroundColor: isDragOver ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
            }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
            }}
            className={`relative border rounded-lg overflow-hidden ${isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-pointer'} ${isDragOver ? 'border-primary ring-2 ring-primary/20' : ''}`}
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            {/* Sub-section Header */}
            <div
                className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3 flex-1">
                    {/* Drag Handle */}
                    <div
                        className="cursor-move opacity-60 hover:opacity-100 transition-opacity"
                        draggable
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                    >
                        {isExpanded ?
                            <ChevronDown className="h-4 w-4" /> :
                            <ChevronRight className="h-4 w-4" />
                        }
                    </Button>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <Folder className="h-4 w-4 text-primary flex-shrink-0" />
                            <h4 className="font-medium truncate">
                                {subSection.title || `Sub-section ${index + 1}`}
                            </h4>
                            <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded flex-shrink-0">
                                #{index + 1}
                            </span>
                            {!subSection.isActive && (
                                <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded flex-shrink-0">
                                    Draft
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{subSection.duration || "60 min"}</span>
                            </div>

                            {moduleStats.total > 0 && (
                                <>
                                    <div className="flex items-center gap-1">
                                        <Video className="h-3 w-3 text-blue-500" />
                                        <span>{moduleStats.video}</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <FileText className="h-3 w-3 text-green-500" />
                                        <span>{moduleStats.text}</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <HelpCircle className="h-3 w-3 text-purple-500" />
                                        <span>{moduleStats.quiz}</span>
                                    </div>
                                </>
                            )}

                            {subSection.createdAt && (
                                <span className="text-xs opacity-70 ml-auto">
                                    {formatRelativeDate(subSection.createdAt)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    {moduleStats.total > 0 && (
                        <span className="text-xs px-2 py-1 bg-muted rounded-full">
                            {moduleStats.total} modules
                        </span>
                    )}

                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowOptions(!showOptions)}
                            className="h-8 w-8 p-0"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>

                        <AnimatePresence>
                            {showOptions && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                    className="absolute right-0 top-full mt-1 w-56 bg-popover border rounded-lg shadow-lg z-10"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="p-2 space-y-1">
                                        {onEdit && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    onEdit();
                                                    setShowOptions(false);
                                                }}
                                                className="w-full justify-start gap-2 h-9"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                                Edit Sub-section
                                            </Button>
                                        )}
                                        {onDuplicate && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    onDuplicate();
                                                    setShowOptions(false);
                                                }}
                                                className="w-full justify-start gap-2 h-9"
                                            >
                                                <Copy className="h-4 w-4" />
                                                Duplicate
                                            </Button>
                                        )}
                                        {onDelete && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    onDelete();
                                                    setShowOptions(false);
                                                }}
                                                className="w-full justify-start gap-2 h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Delete
                                            </Button>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Sub-section Content (Collapsible) */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t"
                    >
                        <Card className="border-0 rounded-none shadow-none">
                            <CardContent className="p-4 space-y-4">
                                {/* Sub-section Description */}
                                {subSection.description && (
                                    <div className="p-3 bg-muted/30 rounded-lg">
                                        <p className="text-sm text-muted-foreground">{subSection.description}</p>
                                    </div>
                                )}

                                {/* Learning Objectives */}
                                {subSection.objectives && subSection.objectives.length > 0 && (
                                    <div className="space-y-2">
                                        <h5 className="text-sm font-medium">Learning Objectives</h5>
                                        <ul className="space-y-1">
                                            {subSection.objectives.map((objective, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                                                    <span>{objective}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Module List */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-sm font-medium">Modules</h5>
                                        {moduleStats.total > 0 && (
                                            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                                                {moduleStats.total} module{moduleStats.total !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                    <ModuleList
                                        modules={subSection.modules || []}
                                        sectionId={sectionId}
                                        subSectionId={subSection.id}
                                        courseId={courseId}
                                        onEditModule={handleEditModule}
                                    />
                                </div>

                                {/* Add Module Buttons */}
                                <div className="pt-2">
                                    <AddModuleButtons
                                        sectionId={sectionId}
                                        subSectionId={subSection.id}
                                        courseId={courseId}
                                        onAddModule={handleAddModule}
                                        compact
                                    />
                                </div>

                                {/* Metadata */}
                                <div className="pt-3 border-t text-xs text-muted-foreground">
                                    <div className="flex items-center gap-4">
                                        {subSection.createdAt && (
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                <span>Created: {formatDate(subSection.createdAt)}</span>
                                            </div>
                                        )}
                                        {subSection.updatedAt && subSection.createdAt !== subSection.updatedAt && (
                                            <div className="flex items-center gap-1">
                                                <span>Updated: {formatDate(subSection.updatedAt)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Helper function to parse duration string to minutes
function parseDuration(durationString) {
    if (!durationString) return 60;

    const match = durationString.match(/(\d+)\s*(min|minutes|hour|hours|h|m)/i);
    if (!match) return 60;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    if (unit.includes('hour') || unit === 'h') {
        return value * 60;
    }
    return value; // minutes
}

// Helper Functions
function formatRelativeDate(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

function formatDate(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}