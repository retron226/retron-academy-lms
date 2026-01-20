import { Button } from "../components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export default function ContentNavigation({
    currentPath,
    nextItem,
    prevItem,
    onNavigate
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center p-4 border-t bg-background/80 backdrop-blur-sm sticky bottom-0"
        >
            <div className="flex-1">
                {prevItem && (
                    <motion.div whileHover={{ x: -5 }}>
                        <Button
                            variant="outline"
                            onClick={() => onNavigate(prevItem.path)}
                            className="gap-2"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                            <span className="ml-2 text-sm text-muted-foreground truncate max-w-xs">
                                {prevItem.title}
                            </span>
                        </Button>
                    </motion.div>
                )}
            </div>

            <div className="text-sm text-muted-foreground px-4">
                {currentPath}
            </div>

            <div className="flex-1 flex justify-end">
                {nextItem && (
                    <motion.div whileHover={{ x: 5 }}>
                        <Button
                            variant="outline"
                            onClick={() => onNavigate(nextItem.path)}
                            className="gap-2"
                        >
                            <span className="mr-2 text-sm text-muted-foreground truncate max-w-xs">
                                {nextItem.title}
                            </span>
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}