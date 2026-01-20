import { useState, useEffect } from "react";
import { Loader2, X, Youtube, Type, Maximize2, Image, Table } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RestrictedYouTubeEmbed from "./RestrictedYouTubeEmbed";
import QuizEditor from "./QuizEditor";
import RichTextEditor from "./RichTextEditor";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { saveModule, debugFindModule } from "../../../../services/moduleService";
import { getAuth } from "firebase/auth";

export default function ModuleEditor({ isOpen, onClose, moduleData, courseId }) {
    console.log("📋 ModuleEditor received data:", JSON.stringify(moduleData, null, 2));
    console.log("📋 Module content in props:", moduleData?.module?.content);
    console.log("📋 Content length:", moduleData?.module?.content?.length || 0);
    console.log("📋 isNew flag:", moduleData?.isNew);

    const [module, setModule] = useState({
        id: Date.now().toString(),
        title: "",
        type: "text",
        content: "",
        order: 0
    });

    const [loading, setLoading] = useState(false);
    const [videoUrl, setVideoUrl] = useState("");
    const [showRichTextEditor, setShowRichTextEditor] = useState(false);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (moduleData.module) {
            setModule({
                id: moduleData.module.id,
                title: moduleData.module.title,
                type: moduleData.module.type,
                content: moduleData.module.content,  // ← THIS WILL NOW BE SET!
                order: moduleData.module.order || 0
            });
        }
    }, [moduleData]);

    // FIXED: Reset and update module state when moduleData changes
    useEffect(() => {
        console.log("🔄 useEffect triggered with moduleData:", moduleData);

        if (!moduleData) {
            console.log("No moduleData, resetting form");
            setModule({
                id: Date.now().toString(),
                title: "",
                type: "text",
                content: "",
                order: 0
            });
            setVideoUrl("");
            setInitialized(false);
            return;
        }

        // Debug: Check what's actually in Firestore
        if (moduleData.module?.id && !moduleData.isNew) {
            console.log("🔍 Fetching module from Firestore for debugging...");
            debugFindModule(
                courseId,
                moduleData.sectionId,
                moduleData.subSectionId,
                moduleData.module.id
            ).then(foundModule => {
                console.log("🔍 Debug found module:", foundModule);
            });
        }

        if (moduleData.module) {
            console.log("📥 Setting module from moduleData:");
            console.log("Module ID:", moduleData.module.id);
            console.log("Module title:", moduleData.module.title);
            console.log("Module content:", moduleData.module.content);
            console.log("Content length:", moduleData.module.content?.length || 0);

            const newModuleState = {
                id: moduleData.module.id || Date.now().toString(),
                title: moduleData.module.title || "",
                type: moduleData.module.type || "text",
                content: moduleData.module.content || "",
                order: moduleData.module.order || 0
            };

            console.log("📥 New module state:", newModuleState);
            setModule(newModuleState);

            // Also update videoUrl if it's a video module
            if (moduleData.module.type === 'video' && moduleData.module.content) {
                console.log("📥 Setting video URL:", moduleData.module.content);
                setVideoUrl(moduleData.module.content);
            } else {
                setVideoUrl("");
            }

            setInitialized(true);
        } else {
            // For new modules
            console.log("📥 Setting up new module with type:", moduleData.type);
            const newModule = {
                id: Date.now().toString(),
                title: "",
                type: moduleData.type || "text",
                content: "",
                order: 0
            };
            console.log("📥 New module:", newModule);
            setModule(newModule);
            setVideoUrl("");
            setInitialized(true);
        }
    }, [moduleData, courseId]); // Depend on the entire moduleData object

    // Debug: Log current module state
    useEffect(() => {
        if (initialized) {
            console.log("📊 Current module state:", {
                id: module.id,
                title: module.title,
                type: module.type,
                contentLength: module.content?.length || 0,
                contentPreview: module.content?.substring(0, 100)
            });
            console.log("📊 Current videoUrl:", videoUrl);
        }
    }, [module, videoUrl, initialized]);

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault(); // Prevent default form submission
        e.stopPropagation(); // Stop event bubbling

        console.log("💾 SAVE CLICKED - Starting save process...");
        console.log("📤 Module data to save:", {
            courseId,
            sectionId: moduleData.sectionId,
            subSectionId: moduleData.subSectionId,
            module: {
                ...module,
                contentLength: module.content?.length || 0
            },
            isNew: moduleData.isNew,
            videoUrl
        });

        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
            console.error("No authenticated user");
            alert("Please log in to save modules");
            return;
        }

        // Validate required fields
        if (!module.title.trim()) {
            alert("Please enter a module title");
            return;
        }

        if (!module.content.trim() && module.type === 'text') {
            if (!confirm("Content is empty. Save anyway?")) {
                return;
            }
        }

        setLoading(true);

        try {
            console.log("📤 Attempting to save module...");

            const savedModule = await saveModule({
                courseId,
                sectionId: moduleData.sectionId,
                subSectionId: moduleData.subSectionId,
                module,
                isNew: moduleData.isNew,
                videoUrl
            });

            console.log("✅ Module saved successfully:", savedModule);

            // Show success message
            alert("Module saved successfully!");

            // Call onClose to close the modal
            onClose();

            // Optional: Trigger a custom event to refresh parent component
            window.dispatchEvent(new CustomEvent('module-saved', {
                detail: {
                    courseId,
                    sectionId: moduleData.sectionId,
                    subSectionId: moduleData.subSectionId,
                    module: savedModule
                }
            }));

        } catch (error) {
            console.error("❌ Error saving module:", error);
            console.error("Error details:", {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            alert(`Failed to save module: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalHeader
                moduleType={module.type}
                isNew={moduleData?.isNew}
                onClose={onClose}
            />

            <form
                onSubmit={handleSave}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.type !== 'textarea') {
                        e.preventDefault(); // Prevent form submission on Enter key
                    }
                }}
                className="space-y-4"
            >
                <div className="text-xs text-gray-500 mb-2">
                    <div>Path: courses/{courseId}/sections/{moduleData?.sectionId}
                        {moduleData?.subSectionId && `/subSections/${moduleData.subSectionId}`}
                        /modules/{module.id || "new"}</div>
                    <div className="mt-1 flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${moduleData?.isNew ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                            {moduleData?.isNew ? 'NEW MODULE' : 'EDITING EXISTING MODULE'}
                        </span>
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                            Type: {module.type.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                            Content: {module.content?.length || 0} chars
                        </span>
                    </div>
                </div>

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
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
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

function ModalHeader({ moduleType, isNew, onClose }) {
    // FIXED: Show "Edit" instead of "Add" when editing existing module
    const titles = {
        'video': isNew ? "Add Video Lesson" : "Edit Video Lesson",
        'text': isNew ? "Add Text Lesson" : "Edit Text Lesson",
        'quiz': isNew ? "Add Quiz" : "Edit Quiz"
    };

    const title = titles[moduleType] || (isNew ? "Add Module" : "Edit Module");

    return (
        <div className="flex items-center justify-between mb-4">
            <div>
                <h2 className="text-xl font-bold">{title}</h2>
                <p className="text-sm text-gray-500">
                    {isNew ? 'Create a new module' : 'Update existing module'}
                </p>
            </div>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="hover:bg-gray-100"
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}

function TitleInput({ module, setModule }) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input
                required
                value={module.title}
                onChange={(e) => setModule({ ...module, title: e.target.value })}
                placeholder="Module Title"
                className="w-full"
            />
        </div>
    );
}

function VideoEditor({ videoUrl, setVideoUrl, currentContent }) {
    const extractYouTubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    };

    const youtubeId = extractYouTubeId(videoUrl || currentContent);

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">YouTube Video URL *</label>
                <div className="flex gap-2 items-center">
                    <Input
                        value={videoUrl || currentContent}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="flex-1"
                        required
                    />
                    <div className="p-2 border rounded">
                        <Youtube className="h-6 w-6 text-red-500" />
                    </div>
                </div>
                <p className="text-xs text-gray-500">
                    Enter a valid YouTube URL. The video will be embedded in your course.
                </p>
            </div>

            {youtubeId && (
                <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Preview:</p>
                    <RestrictedYouTubeEmbed videoId={youtubeId} />
                </div>
            )}
        </div>
    );
}

function TextEditor({ module, setModule, showRichTextEditor, setShowRichTextEditor }) {
    // Debug: Log the content being displayed
    useEffect(() => {
        console.log("📝 TextEditor content DEBUG:");
        console.log("Content:", module.content);
        console.log("Content length:", module.content?.length || 0);
        console.log("Content type:", typeof module.content);
        console.log("Is content HTML?", module.content?.includes('<') ? 'Yes' : 'No');
    }, [module.content]);

    const handleTextareaChange = (e) => {
        const newContent = e.target.value;
        console.log("📝 Textarea onChange - new content:", newContent);
        console.log("📝 Content length:", newContent.length);
        setModule({ ...module, content: newContent });
    };

    const handleRichTextEditorChange = (content) => {
        console.log("📝 RichTextEditor onChange:", content);
        console.log("📝 Content length:", content.length);
        console.log("📝 Is HTML?", content.includes('<') ? 'Yes' : 'No');
        setModule({ ...module, content });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Content *</label>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                        {module.content?.length || 0} characters
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRichTextEditor(true)}
                        className="flex items-center gap-2"
                    >
                        <Maximize2 className="h-4 w-4" />
                        Open Enhanced Editor
                    </Button>
                </div>
            </div>
            <textarea
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={module.content || ""}
                onChange={handleTextareaChange}
                placeholder="# Lesson Content..."
                required
            />
            <div className="text-xs text-gray-500">
                <p>Use Markdown or the enhanced editor for rich formatting.</p>
                {module.content && module.content.length > 0 && (
                    <div className="mt-2 p-2 border rounded bg-gray-50">
                        <p className="font-medium">Preview:</p>
                        <div
                            className="mt-1 text-sm"
                            dangerouslySetInnerHTML={{ __html: module.content.substring(0, 200) + (module.content.length > 200 ? '...' : '') }}
                        />
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showRichTextEditor && (
                    <RichTextEditor
                        content={module.content || ""}
                        onChange={handleRichTextEditorChange}
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
            <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="min-w-[80px]"
            >
                Cancel
            </Button>
            <Button
                type="submit"
                disabled={loading}
                className="relative overflow-hidden min-w-[120px] bg-blue-600 hover:bg-blue-700"
            >
                {loading && (
                    <motion.div
                        className="absolute inset-0 bg-blue-500/20"
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ repeat: Infinity, duration: 1 }}
                    />
                )}
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                    </>
                ) : (
                    "Save Module"
                )}
            </Button>
        </div>
    );
}