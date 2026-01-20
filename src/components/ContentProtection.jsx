import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function ContentProtection({ children }) {
    const { user } = useAuth();

    useEffect(() => {
        const handleContextMenu = (e) => {
            e.preventDefault();
        };

        const handleKeyDown = (e) => {
            // Prevent PrintScreen (often not catchable, but good to try)
            if (e.key === 'PrintScreen') {
                e.preventDefault();
                copyToClipboard();
                alert("Screenshots are disabled.");
            }

            // Prevent Ctrl+P (Print)
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                alert("Printing is disabled.");
            }

            // Prevent Ctrl+S (Save)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
            }

            // Prevent Ctrl+Shift+I (DevTools)
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
                e.preventDefault();
            }
        };

        const copyToClipboard = () => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText('');
            }
        };

        const handleKeyUp = (e) => {
            if (e.key === 'PrintScreen') {
                copyToClipboard();
            }
        }

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    return (
        <div className="relative w-full min-h-screen">
            {/* Watermark Overlay Removed */}

            {/* Content */}
            <div className="select-none relative">
                {children}
            </div>

            <style>{`
                @media print {
                    html, body {
                        display: none !important;
                    }
                }
                /* Disable selection globally for this component's children */
                .select-none * {
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                }
                /* Allow selection in inputs and textareas */
                .select-none input, .select-none textarea {
                    -webkit-user-select: text;
                    -moz-user-select: text;
                    -ms-user-select: text;
                    user-select: text;
                }
            `}</style>
        </div>
    );
}
