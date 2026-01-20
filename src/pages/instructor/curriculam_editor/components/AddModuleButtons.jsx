import { Plus, Video, FileText, HelpCircle, Sparkles, Zap, Layout, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Button } from "../../../../components/ui/button";

export default function AddModuleButtons({
    sectionId,
    subSectionId,
    onAddModule,
    size = "default",
    variant = "outline",
    className = "",
    showLabel = true,
    compact = false,
    onQuickAdd = null
}) {
    const [expanded, setExpanded] = useState(false);
    const [showMoreOptions, setShowMoreOptions] = useState(false);

    const moduleTypes = [
        {
            type: 'video',
            label: 'Video Lesson',
            icon: <Video className="h-4 w-4" />,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
            description: 'Add a video lesson with YouTube integration',
            quickTemplates: [
                { title: 'Lecture Video', duration: '30 min' },
                { title: 'Tutorial Video', duration: '15 min' },
                { title: 'Demo Video', duration: '20 min' }
            ]
        },
        {
            type: 'text',
            label: 'Text Lesson',
            icon: <FileText className="h-4 w-4" />,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
            description: 'Create a rich text lesson with formatting',
            quickTemplates: [
                { title: 'Theory Lesson', duration: '25 min' },
                { title: 'Reading Material', duration: '40 min' },
                { title: 'Study Guide', duration: '30 min' }
            ]
        },
        {
            type: 'quiz',
            label: 'Quiz',
            icon: <HelpCircle className="h-4 w-4" />,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100',
            description: 'Add an interactive quiz with questions',
            quickTemplates: [
                { title: 'Quick Quiz', questions: 5 },
                { title: 'Assessment', questions: 10 },
                { title: 'Practice Test', questions: 20 }
            ]
        }
    ];

    const additionalTypes = [
        {
            type: 'assignment',
            label: 'Assignment',
            icon: <Layout className="h-4 w-4" />,
            color: 'text-orange-600',
            bgColor: 'bg-orange-100',
            description: 'Create a project or assignment'
        },
        {
            type: 'file',
            label: 'File Upload',
            icon: <FileText className="h-4 w-4" />,
            color: 'text-gray-600',
            bgColor: 'bg-gray-100',
            description: 'Upload PDFs, documents, or presentations'
        },
        {
            type: 'link',
            label: 'External Link',
            icon: <Zap className="h-4 w-4" />,
            color: 'text-pink-600',
            bgColor: 'bg-pink-100',
            description: 'Link to external resources or websites'
        }
    ];

    const handleQuickAdd = (moduleType, template) => {
        if (onQuickAdd) {
            onQuickAdd({
                type: moduleType,
                title: template.title,
                duration: template.duration || `${template.questions || 5} questions`
            });
        } else {
            // Default behavior
            onAddModule(moduleType);
        }
    };

    if (compact) {
        return (
            <div className={`flex gap-2 ${className}`}>
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                >
                    <Button
                        variant={variant}
                        size={size}
                        onClick={() => setExpanded(!expanded)}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        {showLabel && "Add Module"}
                    </Button>

                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute bottom-full left-0 mb-2 w-64 bg-popover border rounded-lg shadow-lg z-50"
                            >
                                <div className="p-2">
                                    <h4 className="text-sm font-medium px-2 py-1 mb-1">Add Module</h4>
                                    <div className="space-y-1">
                                        {moduleTypes.map((module) => (
                                            <Button
                                                key={module.type}
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    onAddModule(module.type);
                                                    setExpanded(false);
                                                }}
                                                className="w-full justify-start gap-2"
                                            >
                                                <span className={`p-1 rounded ${module.bgColor} ${module.color}`}>
                                                    {module.icon}
                                                </span>
                                                {module.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {onQuickAdd && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                            variant="outline"
                            size={size}
                            onClick={() => setShowMoreOptions(!showMoreOptions)}
                            className="gap-2"
                        >
                            <Sparkles className="h-4 w-4" />
                            Quick Add
                        </Button>
                    </motion.div>
                )}
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Main Add Module Buttons */}
            <div className="flex flex-wrap gap-3">
                {moduleTypes.map((module) => (
                    <ModuleTypeButton
                        key={module.type}
                        module={module}
                        onAdd={() => onAddModule(module.type)}
                        onQuickAdd={(template) => handleQuickAdd(module.type, template)}
                        showQuickAdd={onQuickAdd}
                        size={size}
                        variant={variant}
                    />
                ))}

                {/* More Options Button */}
                <div className="relative">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                            variant="outline"
                            size={size}
                            onClick={() => setShowMoreOptions(!showMoreOptions)}
                            className="gap-2"
                        >
                            <MoreVertical className="h-4 w-4" />
                            More
                        </Button>
                    </motion.div>

                    <AnimatePresence>
                        {showMoreOptions && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute left-0 mt-2 w-56 bg-popover border rounded-lg shadow-lg z-50"
                            >
                                <div className="p-2">
                                    <h4 className="text-sm font-medium px-2 py-1 mb-1">Additional Module Types</h4>
                                    <div className="space-y-1">
                                        {additionalTypes.map((module) => (
                                            <Button
                                                key={module.type}
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    onAddModule(module.type);
                                                    setShowMoreOptions(false);
                                                }}
                                                className="w-full justify-start gap-2"
                                            >
                                                <span className={`p-1 rounded ${module.bgColor} ${module.color}`}>
                                                    {module.icon}
                                                </span>
                                                {module.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Quick Add Templates */}
            {onQuickAdd && (
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 bg-muted/30 rounded-lg border">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    <h4 className="font-medium">Quick Add Templates</h4>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {moduleTypes.map((moduleType) => (
                                        <div key={moduleType.type} className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg ${moduleType.bgColor}`}>
                                                    {moduleType.icon}
                                                </div>
                                                <span className="text-sm font-medium">{moduleType.label}</span>
                                            </div>
                                            <div className="space-y-1">
                                                {moduleType.quickTemplates.map((template, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleQuickAdd(moduleType.type, template)}
                                                            className="w-full justify-start text-left h-auto py-2"
                                                        >
                                                            <div className="flex-1">
                                                                <div className="font-medium text-sm">{template.title}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {template.duration || `${template.questions} questions`}
                                                                </div>
                                                            </div>
                                                        </Button>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* Toggle Quick Add Button */}
            {onQuickAdd && (
                <div className="text-center">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpanded(!expanded)}
                            className="gap-2"
                        >
                            <Sparkles className="h-4 w-4" />
                            {expanded ? 'Hide Templates' : 'Show Quick Templates'}
                            <motion.span
                                animate={{ rotate: expanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                ▼
                            </motion.span>
                        </Button>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

function ModuleTypeButton({ module, onAdd, onQuickAdd, showQuickAdd, size, variant }) {
    const [showQuickOptions, setShowQuickOptions] = useState(false);

    return (
        <div className="relative group">
            <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center"
            >
                <Button
                    variant={variant}
                    size={size}
                    onClick={onAdd}
                    className="gap-2 min-w-[140px]"
                >
                    <span className={`p-1.5 rounded-lg ${module.bgColor} ${module.color}`}>
                        {module.icon}
                    </span>
                    {module.label}
                </Button>

                {/* Quick Add Indicator */}
                {showQuickAdd && (
                    <button
                        onClick={() => setShowQuickOptions(!showQuickOptions)}
                        className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-white rounded-full flex items-center justify-center text-xs hover:bg-primary/90 transition-colors"
                    >
                        <Sparkles className="h-3 w-3" />
                    </button>
                )}
            </motion.div>

            {/* Quick Add Popup */}
            <AnimatePresence>
                {showQuickOptions && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute top-full left-0 mt-2 w-48 bg-popover border rounded-lg shadow-lg z-50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-2">
                            <h4 className="text-sm font-medium mb-2">{module.label} Templates</h4>
                            <div className="space-y-1">
                                {module.quickTemplates.map((template, idx) => (
                                    <Button
                                        key={idx}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            onQuickAdd(template);
                                            setShowQuickOptions(false);
                                        }}
                                        className="w-full justify-start text-left h-auto py-2"
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{template.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {template.duration || `${template.questions} questions`}
                                            </div>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Component for displaying module type statistics
export function ModuleTypeStats({ modules = [] }) {
    const stats = {
        video: modules.filter(m => m.type === 'video').length,
        text: modules.filter(m => m.type === 'text').length,
        quiz: modules.filter(m => m.type === 'quiz').length,
        assignment: modules.filter(m => m.type === 'assignment').length,
        total: modules.length
    };

    return (
        <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
            {stats.video > 0 && (
                <StatItem
                    icon={<Video className="h-4 w-4" />}
                    count={stats.video}
                    label="Videos"
                    color="blue"
                />
            )}
            {stats.text > 0 && (
                <StatItem
                    icon={<FileText className="h-4 w-4" />}
                    count={stats.text}
                    label="Texts"
                    color="green"
                />
            )}
            {stats.quiz > 0 && (
                <StatItem
                    icon={<HelpCircle className="h-4 w-4" />}
                    count={stats.quiz}
                    label="Quizzes"
                    color="purple"
                />
            )}
            {stats.assignment > 0 && (
                <StatItem
                    icon={<Layout className="h-4 w-4" />}
                    count={stats.assignment}
                    label="Assignments"
                    color="orange"
                />
            )}
            <div className="ml-auto text-right">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total Modules</div>
            </div>
        </div>
    );
}

function StatItem({ icon, count, label, color }) {
    const colorClasses = {
        blue: 'text-blue-600 bg-blue-100',
        green: 'text-green-600 bg-green-100',
        purple: 'text-purple-600 bg-purple-100',
        orange: 'text-orange-600 bg-orange-100'
    };

    return (
        <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                {icon}
            </div>
            <div>
                <div className="font-semibold">{count}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
            </div>
        </div>
    );
}