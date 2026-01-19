import { useCallback, useState } from "react";

// Hook for toast notifications (separate from modal context)
export const useToast = () => {
    const [toasts, setToasts] = useState([]);
    const [toastId, setToastId] = useState(0);

    const toast = useCallback(({
        title,
        description,
        variant = 'default',
        duration = 5000,
        action,
        ...props
    }) => {
        const id = toastId + 1;
        setToastId(id);

        const newToast = {
            id,
            title,
            description,
            variant,
            duration,
            action,
            ...props,
            timestamp: Date.now(),
        };

        setToasts(prev => [...prev, newToast]);

        // Auto-dismiss
        if (duration !== Infinity) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }

        return id;
    }, [toastId]);

    const dismiss = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const clearToasts = useCallback(() => {
        setToasts([]);
    }, []);

    return {
        toast,
        dismiss,
        clearToasts,
        toasts,
    };
};