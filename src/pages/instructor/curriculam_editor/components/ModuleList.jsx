import { motion, AnimatePresence } from "framer-motion";
import { Video, FileText, HelpCircle, Trash2, Edit2, Clock, BarChart } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { deleteModule } from "../../../../services/moduleService";

export default function ModuleList({
    modules,
    sectionId,
    subSectionId,
    courseId,
    onEditModule,
    onDeleteModule
}) {
    if (!modules || modules.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-6 border-2 border-dashed rounded-lg"
            >
                <div className="text-muted-foreground mb-2">
                    <FileText className="h-8 w-8 mx-auto opacity-30" />
                </div>
                <p className="text-sm text-muted-foreground">No modules added yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                    Add modules using the buttons below
                </p>
            </motion.div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-muted-foreground">
                    Modules ({modules.length})
                </h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                        {calculateTotalDuration(modules)} total
                    </span>
                </div>
            </div>

            <AnimatePresence>
                {modules.map((module, index) => (
                    <ModuleItem
                        key={module.id || index}
                        module={module}
                        index={index}
                        sectionId={sectionId}
                        subSectionId={subSectionId}
                        courseId={courseId}
                        onEdit={() => onEditModule({
                            sectionId,
                            subSectionId,
                            module,
                            isNew: false
                        })}
                        onDelete={onDeleteModule}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

function ModuleItem({ module, index, sectionId, subSectionId, courseId, onEdit, onDelete }) {
    const getIcon = (type) => {
        switch (type) {
            case 'video':
                return <Video className="h-4 w-4 text-blue-500" />;
            case 'text':
                return <FileText className="h-4 w-4 text-green-500" />;
            case 'quiz':
                return <HelpCircle className="h-4 w-4 text-purple-500" />;
            default:
                return <FileText className="h-4 w-4 text-gray-500" />;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'video': return 'Video Lesson';
            case 'text': return 'Text Lesson';
            case 'quiz': return 'Quiz';
            default: return 'Module';
        }
    };

    const getDuration = (module) => {
        if (module.duration) return module.duration;
        if (module.type === 'video') return '15-30 min';
        if (module.type === 'quiz') return '10-20 min';
        return '20-40 min';
    };

    const handleDelete = async () => {
        if (window.confirm(`Delete "${module.title}"?`)) {
            try {
                await deleteModule(courseId, sectionId, subSectionId, module.id);
                if (onDelete) onDelete(module.id);
            } catch (error) {
                console.error("Error deleting module:", error);
                alert("Failed to delete module");
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.05 }}
            className="group"
        >
            <div className="flex items-center justify-between p-3 bg-card border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                        {getIcon(module.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">
                                {module.title || `Untitled ${getTypeLabel(module.type)}`}
                            </h4>
                            <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                                {getTypeLabel(module.type)}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{getDuration(module)}</span>
                            </div>

                            {module.type === 'quiz' && module.quizData && (
                                <div className="flex items-center gap-1">
                                    <BarChart className="h-3 w-3" />
                                    <span>{module.quizData.length} questions</span>
                                </div>
                            )}

                            <div className="flex-1"></div>

                            <span className="text-xs opacity-70">
                                Added {formatDate(module.createdAt || module.updatedAt)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onEdit}
                            className="h-8 w-8 p-0"
                        >
                            <Edit2 className="h-4 w-4" />
                        </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDelete}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}

// Helper Functions
function calculateTotalDuration(modules) {
    const durations = modules.map(module => {
        const duration = module.duration || '';
        const match = duration.match(/(\d+)/);
        return match ? parseInt(match[1]) : (module.type === 'video' ? 25 : 30);
    });

    const totalMinutes = durations.reduce((sum, minutes) => sum + minutes, 0);

    if (totalMinutes < 60) {
        return `${totalMinutes} min`;
    } else {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
    }
}

function formatDate(dateString) {
    if (!dateString) return 'recently';

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

// Module Statistics Component (optional)
export function ModuleStats({ modules }) {
    const stats = {
        video: modules.filter(m => m.type === 'video').length,
        text: modules.filter(m => m.type === 'text').length,
        quiz: modules.filter(m => m.type === 'quiz').length,
        total: modules.length
    };

    return (
        <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
            <StatItem
                label="Videos"
                value={stats.video}
                color="blue"
                icon={<Video className="h-4 w-4" />}
            />
            <StatItem
                label="Text"
                value={stats.text}
                color="green"
                icon={<FileText className="h-4 w-4" />}
            />
            <StatItem
                label="Quizzes"
                value={stats.quiz}
                color="purple"
                icon={<HelpCircle className="h-4 w-4" />}
            />
            <div className="ml-auto">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
            </div>
        </div>
    );
}

function StatItem({ label, value, color, icon }) {
    const colorClasses = {
        blue: 'text-blue-600 bg-blue-100',
        green: 'text-green-600 bg-green-100',
        purple: 'text-purple-600 bg-purple-100'
    };

    return (
        <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                {icon}
            </div>
            <div>
                <div className="font-semibold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
            </div>
        </div>
    );
}