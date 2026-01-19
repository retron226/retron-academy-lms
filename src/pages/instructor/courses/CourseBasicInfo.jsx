import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

export default function CourseBasicInfo({ course, setCourse, thumbnailFile, setThumbnailFile }) {
    const generateAccessCode = () => {
        setCourse({ ...course, accessCode: Math.random().toString(36).substring(2, 8).toUpperCase() });
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
        >
            <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                    <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <FormField
                        label="Course Title"
                        required
                        value={course.title}
                        onChange={(e) => setCourse({ ...course, title: e.target.value })}
                        placeholder="e.g. Advanced React Patterns"
                    />

                    <FormField
                        label="Description"
                        as="textarea"
                        rows={4}
                        value={course.description}
                        onChange={(e) => setCourse({ ...course, description: e.target.value })}
                        placeholder="Course description..."
                    />

                    <AccessCodeField
                        accessCode={course.accessCode}
                        onGenerate={generateAccessCode}
                        onUpdate={(code) => setCourse({ ...course, accessCode: code })}
                    />

                    <ThumbnailUpload
                        thumbnailFile={thumbnailFile}
                        setThumbnailFile={setThumbnailFile}
                        currentThumbnail={course.thumbnailUrl}
                    />
                </CardContent>
            </Card>
        </motion.div>
    );
}

function FormField({ label, as = "input", rows, ...props }) {
    const Component = as === "textarea" ? "textarea" : Input;

    return (
        <motion.div className="space-y-2" whileHover={{ scale: 1.01 }}>
            <label className="text-sm font-medium">{label}</label>
            <Component
                className={as === "textarea" ? "min-h-[120px] p-3" : ""}
                rows={rows}
                {...props}
            />
        </motion.div>
    );
}

function AccessCodeField({ accessCode, onGenerate, onUpdate }) {
    return (
        <motion.div className="space-y-2" whileHover={{ scale: 1.01 }}>
            <label className="text-sm font-medium">Access Code</label>
            <div className="flex gap-2">
                <Input
                    value={accessCode}
                    onChange={(e) => onUpdate(e.target.value)}
                    placeholder="ACCESS-CODE"
                    className="font-mono"
                />
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button type="button" variant="outline" onClick={onGenerate}>
                        Generate
                    </Button>
                </motion.div>
            </div>
            <p className="text-xs text-muted-foreground">
                Share this code with students to allow them to enroll.
            </p>
        </motion.div>
    );
}

function ThumbnailUpload({ thumbnailFile, setThumbnailFile, currentThumbnail }) {
    return (
        <motion.div className="space-y-2" whileHover={{ scale: 1.01 }}>
            <label className="text-sm font-medium">Thumbnail Image</label>
            <Input
                type="file"
                accept="image/*"
                onChange={(e) => setThumbnailFile(e.target.files[0])}
                className="cursor-pointer"
            />
            <AnimatePresence>
                {(currentThumbnail || thumbnailFile) && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4"
                    >
                        <div className="aspect-video w-48 overflow-hidden rounded-lg bg-muted shadow-md">
                            <img
                                src={thumbnailFile ? URL.createObjectURL(thumbnailFile) : currentThumbnail}
                                alt="Preview"
                                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}