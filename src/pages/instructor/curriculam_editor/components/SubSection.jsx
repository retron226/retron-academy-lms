import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../../../components/ui/button";
import { ChevronDown, ChevronRight, Trash2, Plus } from "lucide-react";
import ModuleList from "./ModuleList";
import AddModuleButtons from "./AddModuleButtons";
// import ModuleItem from "./ModuleItem";

export default function SubSection({ subSection, index, sectionId, onEditModule, onDeleteSubSection }) {
    const [expanded, setExpanded] = useState(true);

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="ml-8 mt-2 border-l-2 border-primary/20 pl-4"
        >
            <SubSectionHeader
                subSection={subSection}
                index={index}
                expanded={expanded}
                onToggle={() => setExpanded(!expanded)}
                onDelete={onDeleteSubSection}
            />

            <AnimatePresence>
                {expanded && (
                    <SubSectionContent
                        subSection={subSection}
                        sectionId={sectionId}
                        onEditModule={onEditModule}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function SubSectionHeader({ subSection, index, expanded, onToggle, onDelete }) {
    return (
        <div className="flex items-center justify-between bg-muted/30 p-3 rounded-md mb-2">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onToggle}>
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
                <span className="font-medium">Sub-section {index + 1}: {subSection.title}</span>
                <span className="text-xs text-muted-foreground ml-2">{subSection.duration}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
        </div>
    );
}

function SubSectionContent({ subSection, sectionId, onEditModule }) {
    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
        >
            <div className="space-y-2 ml-4">
                <ModuleList
                    modules={subSection.modules || []}
                    onEditModule={(module) => onEditModule({
                        sectionId,
                        subSectionId: subSection.id,
                        module,
                        isNew: false
                    })}
                />

                <AddModuleButtons
                    sectionId={sectionId}
                    subSectionId={subSection.id}
                    onAddModule={(type) => onEditModule({
                        sectionId,
                        subSectionId: subSection.id,
                        module: {
                            id: Date.now().toString(),
                            title: "",
                            type,
                            content: ""
                        },
                        isNew: true
                    })}
                    size="sm"
                />
            </div>
        </motion.div>
    );
}