import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TimelineItem, Milestone, SubProject, Project } from "@/types/timeline";
import { useState, useEffect, useRef, useMemo } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { HEADER_HEIGHT } from "@/lib/constants";
import {
    Palette,
    Eye,
    Columns,
    Edit,
    Trash2,
    CalendarIcon,
    Bold,
    Italic,
    List,
    ListOrdered,
    CheckSquare,
    LayoutGrid,
    Folder,
    GitCommit,
    X
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ItemSheetProps {
    item: TimelineItem | Milestone | SubProject | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (item: TimelineItem | Milestone | SubProject) => void;
    onDelete?: (item: TimelineItem | Milestone | SubProject) => void;
    projects: Project[];
    subProjects: SubProject[];
}

const COLORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function ItemSheet({ item, open, onOpenChange, onSave, onDelete, projects, subProjects }: ItemSheetProps) {
    // Shared State
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [color, setColor] = useState<string | undefined>(undefined);
    const [projectId, setProjectId] = useState<string>("");

    // Item/Milestone State
    const [date, setDate] = useState<string>("");

    // Item State
    const [completed, setCompleted] = useState(false);
    const [subProjectId, setSubProjectId] = useState<string | undefined>(undefined);

    // SubProject State
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    const [viewMode, setViewMode] = useState<'edit' | 'split' | 'preview'>('edit');

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const titleRef = useRef<HTMLTextAreaElement>(null);

    const isMilestone = item && !('completed' in item) && !('startDate' in item);
    const isSubProject = item && 'startDate' in item;
    const isItem = item && 'completed' in item;

    // Filter subprojects based on selected project
    const availableSubProjects = useMemo(() => {
        return subProjects.filter(sp => sp.projectId === projectId);
    }, [subProjects, projectId]);

    // Initialize state
    useEffect(() => {
        if (item) {
            setTitle(item.title);
            setProjectId(item.projectId);
            setColor(item.color);

            let hasContent = false;

            if (isItem) {
                const tItem = item as TimelineItem;
                setContent(tItem.content || "");
                setCompleted(tItem.completed);
                setDate(tItem.date);
                setSubProjectId(tItem.subProjectId);
                hasContent = !!tItem.content;
            } else if (isMilestone) {
                const mItem = item as Milestone;
                setContent(mItem.content || "");
                setDate(mItem.date);
                hasContent = !!mItem.content;
            } else if (isSubProject) {
                const sItem = item as SubProject;
                setStartDate(sItem.startDate);
                setEndDate(sItem.endDate);
                setContent(sItem.description || "");
                hasContent = !!sItem.description;
            }

            setViewMode(hasContent ? 'preview' : 'edit');
        }
    }, [item, isItem, isMilestone, isSubProject]);

    // Auto-resize title when it changes or sheet opens
    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.style.height = 'auto';
            titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
        }
    }, [title, open]);

    // Handle Closing (Auto-save)
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && item) {
            const updates: any = {
                ...item,
                title,
                projectId,
                color
            };

            if (isItem) {
                updates.content = content;
                updates.completed = completed;
                updates.date = date;
                updates.subProjectId = subProjectId;
            } else if (isMilestone) {
                updates.content = content;
                updates.date = date;
            } else if (isSubProject) {
                updates.startDate = startDate;
                updates.endDate = endDate;
                updates.description = content;
            }

            onSave(updates);
        }
        onOpenChange(newOpen);
    };

    const handleProjectChange = (newProjectId: string) => {
        setProjectId(newProjectId);
        // Reset subproject if project changes
        if (subProjectId) {
            const currentSub = subProjects.find(sp => sp.id === subProjectId);
            if (currentSub && currentSub.projectId !== newProjectId) {
                setSubProjectId(undefined);
            }
        }
    };

    const insertMarkdown = (prefix: string, suffix: string = "") => {
        if (!textareaRef.current) return;
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = textareaRef.current.value;
        const newText = text.substring(0, start) + prefix + text.substring(start, end) + suffix + text.substring(end);
        setContent(newText);
        setTimeout(() => {
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(start + prefix.length, end + prefix.length);
        }, 0);
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTitle(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    };

    if (!item) return null;

    const currentProject = projects.find(p => p.id === projectId);
    const currentSubProject = subProjects.find(sp => sp.id === subProjectId);

    return (
        <Sheet open={open} onOpenChange={handleOpenChange} modal={false}>
            <SheetContent
                className="w-[600px] sm:max-w-[1000px] p-0 flex flex-col gap-0 border-l border-border/40 bg-background/80 backdrop-blur-xl shadow-2xl [&>button]:hidden"
                style={{
                    top: `${HEADER_HEIGHT}px`,
                    height: `calc(100vh - ${HEADER_HEIGHT}px)`,
                    maxHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
                    boxShadow: '-20px 0 50px rgba(0,0,0,0.1)'
                }}
            >
                {/* Header Section */}
                <SheetHeader className="p-6 pb-2 border-b border-border/10 bg-muted/20 shrink-0">
                    <SheetTitle className="sr-only">Edit Item</SheetTitle>

                    {/* Top Row: Type Badge & Status */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {/* Close Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                                onClick={() => handleOpenChange(false)}
                            >
                                <X className="w-4 h-4" />
                            </Button>

                            <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                isItem ? "bg-primary/10 text-primary border-primary/20" :
                                    isMilestone ? "bg-orange-500/10 text-orange-600 border-orange-500/20" :
                                        "bg-purple-500/10 text-purple-600 border-purple-500/20"
                            )}>
                                {isItem ? "Task" : isMilestone ? "Milestone" : "SubProject"}
                            </span>

                            {isItem && (
                                <div className="flex items-center gap-2 ml-2">
                                    <Checkbox
                                        id="completed"
                                        checked={completed}
                                        onCheckedChange={(c) => setCompleted(!!c)}
                                        className="w-4 h-4"
                                    />
                                    <label htmlFor="completed" className="text-xs font-medium cursor-pointer select-none">
                                        {completed ? "Completed" : "Active"}
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                    if (onDelete && confirm("Delete this item?")) {
                                        onDelete(item);
                                        handleOpenChange(false);
                                    }
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Title Input */}
                    <div className="min-h-[44px] relative">
                        <textarea
                            ref={titleRef}
                            value={title}
                            onChange={handleTitleChange}
                            onKeyDown={handleTitleKeyDown}
                            className="w-full text-2xl font-bold bg-transparent border-none resize-none focus:ring-0 px-0 py-1 leading-tight overflow-hidden"
                            placeholder="Title"
                            rows={1}
                            style={{ height: 'auto', minHeight: '44px' }}
                        />
                    </div>
                </SheetHeader>

                {/* Properties Grid */}
                <div className="p-4 py-2 grid grid-cols-2 gap-x-6 gap-y-2 bg-muted/10 border-b border-border/10 text-sm">
                    {/* Project - Full width for SubProjects or if Item (to be consistent with side-by-side SubProject) */}
                    <div className={cn("flex flex-col gap-1", isSubProject ? "col-span-2" : "")}>
                        <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                            <LayoutGrid className="w-3 h-3" /> Project
                        </label>
                        <Select value={projectId} onValueChange={handleProjectChange}>
                            <SelectTrigger className="h-7 text-xs border-border/40 bg-background/50">
                                <SelectValue placeholder="Select Project" />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* SubProject (for Items) - Placed next to Project */}
                    {isItem && (
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                <Folder className="w-3 h-3" /> Sub-Project
                            </label>
                            <Select value={subProjectId || "none"} onValueChange={(v) => setSubProjectId(v === "none" ? undefined : v)}>
                                <SelectTrigger className="h-7 text-xs border-border/40 bg-background/50">
                                    <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {availableSubProjects.map(sp => (
                                        <SelectItem key={sp.id} value={sp.id}>{sp.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Date / Start Date */}
                    {!isSubProject && (
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                <CalendarIcon className="w-3 h-3" /> Date
                            </label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-7 text-xs justify-start text-left font-normal border-border/40 bg-background/50 w-full">
                                        {date ? format(parseISO(date), 'MMM d, yyyy') : "Select date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date ? parseISO(date) : undefined}
                                        onSelect={(d) => d && setDate(format(d, 'yyyy-MM-dd'))}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}

                    {/* SubProject Dates (Side-by-Side) */}
                    {isSubProject && (
                        <>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                    <CalendarIcon className="w-3 h-3" /> Start Date
                                </label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-7 text-xs justify-start text-left font-normal border-border/40 bg-background/50 w-full">
                                            {startDate ? format(parseISO(startDate), 'MMM d, yyyy') : "Select date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={startDate ? parseISO(startDate) : undefined}
                                            onSelect={(d) => d && setStartDate(format(d, 'yyyy-MM-dd'))}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                                    <CalendarIcon className="w-3 h-3" /> End Date
                                </label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-7 text-xs justify-start text-left font-normal border-border/40 bg-background/50 w-full">
                                            {endDate ? format(parseISO(endDate), 'MMM d, yyyy') : "Select date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={endDate ? parseISO(endDate) : undefined}
                                            onSelect={(d) => d && setEndDate(format(d, 'yyyy-MM-dd'))}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </>
                    )}



                    {/* Color */}
                    <div className="flex flex-col gap-1 col-span-2">
                        <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                            <Palette className="w-3 h-3" /> Color
                        </label>
                        <div className="flex items-center gap-2">
                            {/* Preview Dot */}
                            <div className="w-7 h-7 rounded-full border border-border flex items-center justify-center shrink-0">
                                <div className="w-3.5 h-3.5 rounded-full" style={{
                                    backgroundColor: color ? `hsl(var(--workspace-${color}))` : 'transparent',
                                    border: !color ? '1px solid currentColor' : 'none'
                                }} />
                            </div>

                            <div className="flex-1 overflow-x-auto scrollbar-hide py-0.5">
                                <div className="flex items-center gap-1">
                                    {COLORS.map((c) => (
                                        <button
                                            key={c}
                                            className={cn(
                                                "w-5 h-5 rounded-md transition-all border border-border/20 hover:scale-110",
                                                color === String(c) ? "ring-2 ring-offset-1 ring-primary" : "opacity-70 hover:opacity-100"
                                            )}
                                            style={{ backgroundColor: `hsl(var(--workspace-${c}))` }}
                                            onClick={() => setColor(String(c))}
                                        />
                                    ))}
                                    <button
                                        className={cn(
                                            "w-5 h-5 rounded-md border border-border flex items-center justify-center text-[10px] opacity-70 hover:opacity-100 hover:bg-secondary",
                                            !color ? "ring-2 ring-offset-1 ring-primary" : ""
                                        )}
                                        onClick={() => setColor(undefined)}
                                        title="None"
                                    >
                                        <div className="w-2.5 h-2.5 border-b border-l border-muted-foreground rotate-45" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Editor / Content */}
                <div className="flex-1 flex flex-col min-h-0 relative">
                    {(viewMode === 'edit' || viewMode === 'split') && (
                        <Textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Add details, notes, or tasks..."
                            className={cn(
                                "flex-1 border-none shadow-none focus-visible:ring-0 resize-none p-6 font-mono text-sm bg-transparent",
                                viewMode === 'split' ? "h-1/2 border-b" : "h-full"
                            )}
                        />
                    )}

                    {(viewMode === 'preview' || viewMode === 'split') && (
                        <div className={cn(
                            "overflow-y-auto p-6 prose prose-sm dark:prose-invert max-w-none bg-secondary/10 break-words",
                            viewMode === 'split' ? "h-1/2" : "h-full"
                        )}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {content || "*No content provided*"}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Toolbar */}
                <div className="p-2 border-t bg-background/50 flex items-center justify-between shrink-0">
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('**', '**')}><Bold className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('*', '*')}><Italic className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('- ')}><List className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('1. ')}><ListOrdered className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('- [ ] ')}><CheckSquare className="w-4 h-4" /></Button>
                    </div>

                    <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)}>
                        <ToggleGroupItem value="edit" size="sm" className="h-8 w-8"><Edit className="w-4 h-4" /></ToggleGroupItem>
                        <ToggleGroupItem value="split" size="sm" className="h-8 w-8"><Columns className="w-4 h-4" /></ToggleGroupItem>
                        <ToggleGroupItem value="preview" size="sm" className="h-8 w-8"><Eye className="w-4 h-4" /></ToggleGroupItem>
                    </ToggleGroup>
                </div>

            </SheetContent>
        </Sheet>
    );
}
