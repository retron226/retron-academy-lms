import { Lock, Youtube } from "lucide-react";
import { motion } from "framer-motion";

export default function RestrictedYouTubeEmbed({ videoId }) {
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0&controls=1&showinfo=0&disablekb=1&fs=0`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
        >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>Restricted YouTube Embed (No external links)</span>
            </div>

            <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-primary/20 bg-black">
                <iframe
                    src={embedUrl}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen={false}
                    className="absolute inset-0 w-full h-full"
                    onContextMenu={(e) => e.preventDefault()}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
                <div
                    className="absolute inset-0 pointer-events-none"
                    onContextMenu={(e) => e.preventDefault()}
                />

                {/* Overlay to prevent right-click */}
                <div className="absolute inset-0 cursor-default"
                    onContextMenu={(e) => {
                        e.preventDefault();
                        return false;
                    }}
                />
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Youtube className="h-3 w-3" />
                    <span>Embedded with restricted controls:</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 pl-5">
                    <li>• No YouTube logo or external links</li>
                    <li>• No suggested videos at end</li>
                    <li>• Right-click disabled</li>
                    <li>• No fullscreen mode</li>
                    <li>• No keyboard controls</li>
                </ul>
            </div>
        </motion.div>
    );
}