// contexts/ModalContext.jsx
import React, { createContext, useState, useContext, useCallback, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Loader2, X } from 'lucide-react';
import { useToast } from './ToastComponent';

const ModalContext = createContext();


// Base modal types
const MODAL_TYPES = {
    FORM: 'form',
    CONFIRM: 'confirm',
    CHOICE: 'choice',
    SELECT: 'select',
    MULTISELECT: 'multiselect',
    CUSTOM: 'custom',
};

const ModalContent = ({ modal, onClose }) => {
    const [formData, setFormData] = useState(() => {
        if (modal.type === MODAL_TYPES.FORM) {
            return modal.fields.reduce((acc, field) => ({
                ...acc,
                [field.name]: field.defaultValue || ''
            }), {});
        }
        return {};
    });

    const [selectedValues, setSelectedValues] = useState(
        modal.type === MODAL_TYPES.MULTISELECT ? [] : ''
    );
    const [loading, setLoading] = useState(false);

    const handleInputChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (modal.type === MODAL_TYPES.FORM) {
            // Validate required fields
            const missingFields = modal.fields
                .filter(field => field.required && !formData[field.name]?.toString().trim())
                .map(field => field.label);

            if (missingFields.length > 0) {
                // Show error
                if (modal.onError) {
                    modal.onError(`Please fill in: ${missingFields.join(', ')}`);
                }
                return;
            }

            setLoading(true);
            try {
                if (modal.onSubmit) {
                    await modal.onSubmit(formData);
                }
                onClose(formData);
            } catch (error) {
                console.error('Modal submit error:', error);
                if (modal.onError) {
                    modal.onError(error.message);
                }
            } finally {
                setLoading(false);
            }
        } else if (modal.type === MODAL_TYPES.CHOICE) {
            onClose(selectedValues);
        } else if (modal.type === MODAL_TYPES.SELECT) {
            onClose(selectedValues);
        } else if (modal.type === MODAL_TYPES.MULTISELECT) {
            onClose(selectedValues);
        } else {
            onClose(true);
        }
    };

    const renderField = (field) => {
        switch (field.type) {
            case 'text':
            case 'email':
            case 'number':
            case 'password':
                return (
                    <div key={field.name} className="space-y-2">
                        <Label htmlFor={field.name}>
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <Input
                            id={field.name}
                            type={field.type}
                            value={formData[field.name] || ''}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            required={field.required}
                            disabled={loading}
                            autoComplete="off"
                        />
                        {field.description && (
                            <p className="text-sm text-muted-foreground">{field.description}</p>
                        )}
                    </div>
                );

            case 'textarea':
                return (
                    <div key={field.name} className="space-y-2">
                        <Label htmlFor={field.name}>
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <Textarea
                            id={field.name}
                            value={formData[field.name] || ''}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            required={field.required}
                            disabled={loading}
                            rows={field.rows || 4}
                        />
                        {field.description && (
                            <p className="text-sm text-muted-foreground">{field.description}</p>
                        )}
                    </div>
                );

            case 'select':
                return (
                    <div key={field.name} className="space-y-2">
                        <Label htmlFor={field.name}>
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <Select
                            value={formData[field.name] || ''}
                            onValueChange={(value) => handleInputChange(field.name, value)}
                            disabled={loading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={field.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                                {field.options?.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {field.description && (
                            <p className="text-sm text-muted-foreground">{field.description}</p>
                        )}
                    </div>
                );

            case 'checkbox':
                return (
                    <div key={field.name} className="flex items-center space-x-2">
                        <Checkbox
                            id={field.name}
                            checked={formData[field.name] || false}
                            onCheckedChange={(checked) => handleInputChange(field.name, checked)}
                            disabled={loading}
                        />
                        <Label htmlFor={field.name} className="text-sm font-normal">
                            {field.label}
                        </Label>
                    </div>
                );

            default:
                return null;
        }
    };

    const renderContent = () => {
        switch (modal.type) {
            case MODAL_TYPES.FORM:
                return (
                    <div className="space-y-6">
                        <DialogHeader>
                            <DialogTitle>{modal.title}</DialogTitle>
                            {modal.description && (
                                <DialogDescription>{modal.description}</DialogDescription>
                            )}
                        </DialogHeader>

                        <div className="space-y-4">
                            {modal.fields.map(renderField)}
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                variant="outline"
                                onClick={() => onClose(null)}
                                disabled={loading}
                                type="button"
                            >
                                {modal.cancelText || 'Cancel'}
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                type="button"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {modal.submitText || 'Submit'}
                            </Button>
                        </DialogFooter>
                    </div>
                );

            case MODAL_TYPES.CHOICE:
                return (
                    <div className="space-y-6">
                        <DialogHeader>
                            <DialogTitle>{modal.title}</DialogTitle>
                            {modal.message && (
                                <DialogDescription>{modal.message}</DialogDescription>
                            )}
                        </DialogHeader>

                        <RadioGroup
                            value={selectedValues}
                            onValueChange={setSelectedValues}
                            className="space-y-3"
                        >
                            {modal.options?.map((option) => (
                                <div key={option.value} className="flex items-center space-x-3">
                                    <RadioGroupItem
                                        value={option.value}
                                        id={option.value}
                                        disabled={option.disabled}
                                    />
                                    <Label
                                        htmlFor={option.value}
                                        className={`flex-1 cursor-pointer ${option.disabled ? 'opacity-50' : ''}`}
                                    >
                                        <div className="font-medium">{option.label}</div>
                                        {option.description && (
                                            <div className="text-sm text-muted-foreground mt-1">
                                                {option.description}
                                            </div>
                                        )}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => onClose(null)}
                                type="button"
                            >
                                {modal.cancelText || 'Cancel'}
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={!selectedValues || loading}
                                type="button"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {modal.submitText || 'Select'}
                            </Button>
                        </DialogFooter>
                    </div>
                );

            case MODAL_TYPES.SELECT:
                return (
                    <div className="space-y-6">
                        <DialogHeader>
                            <DialogTitle>{modal.title}</DialogTitle>
                            {modal.message && (
                                <DialogDescription>{modal.message}</DialogDescription>
                            )}
                        </DialogHeader>

                        <Select value={selectedValues} onValueChange={setSelectedValues}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={modal.placeholder || 'Select an option'} />
                            </SelectTrigger>
                            <SelectContent>
                                {modal.options?.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                        disabled={option.disabled}
                                    >
                                        {option.label}
                                        {option.description && (
                                            <span className="text-sm text-muted-foreground ml-2">
                                                - {option.description}
                                            </span>
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => onClose(null)}
                                type="button"
                            >
                                {modal.cancelText || 'Cancel'}
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={!selectedValues || loading}
                                type="button"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {modal.submitText || 'Select'}
                            </Button>
                        </DialogFooter>
                    </div>
                );

            case MODAL_TYPES.MULTISELECT:
                return (
                    <div className="space-y-6">
                        <DialogHeader>
                            <DialogTitle>{modal.title}</DialogTitle>
                            {modal.message && (
                                <DialogDescription>{modal.message}</DialogDescription>
                            )}
                        </DialogHeader>

                        <div className="space-y-3 max-h-60 overflow-y-auto">
                            {modal.options?.map((option) => (
                                <div key={option.value} className="flex items-center space-x-3">
                                    <Checkbox
                                        id={option.value}
                                        checked={selectedValues.includes(option.value)}
                                        onCheckedChange={(checked) => {
                                            setSelectedValues(prev =>
                                                checked
                                                    ? [...prev, option.value]
                                                    : prev.filter(v => v !== option.value)
                                            );
                                        }}
                                        disabled={option.disabled}
                                    />
                                    <Label
                                        htmlFor={option.value}
                                        className={`flex-1 cursor-pointer ${option.disabled ? 'opacity-50' : ''}`}
                                    >
                                        <div className="font-medium">{option.label}</div>
                                        {option.description && (
                                            <div className="text-sm text-muted-foreground mt-1">
                                                {option.description}
                                            </div>
                                        )}
                                    </Label>
                                </div>
                            ))}
                        </div>

                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <div className="flex-1 text-sm text-muted-foreground">
                                {selectedValues.length > 0 && (
                                    <span>{selectedValues.length} selected</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => onClose(null)}
                                    type="button"
                                >
                                    {modal.cancelText || 'Cancel'}
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={selectedValues.length === 0 || loading}
                                    type="button"
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {modal.submitText || 'Confirm'}
                                </Button>
                            </div>
                        </DialogFooter>
                    </div>
                );

            case MODAL_TYPES.CONFIRM:
                return (
                    <AlertDialog open={true} onOpenChange={() => onClose(false)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{modal.title}</AlertDialogTitle>
                                {modal.message && (
                                    <AlertDialogDescription>
                                        {modal.message}
                                    </AlertDialogDescription>
                                )}
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => onClose(false)}>
                                    {modal.cancelText || 'Cancel'}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={() => onClose(true)}
                                    className={modal.variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                                >
                                    {modal.confirmText || 'Confirm'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                );

            case MODAL_TYPES.CUSTOM:
                return modal.content ? modal.content({ onClose }) : null;

            default:
                return null;
        }
    };

    if (modal.type === MODAL_TYPES.CONFIRM) {
        return renderContent();
    }

    return (
        <Dialog open={true} onOpenChange={() => onClose(null)}>
            <DialogContent className="sm:max-w-[500px]">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                    onClick={() => onClose(null)}
                    type="button"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </Button>
                {renderContent()}
            </DialogContent>
        </Dialog>
    );
};

export const ModalProvider = ({ children }) => {
    const [modal, setModal] = useState(null);

    const showModal = useCallback((config) => {
        return new Promise((resolve) => {
            setModal({
                ...config,
                onClose: (result) => {
                    setModal(null);
                    resolve(result);
                }
            });
        });
    }, []);

    const showFormModal = useCallback((config) => {
        return showModal({ type: MODAL_TYPES.FORM, ...config });
    }, [showModal]);

    const showConfirmModal = useCallback((config) => {
        return showModal({ type: MODAL_TYPES.CONFIRM, ...config });
    }, [showModal]);

    const showChoiceModal = useCallback((config) => {
        return showModal({ type: MODAL_TYPES.CHOICE, ...config });
    }, [showModal]);

    const showSelectModal = useCallback((config) => {
        return showModal({ type: MODAL_TYPES.SELECT, ...config });
    }, [showModal]);

    const showMultiSelectModal = useCallback((config) => {
        return showModal({ type: MODAL_TYPES.MULTISELECT, ...config });
    }, [showModal]);

    const showCustomModal = useCallback((content, config = {}) => {
        return showModal({ type: MODAL_TYPES.CUSTOM, content, ...config });
    }, [showModal]);

    const closeModal = useCallback(() => {
        if (modal?.onClose) {
            modal.onClose(null);
        }
        setModal(null);
    }, [modal]);

    const value = useMemo(() => ({
        showModal,
        showFormModal,
        showConfirmModal,
        showChoiceModal,
        showSelectModal,
        showMultiSelectModal,
        showCustomModal,
        closeModal,
        isOpen: !!modal,
    }), [
        showModal,
        showFormModal,
        showConfirmModal,
        showChoiceModal,
        showSelectModal,
        showMultiSelectModal,
        showCustomModal,
        closeModal,
        modal,
    ]);

    return (
        <ModalContext.Provider value={value}>
            {children}
            {modal && <ModalContent modal={modal} onClose={modal.onClose} />}
        </ModalContext.Provider>
    );
};



// Toast Provider Component
export const ToastProvider = ({ children }) => {
    const { toasts, dismiss } = useToast();

    return (
        <>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <Toast key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
                ))}
            </div>
        </>
    );
};

// Toast Component
const Toast = ({ toast, onDismiss }) => {
    const variants = {
        default: 'bg-background border',
        destructive: 'bg-destructive text-destructive-foreground',
        success: 'bg-green-600 text-white',
        warning: 'bg-yellow-600 text-white',
        info: 'bg-blue-600 text-white',
    };

    return (
        <div
            className={`${variants[toast.variant]} rounded-lg shadow-lg p-4 min-w-[300px] max-w-md animate-in slide-in-from-right-full duration-300`}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    {toast.title && (
                        <div className="font-semibold">{toast.title}</div>
                    )}
                    {toast.description && (
                        <div className="text-sm mt-1">{toast.description}</div>
                    )}
                    {toast.action && (
                        <div className="mt-3">
                            {toast.action}
                        </div>
                    )}
                </div>
                <button
                    onClick={onDismiss}
                    className="ml-4 opacity-70 hover:opacity-100 transition-opacity"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

export {
    ModalContext
}