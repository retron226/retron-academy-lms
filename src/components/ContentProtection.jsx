import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function ContentProtection({ children }) {
    const { user } = useAuth();

    useEffect(() => {
        const handleContextMenu = (e) => {
            // Allow context menu on inputs and textareas for better UX
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            e.preventDefault();
        };

        const handleKeyDown = (e) => {
            // Only apply restrictions for authenticated users viewing course content
            if (!user) return;

            // Prevent PrintScreen
            if (e.key === 'PrintScreen') {
                e.preventDefault();
                copyToClipboard();
            }

            // Prevent Ctrl+P (Print)
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
            }

            // Prevent Ctrl+S (Save)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
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
    }, [user]);

    return (
        <div className="relative w-full min-h-screen">
            {/* Content */}
            <div className="relative">
                {children}
            </div>

            <style>{`
                @media print {
                    html, body {
                        display: none !important;
                    }
                }
                
                /* Only disable text selection for course content areas */
                .course-content-disable-select {
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                }
                
                /* But allow selection in inputs, textareas, and buttons for accessibility */
                .course-content-disable-select input,
                .course-content-disable-select textarea,
                .course-content-disable-select button {
                    -webkit-user-select: auto;
                    -moz-user-select: auto;
                    -ms-user-select: auto;
                    user-select: auto;
                }
            `}</style>
        </div>
    );
}