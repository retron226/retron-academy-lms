import { useState } from "react";
import { Loader2, X, Youtube, Type, Maximize2, Image, Table } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RestrictedYouTubeEmbed from "./RestrictedYouTubeEmbed";
import QuizEditor from "./QuizEditor";
import RichTextEditor from "./RichTextEditor";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { saveModule } from "../../../../services/moduleService";

export default function ModuleEditor({ isOpen, onClose, moduleData, courseId }) {
    const [module, setModule] = useState(moduleData.module);
    const [loading, setLoading] = useState(false);
    const [videoUrl, setVideoUrl] = useState("");
    const [showRichTextEditor, setShowRichTextEditor] = useState(false);

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await saveModule({
                courseId,
                sectionId: moduleData.sectionId,
                subSectionId: moduleData.subSectionId,
                module,
                isNew: moduleData.isNew,
                videoUrl
            });
            onClose();
        } catch (error) {
            console.log(moduleData);
            console.error("Error saving module:", error);
            alert("Failed to save module");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader moduleType={module.type} onClose={onClose} />

            <form onSubmit={handleSave} className="space-y-4">
                <TitleInput module={module} setModule={setModule} />

                {module.type === 'video' && (
                    <VideoEditor
                        videoUrl={videoUrl}
                        setVideoUrl={setVideoUrl}
                        currentContent={module.content}
                    />
                )}

                {module.type === 'text' && (
                    <TextEditor
                        module={module}
                        setModule={setModule}
                        showRichTextEditor={showRichTextEditor}
                        setShowRichTextEditor={setShowRichTextEditor}
                    />
                )}

                {module.type === 'quiz' && (
                    <QuizEditor module={module} setModule={setModule} />
                )}

                <ModalActions loading={loading} onClose={onClose} />
            </form>
        </Modal>
    );
}

function Modal({ isOpen, onClose, children }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-background w-full max-w-2xl rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto"
            >
                {children}
            </motion.div>
        </motion.div>
    );
}

function ModalHeader({ moduleType, onClose }) {
    const titles = {
        'video': "Add Video Lesson",
        'text': "Add Text Lesson",
        'quiz': "Add Quiz"
    };

    return (
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{titles[moduleType]}</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}

function TitleInput({ module, setModule }) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
                required
                value={module.title}
                onChange={(e) => setModule({ ...module, title: e.target.value })}
                placeholder="Module Title"
            />
        </div>
    );
}

function VideoEditor({ videoUrl, setVideoUrl, currentContent }) {
    const extractYouTubeId = (url) => {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    };

    const youtubeId = extractYouTubeId(videoUrl || currentContent);

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">YouTube Video URL</label>
                <div className="flex gap-2">
                    <Input
                        value={videoUrl || currentContent}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="flex-1"
                    />
                    <Youtube className="h-10 w-10 text-red-500" />
                </div>
            </div>

            {youtubeId && (
                <RestrictedYouTubeEmbed videoId={youtubeId} />
            )}
        </div>
    );
}

function TextEditor({ module, setModule, showRichTextEditor, setShowRichTextEditor }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Content</label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRichTextEditor(true)}
                >
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Open Enhanced Editor
                </Button>
            </div>
            <textarea
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={module.content}
                onChange={(e) => setModule({ ...module, content: e.target.value })}
                placeholder="# Lesson Content..."
            />

            <AnimatePresence>
                {showRichTextEditor && (
                    <RichTextEditor
                        content={module.content}
                        onChange={(content) => setModule({ ...module, content })}
                        onClose={() => setShowRichTextEditor(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function ModalActions({ loading, onClose }) {
    return (
        <div className="flex justify-end gap-2 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
                Cancel
            </Button>
            <Button type="submit" disabled={loading} className="relative overflow-hidden">
                {loading && (
                    <motion.div
                        className="absolute inset-0 bg-primary/20"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ repeat: Infinity, duration: 1 }}
                    />
                )}
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Module
            </Button>
        </div>
    );
}