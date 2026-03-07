import { Sheet, SheetContent } from "@/components/ui/sheet";
import { TimelineItem, Milestone, SubProject, Project } from "@/types/timeline";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { HEADER_HEIGHT } from "@/lib/constants";
import { format } from "date-fns";
import { toast } from "sonner";

// Sub-Components
import { ItemSheetHeader } from "./ItemSheetHeader";
import { ItemSheetProperties } from "./ItemSheetProperties";
import { ItemSheetEditor } from "./ItemSheetEditor";
import { UnsavedChangesDialog } from "@/components/ui/UnsavedChangesDialog";
import { cn } from "@/lib/utils";

interface ItemSheetProps {
    item: TimelineItem | Milestone | SubProject | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (item: TimelineItem | Milestone | SubProject) => void;
    onDelete?: (item: TimelineItem | Milestone | SubProject) => void;
    projects: Project[];
    subProjects: SubProject[];
    blurEffectsEnabled?: boolean;
}

export function ItemSheet({ item, open, onOpenChange, onSave, onDelete, projects, subProjects, blurEffectsEnabled = true }: ItemSheetProps) {
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
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const isDeleting = useRef(false);

    const isMilestone = !!item && !('completed' in item) && !('startDate' in item);
    const isSubProject = !!item && 'startDate' in item;
    const isItem = !!item && 'completed' in item;

    // Filter subprojects based on selected project
    const availableSubProjects = useMemo(() => {
        return subProjects.filter(sp => sp.projectId === projectId);
    }, [subProjects, projectId]);

    // Initialize state when item changes
    useEffect(() => {
        if (item) {
            setTitle(item.title);
            setProjectId(item.projectId);
            setColor(item.color);
            isDeleting.current = false;

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

    // Compute dirty state
    const isDirty = useMemo(() => {
        if (!item) return false;
        if (isItem) {
            const o = item as TimelineItem;
            return (
                title !== o.title ||
                content !== (o.content ?? "") ||
                color !== o.color ||
                date !== o.date ||
                completed !== o.completed ||
                subProjectId !== o.subProjectId ||
                projectId !== o.projectId
            );
        }
        if (isMilestone) {
            const o = item as Milestone;
            return (
                title !== o.title ||
                content !== (o.content ?? "") ||
                color !== o.color ||
                date !== o.date ||
                projectId !== o.projectId
            );
        }
        if (isSubProject) {
            const o = item as SubProject;
            return (
                title !== o.title ||
                content !== (o.description ?? "") ||
                color !== o.color ||
                startDate !== o.startDate ||
                endDate !== o.endDate ||
                projectId !== o.projectId
            );
        }
        return false;
    }, [item, isItem, isMilestone, isSubProject, title, content, color, date, completed, subProjectId, projectId, startDate, endDate]);

    // Explicit save — fires the mutation with current local state
    const handleSave = useCallback(() => {
        if (!item) return;
        if (isItem) {
            const original = item as TimelineItem;
            onSave({ ...original, title, projectId, color, content, completed, date, subProjectId });
        } else if (isMilestone) {
            const original = item as Milestone;
            onSave({ ...original, title, projectId, color, content, date });
        } else if (isSubProject) {
            const original = item as SubProject;
            onSave({ ...original, title, projectId, color, startDate, endDate, description: content });
        }
        toast.success("Saved");
    }, [item, isItem, isMilestone, isSubProject, title, projectId, color, content, completed, date, subProjectId, startDate, endDate, onSave]);

    // Handle close attempt — intercept if dirty
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && isDirty && !isDeleting.current) {
            setShowUnsavedDialog(true);
            return;
        }
        onOpenChange(newOpen);
    };

    const handleUnsavedSave = () => {
        handleSave();
        setShowUnsavedDialog(false);
        onOpenChange(false);
    };

    const handleUnsavedDiscard = () => {
        setShowUnsavedDialog(false);
        onOpenChange(false);
    };

    const handleUnsavedCancel = () => {
        setShowUnsavedDialog(false);
    };

    const handleProjectChange = (newProjectId: string) => {
        setProjectId(newProjectId);
        if (subProjectId) {
            const currentSub = subProjects.find(sp => sp.id === subProjectId);
            if (currentSub && currentSub.projectId !== newProjectId) {
                setSubProjectId(undefined);
            }
        }
    };

    const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
    }, []);

    const handleDelete = useCallback((itemToDelete: TimelineItem | Milestone | SubProject) => {
        isDeleting.current = true;
        onDelete?.(itemToDelete);
    }, [onDelete]);

    if (!item) return null;

    return (
        <>
            <Sheet open={open} onOpenChange={handleOpenChange} modal={false}>
                <SheetContent
                    showOverlay={false}
                    className={cn(
                        "w-[600px] sm:max-w-[1000px] p-0 flex flex-col gap-0 border-l border-border/40 bg-background/80 shadow-2xl [&>button]:hidden",
                        blurEffectsEnabled && "backdrop-blur-xl"
                    )}
                    style={{
                        top: `${HEADER_HEIGHT}px`,
                        height: `calc(100vh - ${HEADER_HEIGHT}px)`,
                        maxHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
                        boxShadow: '-20px 0 50px rgba(0,0,0,0.1)'
                    }}
                >
                    <ItemSheetHeader
                        item={item}
                        title={title}
                        onTitleChange={(e) => {
                            setTitle(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onTitleKeyDown={(e) => {
                            if (e.key === 'Enter') e.preventDefault();
                        }}
                        onClose={() => handleOpenChange(false)}
                        onDelete={handleDelete}
                        completed={completed}
                        setCompleted={setCompleted}
                        isItem={isItem}
                        isMilestone={isMilestone}
                        isSubProject={isSubProject}
                        isDirty={isDirty}
                        onSave={handleSave}
                    />

                    <ItemSheetProperties
                        projects={projects}
                        availableSubProjects={availableSubProjects}
                        projectId={projectId}
                        subProjectId={subProjectId}
                        isItem={isItem}
                        isSubProject={isSubProject}
                        date={date}
                        startDate={startDate}
                        endDate={endDate}
                        color={color}
                        onProjectChange={handleProjectChange}
                        onSubProjectChange={(v) => setSubProjectId(v === "none" ? undefined : v)}
                        onDateChange={(d) => d && setDate(format(d, 'yyyy-MM-dd'))}
                        onStartDateChange={(d) => d && setStartDate(format(d, 'yyyy-MM-dd'))}
                        onEndDateChange={(d) => d && setEndDate(format(d, 'yyyy-MM-dd'))}
                        onColorChange={setColor}
                    />

                    <ItemSheetEditor
                        content={content}
                        viewMode={viewMode}
                        onContentChange={handleContentChange}
                        onViewModeChange={setViewMode}
                    />
                </SheetContent>
            </Sheet>

            <UnsavedChangesDialog
                open={showUnsavedDialog}
                onSave={handleUnsavedSave}
                onDiscard={handleUnsavedDiscard}
                onCancel={handleUnsavedCancel}
            />
        </>
    );
}
