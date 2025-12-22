import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TimelineItem, Milestone, SubProject } from "@/types/timeline";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Palette,
    Eye,
    Columns,
    Edit,
    X,
    Bold,
    Italic,
    List,
    ListOrdered,
    CheckSquare,
    Trash2
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ItemDialogProps {
    item: TimelineItem | Milestone | SubProject | null;

    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (item: TimelineItem | Milestone | SubProject) => void;
    onDelete?: (item: TimelineItem | Milestone | SubProject) => void;
}

const COLORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function ItemDialog({ item, open, onOpenChange, onSave, onDelete }: ItemDialogProps) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [completed, setCompleted] = useState(false);
    const [color, setColor] = useState<string | undefined>(undefined);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('timeline-item-view-mode') as 'edit' | 'split' | 'preview') || 'preview';
        }
        return 'preview';
    });

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const titleRef = useRef<HTMLTextAreaElement>(null);

    const isMilestone = item && !('completed' in item) && !('startDate' in item);
    const isSubProject = item && 'startDate' in item;
    const isItem = item && 'completed' in item;

    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.style.height = 'auto';
            titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
        }
    }, [title, open]);

    useEffect(() => {
        if (item) {
            setTitle(item.title);
            if (isItem) {
                const tItem = item as TimelineItem;
                setContent(tItem.content || "");
                setCompleted(tItem.completed);
                setColor(tItem.color);
            } else if (isMilestone) {
                const mItem = item as Milestone;
                setContent(mItem.content || "");
                setColor(mItem.color);
            } else if (isSubProject) {
                const sItem = item as SubProject;
                setStartDate(sItem.startDate);
                setEndDate(sItem.endDate);
                setContent(sItem.description || "");
                setColor(sItem.color);
            }
        }
    }, [item, isMilestone, isItem, isSubProject]);

    const handleViewModeChange = (value: string) => {
        if (value) {
            const mode = value as 'edit' | 'split' | 'preview';
            setViewMode(mode);
            localStorage.setItem('timeline-item-view-mode', mode);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && item) {
            // Auto-save on close
            const updates: any = {
                ...item,
                title,
            };

            if (isItem) {
                updates.content = content;
                updates.completed = completed;
                updates.color = color;
                updates.color = color;
            } else if (isMilestone) {
                updates.content = content;
                updates.color = color;
            } else if (isSubProject) {
                updates.startDate = startDate;
                updates.endDate = endDate;
                updates.description = content;
                updates.color = color;
            }

            onSave(updates);
        }
        onOpenChange(newOpen);
    };

    const insertMarkdown = (prefix: string, suffix: string = "") => {
        if (!textareaRef.current) return;

        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = textareaRef.current.value;

        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        const newText = before + prefix + selection + suffix + after;
        setContent(newText);

        // Restore focus and selection
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(
                    start + prefix.length,
                    end + prefix.length
                );
            }
        }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const value = textarea.value;

            // Get the current line up to the cursor
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const currentLine = value.substring(lineStart, start);

            // Check for list patterns
            const checkListMatch = currentLine.match(/^(\s*)([-*])\s\[([ xX])\]\s(.*)/);
            const unorderedListMatch = currentLine.match(/^(\s*)([-*])\s(.*)/);
            const orderedListMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)/);

            if (checkListMatch) {
                e.preventDefault();
                const indent = checkListMatch[1];
                const bullet = checkListMatch[2];
                const content = checkListMatch[4];

                if (content.trim() === '') {
                    // If the line is empty (just the list marker), remove it
                    const newValue = value.substring(0, lineStart) + value.substring(start);
                    setContent(newValue);
                    // Need to set cursor position after render
                    setTimeout(() => {
                        if (textareaRef.current) {
                            textareaRef.current.setSelectionRange(lineStart, lineStart);
                        }
                    }, 0);
                } else {
                    const insertion = `\n${indent}${bullet} [ ] `;
                    const newValue = value.substring(0, start) + insertion + value.substring(end);
                    setContent(newValue);
                    setTimeout(() => {
                        if (textareaRef.current) {
                            textareaRef.current.setSelectionRange(start + insertion.length, start + insertion.length);
                        }
                    }, 0);
                }
            } else if (unorderedListMatch) {
                e.preventDefault();
                const indent = unorderedListMatch[1];
                const bullet = unorderedListMatch[2];
                const content = unorderedListMatch[3];

                if (content.trim() === '') {
                    // Empty item, remove it
                    const newValue = value.substring(0, lineStart) + value.substring(start);
                    setContent(newValue);
                    setTimeout(() => {
                        if (textareaRef.current) {
                            textareaRef.current.setSelectionRange(lineStart, lineStart);
                        }
                    }, 0);
                } else {
                    const insertion = `\n${indent}${bullet} `;
                    const newValue = value.substring(0, start) + insertion + value.substring(end);
                    setContent(newValue);
                    setTimeout(() => {
                        if (textareaRef.current) {
                            textareaRef.current.setSelectionRange(start + insertion.length, start + insertion.length);
                        }
                    }, 0);
                }
            } else if (orderedListMatch) {
                e.preventDefault();
                const indent = orderedListMatch[1];
                const number = parseInt(orderedListMatch[2]);
                const content = orderedListMatch[3];

                if (content.trim() === '') {
                    // Empty item, remove it
                    const newValue = value.substring(0, lineStart) + value.substring(start);
                    setContent(newValue);
                    setTimeout(() => {
                        if (textareaRef.current) {
                            textareaRef.current.setSelectionRange(lineStart, lineStart);
                        }
                    }, 0);
                } else {
                    const insertion = `\n${indent}${number + 1}. `;
                    const newValue = value.substring(0, start) + insertion + value.substring(end);
                    setContent(newValue);
                    setTimeout(() => {
                        if (textareaRef.current) {
                            textareaRef.current.setSelectionRange(start + insertion.length, start + insertion.length);
                        }
                    }, 0);
                }
            }
        }
    };

    if (!item) return null;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[900px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden [&>button]:hidden">
                <DialogHeader className="flex-shrink-0 p-4 border-b bg-background z-10">
                    <div className="flex items-center gap-4 w-full">
                        {!isMilestone && !isSubProject && (
                            <Checkbox
                                checked={completed}
                                onCheckedChange={(c) => setCompleted(!!c)}
                                className="w-6 h-6 shrink-0"
                            />
                        )}

                        <textarea
                            ref={titleRef}
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            rows={1}
                            placeholder="Title"
                            className="text-xl font-bold border-none shadow-none focus:outline-none focus:ring-0 px-0 py-0 h-auto bg-transparent flex-1 placeholder:text-muted-foreground/50 resize-none overflow-hidden min-h-[28px]"
                            onFocus={(e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                        />

                        <div className="flex items-center gap-2 shrink-0">
                            <>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="icon" className="shrink-0 h-8 w-8" style={{
                                            backgroundColor: color?.startsWith('#')
                                                ? color
                                                : color
                                                    ? `hsl(var(--workspace-${color}))`
                                                    : undefined
                                        }}>
                                            <Palette className={cn("h-4 w-4", color ? "text-white" : "text-foreground")} />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64">
                                        <div className="grid grid-cols-4 gap-2">
                                            {COLORS.map((c) => (
                                                <button
                                                    key={c}
                                                    className={cn(
                                                        "w-8 h-8 rounded-full border border-border transition-all hover:scale-110",
                                                        color === String(c) ? "ring-2 ring-offset-2 ring-black" : ""
                                                    )}
                                                    style={{ backgroundColor: `hsl(var(--workspace-${c}))` }}
                                                    onClick={() => setColor(String(c))}
                                                />
                                            ))}
                                            <button
                                                className={cn(
                                                    "w-8 h-8 rounded-full border border-border transition-all hover:scale-110 flex items-center justify-center text-xs",
                                                    !color ? "ring-2 ring-offset-2 ring-black" : ""
                                                )}
                                                onClick={() => setColor(undefined)}
                                            >
                                                None
                                            </button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </>


                            <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0 h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => {
                                    if (item && onDelete) {
                                        if (confirm("Are you sure you want to delete this item?")) {
                                            onDelete(item);
                                            onOpenChange(false);
                                        }
                                    }
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0 h-8 w-8"
                                onClick={() => handleOpenChange(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    {isSubProject && (
                        <div className="flex gap-4 mt-2">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-muted-foreground">End Date</label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                        </div>
                    )}
                </DialogHeader>

                <div className="flex-1 flex min-h-0 relative">
                    {/* Editor Side */}
                    {(viewMode === 'edit' || viewMode === 'split') && (
                        <div className={cn(
                            "flex flex-col h-full",
                            viewMode === 'split' ? "w-1/2 border-r border-border/50" : "w-full"
                        )}>
                            <Textarea
                                ref={textareaRef}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Write with Markdown..."
                                className="flex-1 border-none shadow-none focus-visible:ring-0 resize-none font-mono text-sm p-6 rounded-none bg-background"
                            />
                        </div>
                    )}

                    {/* Preview Side */}
                    {(viewMode === 'preview' || viewMode === 'split') && (
                        <div className={cn(
                            "flex flex-col h-full overflow-hidden bg-secondary/5",
                            viewMode === 'split' ? "w-1/2" : "w-full"
                        )}>
                            <div className="flex-1 overflow-y-auto p-6 prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4 hover:text-primary/80" {...props} />
                                    }}
                                >
                                    {content || "*No content*"}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>

                {/* Date Metadata Footer */}
                <div className="flex-shrink-0 px-6 py-2 bg-secondary/5 border-t border-border/50 text-[10px] text-muted-foreground flex items-center gap-4 select-none">
                    {item.createdAt && (
                        <span>Created: {new Date(item.createdAt).toLocaleString()}</span>
                    )}
                    {item.updatedAt && (
                        <span>Modified: {new Date(item.updatedAt).toLocaleString()}</span>
                    )}
                    {(item as TimelineItem).completedAt && (
                        <span>Completed: {new Date((item as TimelineItem).completedAt!).toLocaleString()}</span>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 p-2 border-t bg-background flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('**', '**')}>
                            <Bold className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('*', '*')}>
                            <Italic className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('- ')}>
                            <List className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('1. ')}>
                            <ListOrdered className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('- [ ] ')}>
                            <CheckSquare className="h-4 w-4" />
                        </Button>
                    </div>

                    <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange}>
                        <ToggleGroupItem value="edit" aria-label="Edit" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="split" aria-label="Split" size="sm" className="h-8 w-8 p-0">
                            <Columns className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="preview" aria-label="Preview" size="sm" className="h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </DialogContent>
        </Dialog>
    );
}