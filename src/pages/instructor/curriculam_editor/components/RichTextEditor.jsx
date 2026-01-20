import { useState, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from '@tiptap/starter-kit'
import { Image } from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { FontFamily } from '@tiptap/extension-font-family'
import { Link } from '@tiptap/extension-link'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'
import { Underline } from '@tiptap/extension-underline'
import { Placeholder } from '@tiptap/extension-placeholder'
import { motion, AnimatePresence } from "framer-motion";
import {
    Maximize2, Minimize2, Type, Image as ImageIcon, Table as TableIcon,
    Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter,
    AlignRight, AlignJustify, List, ListOrdered, Link as LinkIcon,
    MinusSquare, Undo2, Redo2, Trash2, Palette, Heading1, Heading2,
    Heading3, Plus, Minus, Columns, Rows, Merge, Split, Upload,
    ArrowLeft, ArrowRight, Save, X, ExternalLink, WrapText,
    Maximize, Minimize, Move, Type as TypeIcon, ZoomIn, ZoomOut,
    RotateCw, Download, Copy, Crop, Settings
} from "lucide-react";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import { Slider } from "../../../../components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../../../components/ui/dialog";
import { Button } from "../../../../components/ui/button";
import { useToast } from "../../../../contexts/ToastComponent";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../components/ui/popover";


// Table Modal Component
function TableModal({
    show,
    onClose,
    onInsert,
    onAddRow,
    onAddColumn,
    onDeleteRow,
    onDeleteColumn,
    onMergeCells,
    onSplitCell,
    editor
}) {
    const [rows, setRows] = useState(3);
    const [cols, setCols] = useState(3);
    const [hasHeader, setHasHeader] = useState(true);
    const [cellBgColor, setCellBgColor] = useState('#ffffff');
    const [borderColor, setBorderColor] = useState('#000000');

    if (!show) return null;

    const isTableActive = editor?.isActive('table');

    return (
        <Dialog open={show} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isTableActive ? 'Edit Table' : 'Insert Table'}</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="insert" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="insert">Insert</TabsTrigger>
                        <TabsTrigger value="format" disabled={!isTableActive}>Format</TabsTrigger>
                    </TabsList>

                    <TabsContent value="insert" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="rows">Rows</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="rows"
                                        type="number"
                                        value={rows}
                                        onChange={(e) => setRows(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                                        min="1"
                                        max="10"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setRows(Math.max(1, rows - 1))}
                                    >
                                        <Minus size={16} />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setRows(Math.min(10, rows + 1))}
                                    >
                                        <Plus size={16} />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="columns">Columns</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="columns"
                                        type="number"
                                        value={cols}
                                        onChange={(e) => setCols(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                                        min="1"
                                        max="10"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setCols(Math.max(1, cols - 1))}
                                    >
                                        <Minus size={16} />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setCols(Math.min(10, cols + 1))}
                                    >
                                        <Plus size={16} />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={hasHeader}
                                    onChange={(e) => setHasHeader(e.target.checked)}
                                    className="rounded"
                                />
                                Include header row
                            </Label>
                        </div>

                        <div className="p-4 border rounded-lg">
                            <div className="text-center text-sm text-muted-foreground mb-2">
                                Preview
                            </div>
                            <div className="border rounded overflow-hidden">
                                {Array.from({ length: rows + (hasHeader ? 1 : 0) }).map((_, rowIndex) => (
                                    <div key={rowIndex} className="flex border-b last:border-b-0">
                                        {Array.from({ length: cols }).map((_, colIndex) => (
                                            <div
                                                key={colIndex}
                                                className={`flex-1 h-8 border-r last:border-r-0 flex items-center justify-center text-xs
                                                    ${rowIndex === 0 && hasHeader ? 'bg-muted font-medium' : 'bg-background'}`}
                                            >
                                                {rowIndex === 0 && hasHeader ? 'Header' : 'Cell'}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="format" className="space-y-4">
                        {isTableActive && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Rows</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onAddRow('above')}
                                                className="flex-1"
                                            >
                                                <Rows size={14} className="mr-1" />
                                                Add Above
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onAddRow('below')}
                                                className="flex-1"
                                            >
                                                <Rows size={14} className="mr-1" />
                                                Add Below
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={onDeleteRow}
                                                className="text-destructive"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Columns</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onAddColumn('left')}
                                                className="flex-1"
                                            >
                                                <Columns size={14} className="mr-1" />
                                                Add Left
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onAddColumn('right')}
                                                className="flex-1"
                                            >
                                                <Columns size={14} className="mr-1" />
                                                Add Right
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={onDeleteColumn}
                                                className="text-destructive"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Cells</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={onMergeCells}
                                                className="flex-1"
                                            >
                                                <Merge size={14} className="mr-1" />
                                                Merge
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={onSplitCell}
                                                className="flex-1"
                                            >
                                                <Split size={14} className="mr-1" />
                                                Split
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Cell Background</Label>
                                        <Input
                                            type="color"
                                            value={cellBgColor}
                                            onChange={(e) => {
                                                setCellBgColor(e.target.value);
                                                if (editor) {
                                                    editor.chain().focus().setCellAttribute('backgroundColor', e.target.value).run();
                                                }
                                            }}
                                            className="h-8"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Border Color</Label>
                                    <Input
                                        type="color"
                                        value={borderColor}
                                        onChange={(e) => {
                                            setBorderColor(e.target.value);
                                            if (editor) {
                                                editor.chain().focus().setCellAttribute('borderColor', e.target.value).run();
                                            }
                                        }}
                                        className="h-8"
                                    />
                                </div>
                            </>
                        )}
                    </TabsContent>
                </Tabs>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    {!isTableActive ? (
                        <Button
                            type="button"
                            onClick={() => {
                                onInsert(rows, cols, hasHeader);
                                onClose();
                            }}
                        >
                            Insert Table
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={onClose}
                        >
                            Done
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
// Available fonts
const FONT_FAMILIES = [
    { name: "Default", value: "inherit" },
    { name: "Arial", value: "Arial, sans-serif" },
    { name: "Times New Roman", value: "'Times New Roman', serif" },
    { name: "Courier New", value: "'Courier New', monospace" },
    { name: "Georgia", value: "Georgia, serif" },
    { name: "Verdana", value: "Verdana, sans-serif" },
    { name: "Comic Sans MS", value: "'Comic Sans MS', cursive" },
    { name: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
    { name: "Impact", value: "Impact, sans-serif" },
    { name: "Tahoma", value: "Tahoma, sans-serif" },
];

// Font sizes with labels
const FONT_SIZES = [
    { label: "Small", value: "12px" },
    { label: "Normal", value: "14px" },
    { label: "Medium", value: "16px" },
    { label: "Large", value: "18px" },
    { label: "X-Large", value: "20px" },
    { label: "XX-Large", value: "24px" },
    { label: "XXX-Large", value: "28px" },
    { label: "Huge", value: "32px" },
];

// Color palette
const COLORS = [
    "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00",
    "#ff00ff", "#00ffff", "#ff9900", "#9900ff", "#0099ff", "#ff0099",
    "#666666", "#999999", "#cccccc", "#333333"
];

// Common sizes for quick selection
const QUICK_SIZES = [
    { label: "25%", width: "25%", height: "auto" },
    { label: "50%", width: "50%", height: "auto" },
    { label: "75%", width: "75%", height: "auto" },
    { label: "100%", width: "100%", height: "auto" },
    { label: "Small", width: "200px", height: "auto" },
    { label: "Medium", width: "400px", height: "auto" },
    { label: "Large", width: "600px", height: "auto" },
];

export default function RichTextEditor({
    content,
    onChange,
    onClose,
    navigation,
    showNavigation = true
}) {
    const [fullscreen, setFullscreen] = useState(false);
    const [showImageUpload, setShowImageUpload] = useState(false);
    const [showTableModal, setShowTableModal] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [showImageSettings, setShowImageSettings] = useState(false);
    const [currentLink, setCurrentLink] = useState({ url: "", text: "" });
    const [imageUploading, setImageUploading] = useState(false);
    const [imageData, setImageData] = useState({
        url: "",
        alt: "",
        title: "",
        width: "100%",
        height: "auto",
        align: "center",
    });
    const [fontSize, setFontSize] = useState("16px");
    const [wordWrap, setWordWrap] = useState(true);
    const [selectedImageNode, setSelectedImageNode] = useState(null);
    const fileInputRef = useRef(null);
    const { toast } = useToast();

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3, 4, 5, 6],
                },
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false,
                    HTMLAttributes: {
                        class: 'list-disc pl-5',
                    },
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false,
                    HTMLAttributes: {
                        class: 'list-decimal pl-5',
                    },
                },
            }),
            Placeholder.configure({
                placeholder: 'Start typing here...',
            }),
            Image.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        src: {
                            default: null,
                        },
                        alt: {
                            default: '',
                        },
                        title: {
                            default: '',
                        },
                        width: {
                            default: '100%',
                            parseHTML: element => {
                                const width = element.getAttribute('width');
                                const styleWidth = element.style.width;
                                return width || styleWidth || '100%';
                            },
                            renderHTML: attributes => {
                                if (attributes.width && attributes.width !== '100%') {
                                    return {
                                        width: attributes.width,
                                        style: `width: ${attributes.width}; height: ${attributes.height || 'auto'}; max-height: ${attributes.maxHeight || 'none'}; max-width: 100%;`
                                    }
                                }
                                return {
                                    style: `max-width: 100%; height: ${attributes.height || 'auto'}; max-height: ${attributes.maxHeight || 'none'};`
                                }
                            }
                        },
                        height: {
                            default: 'auto',
                            parseHTML: element => {
                                const height = element.getAttribute('height');
                                const styleHeight = element.style.height;
                                return height || styleHeight || 'auto';
                            },
                        },
                        maxHeight: {
                            default: 'none',
                            parseHTML: element => {
                                const style = element.style.maxHeight;
                                return style || 'none';
                            },
                            renderHTML: attributes => {
                                if (attributes.maxHeight && attributes.maxHeight !== 'none') {
                                    return {
                                        style: `max-height: ${attributes.maxHeight};`
                                    }
                                }
                                return {};
                            }
                        },
                        align: {
                            default: 'center',
                            parseHTML: element => element.getAttribute('data-align') || element.style.float || 'center',
                            renderHTML: attributes => {
                                let style = '';
                                if (attributes.align === 'left') {
                                    style = 'float: left; margin-right: 1rem; margin-left: 0;';
                                } else if (attributes.align === 'right') {
                                    style = 'float: right; margin-left: 1rem; margin-right: 0;';
                                } else if (attributes.align === 'center') {
                                    style = 'display: block; margin-left: auto; margin-right: auto; float: none;';
                                }
                                return {
                                    'data-align': attributes.align,
                                    style: style
                                };
                            }
                        },
                        class: {
                            default: 'editor-image',
                            parseHTML: element => element.getAttribute('class') || 'editor-image',
                        }
                    }
                }
            }).configure({
                inline: true,
                allowBase64: true,
                HTMLAttributes: {
                    class: 'editor-image rounded-lg transition-all duration-200 hover:opacity-90 cursor-move',
                },
            }),
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'prose-table',
                },
            }),
            TableRow,
            TableCell,
            TableHeader,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            // FIXED: Use a custom extension for font size
            TextStyle.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        fontSize: {
                            default: null,
                            parseHTML: element => element.style.fontSize,
                            renderHTML: attributes => {
                                if (!attributes.fontSize) {
                                    return {};
                                }
                                return {
                                    style: `font-size: ${attributes.fontSize}`,
                                };
                            },
                        },
                    };
                },
            }),
            Color,
            FontFamily,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline hover:text-primary/80',
                    target: '_blank',
                    rel: 'noopener noreferrer',
                },
            }),
            HorizontalRule,
            Underline,
        ],
        content: content || '<p>Start typing here...</p>',
        onUpdate: ({ editor }) => {
            // FIXED: Only update parent if content actually changed
            const newContent = editor.getHTML();
            if (newContent !== content) {
                onChange(newContent);
            }
        },
        onSelectionUpdate: ({ editor }) => {
            // Check if an image is selected
            const selection = editor.state.selection;
            const node = editor.state.doc.nodeAt(selection.from);

            if (node && node.type.name === 'image') {
                setSelectedImageNode(node);
                setImageData({
                    url: node.attrs.src || '',
                    alt: node.attrs.alt || '',
                    title: node.attrs.title || '',
                    width: node.attrs.width || '100%',
                    height: node.attrs.height || 'auto',
                    maxHeight: node.attrs.maxHeight || 'none',
                    align: node.attrs.align || 'center',
                });
            } else {
                setSelectedImageNode(null);
            }
        },
        editorProps: {
            attributes: {
                class: `min-h-[400px] p-4 focus:outline-none prose max-w-none ${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-nowrap'}`,
            },
        },
    });

    // FIXED: Update editor content when prop changes
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content || '<p>Start typing here...</p>');
        }
    }, [editor, content]);

    // Apply font size to selected text or set default for new text
    const applyFontSize = (size) => {
        if (!editor) return;

        setFontSize(size);

        // Check if there's a selection
        const { from, to } = editor.state.selection;
        const hasSelection = from !== to;

        if (hasSelection) {
            // Apply font size to selected text
            editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
        } else {
            // No selection - set for the current position (future typing)
            editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
        }
    };

    // Clear font size from selection
    const clearFontSize = () => {
        if (!editor) return;

        // Check if there's a selection
        const { from, to } = editor.state.selection;
        const hasSelection = from !== to;

        if (hasSelection) {
            // Remove font size from selected text
            editor.chain().focus().unsetMark('textStyle', 'fontSize').run();
        } else {
            // Remove font size at cursor position
            editor.chain().focus().unsetMark('textStyle', 'fontSize').run();
        }

        setFontSize("16px");
    };

    // Toggle word wrap
    const toggleWordWrap = () => {
        setWordWrap(!wordWrap);
        toast({
            title: !wordWrap ? "Word Wrap Enabled" : "Word Wrap Disabled",
            description: !wordWrap ? "Text will now wrap to next line" : "Text will now stay on one line",
            variant: "default",
        });
    };

    // Handle image upload
    const handleImageUpload = async (file) => {
        if (!file) return;

        setImageUploading(true);
        try {
            const imageUrl = URL.createObjectURL(file);

            editor.chain().focus().setImage({
                src: imageUrl,
                alt: file.name,
                title: file.name,
                width: imageData.width,
                height: imageData.height,
                align: imageData.align,
                class: 'editor-image'
            }).run();

            setImageData({
                ...imageData,
                url: imageUrl,
                alt: file.name,
                title: file.name
            });

            toast({
                title: "Success",
                description: "Image uploaded successfully",
                variant: "default",
            });
        } catch (error) {
            console.error("Error uploading image:", error);
            toast({
                title: "Error",
                description: "Failed to upload image",
                variant: "destructive",
            });
        } finally {
            setImageUploading(false);
            setShowImageUpload(false);
        }
    };

    // Insert image from URL
    const handleInsertImageFromUrl = () => {
        if (!imageData.url) {
            toast({
                title: "Error",
                description: "Please enter an image URL",
                variant: "destructive",
            });
            return;
        }

        editor.chain().focus().setImage({
            src: imageData.url,
            alt: imageData.alt || "Image",
            title: imageData.title || "",
            width: imageData.width,
            height: imageData.height,
            align: imageData.align,
            class: 'editor-image'
        }).run();

        toast({
            title: "Success",
            description: "Image inserted successfully",
            variant: "default",
        });

        setShowImageUpload(false);
        setImageData({
            url: "",
            alt: "",
            title: "",
            width: "100%",
            height: "auto",
            align: "center",
        });
    };

    // Update selected image properties
    const updateSelectedImage = (updates) => {
        if (!selectedImageNode || !editor) return;

        editor.chain().focus().updateAttributes('image', {
            ...selectedImageNode.attrs,
            ...updates
        }).run();

        setImageData(prev => ({ ...prev, ...updates }));

        toast({
            title: "Updated",
            description: "Image properties updated",
            variant: "default",
        });
    };

    // Center selected image
    const centerImage = () => {
        updateSelectedImage({ align: 'center' });
    };

    // Align image left
    const alignImageLeft = () => {
        updateSelectedImage({ align: 'left' });
    };

    // Align image right
    const alignImageRight = () => {
        updateSelectedImage({ align: 'right' });
    };

    // Resize image
    const resizeImage = (width, height = "auto") => {
        updateSelectedImage({ width, height });
    };

    // Set max height for image
    const setMaxHeight = (maxHeight) => {
        updateSelectedImage({ maxHeight });
    };

    // Reset image size
    const resetImageSize = () => {
        updateSelectedImage({
            width: "100%",
            height: "auto",
            maxHeight: "none"
        });
    };

    // Insert table with initial structure
    const insertTable = (rows, cols, hasHeader = true) => {
        editor.chain().focus().insertTable({
            rows,
            cols,
            withHeaderRow: hasHeader
        }).run();
    };

    // Table operations
    const addRow = (position = 'below') => {
        if (position === 'above') {
            editor.chain().focus().addRowBefore().run();
        } else {
            editor.chain().focus().addRowAfter().run();
        }
    };

    const addColumn = (position = 'right') => {
        if (position === 'left') {
            editor.chain().focus().addColumnBefore().run();
        } else {
            editor.chain().focus().addColumnAfter().run();
        }
    };

    const deleteRow = () => {
        editor.chain().focus().deleteRow().run();
    };

    const deleteColumn = () => {
        editor.chain().focus().deleteColumn().run();
    };

    const mergeCells = () => {
        editor.chain().focus().mergeCells().run();
    };

    const splitCell = () => {
        editor.chain().focus().splitCell().run();
    };

    // Handle link insertion
    const handleInsertLink = () => {
        if (!currentLink.url) {
            toast({
                title: "Error",
                description: "Please enter a URL",
                variant: "destructive",
            });
            return;
        }

        if (editor) {
            // If there's selected text, wrap it with link
            if (currentLink.text) {
                editor.chain().focus().insertContent(`<a href="${currentLink.url}" target="_blank" rel="noopener noreferrer">${currentLink.text}</a>`).run();
            } else {
                // Otherwise, insert link at cursor position
                const selectedText = editor.state.selection.content().content.firstChild?.text || 'Link';
                editor.chain().focus().setLink({
                    href: currentLink.url,
                    target: '_blank',
                    rel: 'noopener noreferrer'
                }).run();
            }

            toast({
                title: "Success",
                description: "Link inserted successfully",
                variant: "default",
            });

            setCurrentLink({ url: "", text: "" });
            setShowLinkModal(false);
        }
    };

    const handleRemoveLink = () => {
        if (editor) {
            editor.chain().focus().unsetLink().run();
            toast({
                title: "Success",
                description: "Link removed",
                variant: "default",
            });
        }
    };

    // Clear editor content
    const clearContent = () => {
        if (window.confirm("Are you sure you want to clear all content?")) {
            editor.chain().focus().clearContent().run();
            toast({
                title: "Cleared",
                description: "Content cleared",
                variant: "default",
            });
        }
    };

    // Save and close - FIXED: Ensure content is saved properly
    const handleSave = () => {
        if (editor) {
            const finalContent = editor.getHTML();
            console.log("💾 Saving content from RTE:", finalContent);
            onChange(finalContent);
            toast({
                title: "Saved",
                description: "Content saved successfully",
                variant: "default",
            });
            onClose();
        }
    };

    // Navigation handlers
    const handlePrevious = () => {
        if (navigation?.onPrevious) {
            navigation.onPrevious();
        }
    };

    const handleNext = () => {
        if (navigation?.onNext) {
            navigation.onNext();
        }
    };

    // Add global styles for images and tables
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            .tiptap {
                ${wordWrap ? 'word-wrap: break-word; white-space: pre-wrap;' : 'white-space: nowrap;'}
                line-height: 1.6;
                font-size: 16px; /* Base font size */
            }
            
            /* Style for font size marks */
            .tiptap span[style*="font-size"] {
                display: inline;
            }
            
            .tiptap img.editor-image {
                max-width: 100%;
                height: auto;
                border-radius: 0.5rem;
                margin: 1rem 0;
                transition: all 0.2s ease;
                cursor: move;
                object-fit: contain;
            }
            
            .tiptap img.editor-image[data-align="left"] {
                float: left;
                margin-right: 1rem;
                margin-left: 0;
                margin-top: 0.5rem;
                margin-bottom: 0.5rem;
            }
            
            .tiptap img.editor-image[data-align="right"] {
                float: right;
                margin-left: 1rem;
                margin-right: 0;
                margin-top: 0.5rem;
                margin-bottom: 0.5rem;
            }
            
            .tiptap img.editor-image[data-align="center"] {
                display: block;
                margin-left: auto;
                margin-right: auto;
                float: none;
            }
            
            .tiptap img.ProseMirror-selectednode {
                outline: 3px solid hsl(var(--primary));
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            
            .tiptap table {
                border-collapse: collapse;
                margin: 1rem 0;
                overflow: hidden;
                table-layout: fixed;
                width: 100%;
            }
            
            .tiptap td,
            .tiptap th {
                border: 1px solid hsl(var(--border));
                box-sizing: border-box;
                min-width: 1em;
                padding: 6px 8px;
                position: relative;
                vertical-align: top;
            }
            
            .tiptap th {
                background-color: hsl(var(--muted));
                font-weight: bold;
                text-align: left;
            }
            
            .tiptap .selectedCell:after {
                background: rgba(200, 200, 255, 0.4);
                content: "";
                left: 0;
                right: 0;
                top: 0;
                bottom: 0;
                pointer-events: none;
                position: absolute;
                z-index: 2;
            }
            
            .tiptap .column-resize-handle {
                background-color: hsl(var(--primary));
                bottom: -2px;
                pointer-events: none;
                position: absolute;
                right: -2px;
                top: 0;
                width: 4px;
            }
            
            .tiptap p {
                margin: 0.75rem 0;
            }
            
            .tiptap ul {
                list-style-type: disc;
                padding-left: 1.5rem;
                margin: 0.75rem 0;
            }
            
            .tiptap ol {
                list-style-type: decimal;
                padding-left: 1.5rem;
                margin: 0.75rem 0;
            }
            
            .tiptap li {
                margin: 0.25rem 0;
            }
            
            .tiptap li > p {
                margin: 0;
            }
            
            .tiptap a {
                color: hsl(var(--primary));
                text-decoration: underline;
                cursor: pointer;
            }
            
            .tiptap a:hover {
                color: hsl(var(--primary) / 0.8);
            }
            
            .tiptap h1, .tiptap h2, .tiptap h3, .tiptap h4, .tiptap h5, .tiptap h6 {
                margin-top: 1.5rem;
                margin-bottom: 0.75rem;
                font-weight: 600;
                line-height: 1.25;
            }
            
            .tiptap h1 { font-size: 2em; }
            .tiptap h2 { font-size: 1.5em; }
            .tiptap h3 { font-size: 1.17em; }
            .tiptap h4 { font-size: 1em; }
            .tiptap h5 { font-size: 0.83em; }
            .tiptap h6 { font-size: 0.67em; }
            
            .whitespace-nowrap {
                overflow-x: auto;
            }
            
            .tiptap .is-empty::before {
                content: attr(data-placeholder);
                float: left;
                color: hsl(var(--muted-foreground));
                pointer-events: none;
                height: 0;
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, [wordWrap]);

    if (!editor) {
        return <div className="flex items-center justify-center h-64">Loading editor...</div>;
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`fixed inset-0 z-[60] bg-background ${fullscreen ? '' : 'flex items-center justify-center p-4'}`}
            >
                <div className={`${fullscreen ? 'h-full' : 'w-full max-w-6xl max-h-[90vh]'} flex flex-col bg-card rounded-lg shadow-2xl overflow-hidden`}>
                    {/* Toolbar */}
                    <Toolbar
                        editor={editor}
                        fullscreen={fullscreen}
                        fontSize={fontSize}
                        wordWrap={wordWrap}
                        selectedImageNode={selectedImageNode}
                        onToggleFullscreen={() => setFullscreen(!fullscreen)}
                        onShowImageUpload={() => setShowImageUpload(true)}
                        onShowTableModal={() => setShowTableModal(true)}
                        onShowLinkModal={() => {
                            // Get selected text for link
                            const selectedText = editor.state.selection.content().content.firstChild?.text || '';
                            setCurrentLink(prev => ({ ...prev, text: selectedText }));
                            setShowLinkModal(true);
                        }}
                        onShowImageSettings={() => setShowImageSettings(true)}
                        onRemoveLink={handleRemoveLink}
                        onClearContent={clearContent}
                        onClose={onClose}
                        onSave={handleSave}
                        onToggleWordWrap={toggleWordWrap}
                        onApplyFontSize={applyFontSize}
                        onClearFontSize={clearFontSize}
                        onCenterImage={centerImage}
                        onAlignImageLeft={alignImageLeft}
                        onAlignImageRight={alignImageRight}
                        onResizeImage={resizeImage}
                        onResetImageSize={resetImageSize}
                    />

                    {/* Editor Area */}
                    <div className="flex-1 overflow-auto border-t">
                        <EditorContent editor={editor} />
                    </div>

                    {/* Navigation Bar */}
                    {showNavigation && navigation && (
                        <NavigationBar
                            current={navigation.current}
                            previous={navigation.previous}
                            next={navigation.next}
                            onPrevious={handlePrevious}
                            onNext={handleNext}
                            isFirst={navigation.isFirst}
                            isLast={navigation.isLast}
                        />
                    )}
                </div>
            </motion.div>

            {/* Image Upload Modal */}
            <ImageUploadModal
                show={showImageUpload}
                onClose={() => setShowImageUpload(false)}
                onUpload={handleImageUpload}
                uploading={imageUploading}
                fileInputRef={fileInputRef}
                imageData={imageData}
                onImageDataChange={setImageData}
                onInsert={handleInsertImageFromUrl}
            />

            {/* Image Settings Modal */}
            <ImageSettingsModal
                show={showImageSettings}
                onClose={() => setShowImageSettings(false)}
                imageData={imageData}
                onImageDataChange={updateSelectedImage}
                selectedImageNode={selectedImageNode}
                onCenterImage={centerImage}
                onAlignImageLeft={alignImageLeft}
                onAlignImageRight={alignImageRight}
                onResizeImage={resizeImage}
                onSetMaxHeight={setMaxHeight}
                onResetImageSize={resetImageSize}
            />

            {/* Table Modal */}
            <TableModal
                show={showTableModal}
                onClose={() => setShowTableModal(false)}
                onInsert={insertTable}
                onAddRow={addRow}
                onAddColumn={addColumn}
                onDeleteRow={deleteRow}
                onDeleteColumn={deleteColumn}
                onMergeCells={mergeCells}
                onSplitCell={splitCell}
                editor={editor}
            />

            {/* Link Modal */}
            <LinkModal
                show={showLinkModal}
                onClose={() => setShowLinkModal(false)}
                link={currentLink}
                onLinkChange={setCurrentLink}
                onInsert={handleInsertLink}
                editor={editor}
            />
        </>
    );
}

// Main Toolbar Component
function Toolbar({
    editor,
    fullscreen,
    fontSize,
    wordWrap,
    selectedImageNode,
    onToggleFullscreen,
    onShowImageUpload,
    onShowTableModal,
    onShowLinkModal,
    onShowImageSettings,
    onRemoveLink,
    onClearContent,
    onClose,
    onSave,
    onToggleWordWrap,
    onApplyFontSize,
    onClearFontSize,
    onCenterImage,
    onAlignImageLeft,
    onAlignImageRight,
    onResizeImage,
    onResetImageSize
}) {
    return (
        <div className="flex items-center justify-between p-3 bg-muted/30 border-b">
            <div className="flex items-center gap-2 flex-wrap">
                {/* Undo/Redo */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                >
                    <Undo2 size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                >
                    <Redo2 size={16} />
                </Button>

                <div className="w-px h-6 bg-border mx-1" />

                {/* Word Wrap Toggle */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onToggleWordWrap}
                    className={wordWrap ? 'bg-primary/20' : ''}
                    title={wordWrap ? "Disable Word Wrap" : "Enable Word Wrap"}
                >
                    <WrapText size={16} />
                </Button>

                <div className="w-px h-6 bg-border mx-1" />

                {/* Font Size Controls */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                        >
                            <TypeIcon size={16} />
                            <span className="text-xs">{fontSize.replace('px', '')}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48">
                        <div className="grid gap-2">
                            <div className="grid grid-cols-2 items-center gap-2">
                                <Label htmlFor="font-size">Font Size</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="font-size"
                                        type="text"
                                        value={fontSize}
                                        onChange={(e) => onApplyFontSize(e.target.value)}
                                        className="h-8"
                                        placeholder="16px"
                                    />
                                    <span className="text-xs">px</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                                {[12, 14, 16, 18].map((size) => (
                                    <Button
                                        key={size}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onApplyFontSize(`${size}px`)}
                                        className={`text-xs ${fontSize === `${size}px` ? 'bg-primary/20' : ''}`}
                                    >
                                        {size}
                                    </Button>
                                ))}
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                                {[20, 24, 28, 32].map((size) => (
                                    <Button
                                        key={size}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onApplyFontSize(`${size}px`)}
                                        className={`text-xs ${fontSize === `${size}px` ? 'bg-primary/20' : ''}`}
                                    >
                                        {size}
                                    </Button>
                                ))}
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onApplyFontSize('16px')}
                                    className="flex-1"
                                >
                                    Reset Default
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={onClearFontSize}
                                    className="flex-1"
                                >
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Text Styles */}
                <Select
                    value={editor.getAttributes('heading')?.level?.toString() || 'p'}
                    onValueChange={(value) => {
                        if (value === 'p') {
                            editor.chain().focus().setParagraph().run();
                        } else {
                            editor.chain().focus().toggleHeading({ level: parseInt(value) }).run();
                        }
                    }}
                >
                    <SelectTrigger className="w-24 h-8">
                        <SelectValue placeholder="Normal" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="p">Normal</SelectItem>
                        <SelectItem value="1">
                            <div className="flex items-center gap-2">
                                <Heading1 size={14} />
                                Heading 1
                            </div>
                        </SelectItem>
                        <SelectItem value="2">
                            <div className="flex items-center gap-2">
                                <Heading2 size={14} />
                                Heading 2
                            </div>
                        </SelectItem>
                        <SelectItem value="3">
                            <div className="flex items-center gap-2">
                                <Heading3 size={14} />
                                Heading 3
                            </div>
                        </SelectItem>
                        <SelectItem value="4">Heading 4</SelectItem>
                        <SelectItem value="5">Heading 5</SelectItem>
                        <SelectItem value="6">Heading 6</SelectItem>
                    </SelectContent>
                </Select>

                {/* Font Family */}
                <Select
                    value={editor.getAttributes('textStyle')?.fontFamily || 'inherit'}
                    onValueChange={(value) => editor.chain().focus().setFontFamily(value).run()}
                >
                    <SelectTrigger className="w-32 h-8">
                        <SelectValue placeholder="Font" />
                    </SelectTrigger>
                    <SelectContent>
                        {FONT_FAMILIES.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                                <span style={{ fontFamily: font.value }}>{font.name}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="w-px h-6 bg-border mx-1" />

                {/* Text Formatting */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={editor.isActive('bold') ? 'bg-primary/20' : ''}
                >
                    <Bold size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={editor.isActive('italic') ? 'bg-primary/20' : ''}
                >
                    <Italic size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={editor.isActive('underline') ? 'bg-primary/20' : ''}
                >
                    <UnderlineIcon size={16} />
                </Button>

                {/* Color Picker */}
                <ColorPicker editor={editor} />

                <div className="w-px h-6 bg-border mx-1" />

                {/* Alignment */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={editor.isActive({ textAlign: 'left' }) ? 'bg-primary/20' : ''}
                >
                    <AlignLeft size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={editor.isActive({ textAlign: 'center' }) ? 'bg-primary/20' : ''}
                >
                    <AlignCenter size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={editor.isActive({ textAlign: 'right' }) ? 'bg-primary/20' : ''}
                >
                    <AlignRight size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    className={editor.isActive({ textAlign: 'justify' }) ? 'bg-primary/20' : ''}
                >
                    <AlignJustify size={16} />
                </Button>

                <div className="w-px h-6 bg-border mx-1" />

                {/* Lists */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={editor.isActive('bulletList') ? 'bg-primary/20' : ''}
                >
                    <List size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={editor.isActive('orderedList') ? 'bg-primary/20' : ''}
                >
                    <ListOrdered size={16} />
                </Button>

                <div className="w-px h-6 bg-border mx-1" />

                {/* Special Elements */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                >
                    <MinusSquare size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onShowLinkModal}
                    className={editor.isActive('link') ? 'bg-primary/20' : ''}
                >
                    <LinkIcon size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onShowImageUpload}
                >
                    <ImageIcon size={16} />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onShowTableModal}
                    className={editor.isActive('table') ? 'bg-primary/20' : ''}
                >
                    <TableIcon size={16} />
                </Button>

                {/* Image Controls (only show when image is selected) */}
                {selectedImageNode && (
                    <>
                        <div className="w-px h-6 bg-border mx-1" />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onShowImageSettings}
                            title="Image Settings"
                        >
                            <Settings size={16} />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onCenterImage}
                            title="Center Image"
                        >
                            <AlignCenter size={16} />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onAlignImageLeft}
                            title="Align Image Left"
                        >
                            <AlignLeft size={16} />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onAlignImageRight}
                            title="Align Image Right"
                        >
                            <AlignRight size={16} />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onResizeImage("50%")}
                            title="Resize to 50%"
                        >
                            <ZoomOut size={16} />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onResizeImage("100%")}
                            title="Resize to 100%"
                        >
                            <ZoomIn size={16} />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onResetImageSize}
                            title="Reset Image Size"
                        >
                            <RotateCw size={16} />
                        </Button>
                    </>
                )}

                {/* Clear Content */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClearContent}
                    className="text-destructive hover:text-destructive"
                >
                    <Trash2 size={16} />
                </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onToggleFullscreen}
                >
                    {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                >
                    Cancel
                </Button>
                <Button
                    type="button"
                    size="sm"
                    onClick={onSave}
                >
                    <Save size={16} className="mr-1" />
                    Save
                </Button>
            </div>
        </div>
    );
}

// Color Picker Component
function ColorPicker({ editor }) {
    const [showPicker, setShowPicker] = useState(false);
    const currentColor = editor.getAttributes('textStyle').color || '#000000';

    return (
        <div className="relative">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPicker(!showPicker)}
                style={{ color: currentColor }}
            >
                <Palette size={16} />
            </Button>

            <AnimatePresence>
                {showPicker && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-1 p-2 bg-popover border rounded-lg shadow-lg z-10 w-48"
                    >
                        <div className="grid grid-cols-4 gap-2">
                            {COLORS.map((color) => (
                                <button
                                    key={color}
                                    className="w-8 h-8 rounded border"
                                    style={{ backgroundColor: color }}
                                    onClick={() => {
                                        editor.chain().focus().setColor(color).run();
                                        setShowPicker(false);
                                    }}
                                    title={color}
                                />
                            ))}
                        </div>
                        <div className="mt-2">
                            <Input
                                type="color"
                                value={currentColor}
                                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                                className="w-full h-8"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Image Upload Modal
function ImageUploadModal({
    show,
    onClose,
    onUpload,
    uploading,
    fileInputRef,
    imageData,
    onImageDataChange,
    onInsert
}) {
    if (!show) return null;

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            onUpload(file);
        }
    };

    return (
        <Dialog open={show} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Insert Image</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload">Upload</TabsTrigger>
                        <TabsTrigger value="url">URL</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-4">
                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground mb-4">
                                Drag & drop or click to upload
                            </p>
                            <Input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                            >
                                {uploading ? "Uploading..." : "Select Image"}
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                                Supported formats: JPG, PNG, GIF, WebP
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="url" className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="image-url">Image URL</Label>
                            <Input
                                id="image-url"
                                placeholder="https://example.com/image.jpg"
                                value={imageData.url}
                                onChange={(e) => onImageDataChange({ ...imageData, url: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="alt-text">Alt Text</Label>
                            <Input
                                id="alt-text"
                                placeholder="Description for accessibility"
                                value={imageData.alt}
                                onChange={(e) => onImageDataChange({ ...imageData, alt: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title-text">Title (Optional)</Label>
                            <Input
                                id="title-text"
                                placeholder="Image title"
                                value={imageData.title}
                                onChange={(e) => onImageDataChange({ ...imageData, title: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="image-width">Width</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="image-width"
                                        placeholder="e.g., 300px or 50%"
                                        value={imageData.width}
                                        onChange={(e) => onImageDataChange({ ...imageData, width: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="image-height">Height</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="image-height"
                                        placeholder="e.g., 200px or auto"
                                        value={imageData.height}
                                        onChange={(e) => onImageDataChange({ ...imageData, height: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="image-align">Alignment</Label>
                            <Select
                                value={imageData.align}
                                onValueChange={(value) => onImageDataChange({ ...imageData, align: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Alignment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="left">Left</SelectItem>
                                    <SelectItem value="center">Center</SelectItem>
                                    <SelectItem value="right">Right</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {imageData.url && (
                            <div className="mt-4 p-2 border rounded">
                                <img
                                    src={imageData.url}
                                    alt="Preview"
                                    className={`mx-auto rounded-lg ${imageData.align === 'left' ? 'float-left mr-4' : imageData.align === 'right' ? 'float-right ml-4' : 'mx-auto'}`}
                                    style={{
                                        width: imageData.width,
                                        height: imageData.height,
                                        maxWidth: '100%'
                                    }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        const errorDiv = e.target.nextElementSibling;
                                        if (errorDiv) errorDiv.classList.remove('hidden');
                                    }}
                                />
                                <div className="hidden text-sm text-destructive text-center mt-2">
                                    Failed to load image preview
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={onInsert}
                        disabled={!imageData.url}
                    >
                        Insert Image
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Image Settings Modal
function ImageSettingsModal({
    show,
    onClose,
    imageData,
    onImageDataChange,
    selectedImageNode,
    onCenterImage,
    onAlignImageLeft,
    onAlignImageRight,
    onResizeImage,
    onSetMaxHeight,
    onResetImageSize
}) {
    if (!show || !selectedImageNode) return null;

    // Parse size for preview - show text representation only
    const getSizeText = (size) => {
        if (size === 'auto') return 'auto';
        if (size.includes('%')) return size;
        if (size.includes('px')) return size;
        return size;
    };

    return (
        <Dialog open={show} onOpenChange={onClose} className="max-h-[50vh] overflow-y-auto">
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Image Settings</DialogTitle>
                    <DialogDescription>
                        Adjust the properties of the selected image
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Alignment Controls */}
                    <div>
                        <Label>Alignment</Label>
                        <div className="flex gap-2 mt-2">
                            <Button
                                type="button"
                                variant={imageData.align === 'left' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => onImageDataChange({ align: 'left' })}
                                className="flex-1"
                            >
                                <AlignLeft size={16} className="mr-2" />
                                Left
                            </Button>
                            <Button
                                type="button"
                                variant={imageData.align === 'center' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => onImageDataChange({ align: 'center' })}
                                className="flex-1"
                            >
                                <AlignCenter size={16} className="mr-2" />
                                Center
                            </Button>
                            <Button
                                type="button"
                                variant={imageData.align === 'right' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => onImageDataChange({ align: 'right' })}
                                className="flex-1"
                            >
                                <AlignRight size={16} className="mr-2" />
                                Right
                            </Button>
                        </div>
                    </div>

                    {/* Quick Size Controls */}
                    <div>
                        <Label>Quick Sizes</Label>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                            {QUICK_SIZES.slice(0, 4).map((size) => (
                                <Button
                                    key={size.label}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onImageDataChange({ width: size.width, height: size.height })}
                                    className={`${imageData.width === size.width && imageData.height === size.height ? 'bg-primary/20 border-primary' : ''}`}
                                >
                                    {size.label}
                                </Button>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {QUICK_SIZES.slice(4).map((size) => (
                                <Button
                                    key={size.label}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onImageDataChange({ width: size.width, height: size.height })}
                                    className={`${imageData.width === size.width && imageData.height === size.height ? 'bg-primary/20 border-primary' : ''}`}
                                >
                                    {size.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Size Controls */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="custom-width">Width</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="custom-width"
                                    placeholder="e.g., 300px or 50%"
                                    value={imageData.width}
                                    onChange={(e) => onImageDataChange({ width: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="custom-height">Height</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="custom-height"
                                    placeholder="e.g., 200px or auto"
                                    value={imageData.height}
                                    onChange={(e) => onImageDataChange({ height: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div>
                        <Label>Quick Actions</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onResetImageSize}
                                className="flex-1"
                            >
                                <RotateCw size={16} className="mr-2" />
                                Reset All
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onImageDataChange({ width: "100%", height: "auto", maxHeight: "none" })}
                                className="flex-1"
                            >
                                <Maximize size={16} className="mr-2" />
                                Full Width
                            </Button>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium mb-2">Preview</div>
                        <div className="text-xs text-muted-foreground mb-2">
                            Image will appear as: {getSizeText(imageData.width)} × {getSizeText(imageData.height)}
                            {(imageData.maxHeight && imageData.maxHeight !== 'none') && ` (max height: ${imageData.maxHeight})`}
                        </div>
                        <div className="border rounded p-4 bg-gray-50 min-h-[120px] flex items-center justify-center">
                            <div className={`inline-block ${imageData.align === 'left' ? 'float-left mr-4' : imageData.align === 'right' ? 'float-right ml-4' : 'mx-auto'}`}>
                                <div
                                    className="bg-primary/20 rounded border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden"
                                    style={{
                                        width: '200px',
                                        height: '150px',
                                        maxHeight: imageData.maxHeight && imageData.maxHeight !== 'none' ? '120px' : '150px',
                                        maxWidth: '100%'
                                    }}
                                >
                                    <div className="text-xs text-primary/60 text-center p-2">
                                        <div>Image Preview</div>
                                        <div className="text-[10px] mt-1">
                                            {getSizeText(imageData.width)} × {getSizeText(imageData.height)}
                                        </div>
                                        {imageData.maxHeight && imageData.maxHeight !== 'none' && (
                                            <div className="text-[10px]">
                                                Max: {imageData.maxHeight}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={onClose}
                    >
                        Apply Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Link Modal Component
function LinkModal({ show, onClose, link, onLinkChange, onInsert, editor }) {
    if (!show) return null;

    return (
        <Dialog open={show} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Insert Link</DialogTitle>
                    <DialogDescription>
                        Add a link to your content
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="link-text">Link Text</Label>
                        <Input
                            id="link-text"
                            placeholder="Click here"
                            value={link.text}
                            onChange={(e) => onLinkChange({ ...link, text: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                            Text that will be displayed as the link
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="link-url">URL</Label>
                        <Input
                            id="link-url"
                            placeholder="https://example.com"
                            value={link.url}
                            onChange={(e) => onLinkChange({ ...link, url: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                            The web address the link will point to
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                className="rounded"
                                defaultChecked
                            />
                            Open in new tab
                        </Label>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={onInsert}
                        disabled={!link.url}
                    >
                        Insert Link
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Navigation Bar Component
function NavigationBar({
    current,
    previous,
    next,
    onPrevious,
    onNext,
    isFirst,
    isLast
}) {
    return (
        <div className="flex items-center justify-between p-3 border-t bg-muted/20">
            <div className="flex-1">
                {previous && (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onPrevious}
                        disabled={isFirst}
                        className="gap-2"
                    >
                        <ArrowLeft size={16} />
                        <div className="text-left">
                            <div className="text-xs text-muted-foreground">Previous</div>
                            <div className="text-sm">{previous.title}</div>
                        </div>
                    </Button>
                )}
            </div>

            <div className="px-4 text-sm text-muted-foreground">
                {current?.title || "Current Content"}
            </div>

            <div className="flex-1 flex justify-end">
                {next && (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onNext}
                        disabled={isLast}
                        className="gap-2"
                    >
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground">Next</div>
                            <div className="text-sm">{next.title}</div>
                        </div>
                        <ArrowRight size={16} />
                    </Button>
                )}
            </div>
        </div>
    );
}