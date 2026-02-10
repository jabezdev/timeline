import { Sheet, SheetContent } from "@/components/ui/sheet"; // Removed SheetHeader, SheetTitle as they are in Header
import { TimelineItem, Milestone, SubProject, Project } from "@/types/timeline";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { HEADER_HEIGHT } from "@/lib/constants";
import { format } from "date-fns";

// Sub-Components
import { ItemSheetHeader } from "./ItemSheetHeader";
import { ItemSheetProperties } from "./ItemSheetProperties";
import { ItemSheetEditor } from "./ItemSheetEditor";

interface ItemSheetProps {
    item: TimelineItem | Milestone | SubProject | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (item: TimelineItem | Milestone | SubProject) => void;
    onDelete?: (item: TimelineItem | Milestone | SubProject) => void;
    projects: Project[];
    subProjects: SubProject[];
}

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

    const isMilestone = !!item && !('completed' in item) && !('startDate' in item);
    const isSubProject = !!item && 'startDate' in item;
    const isItem = !!item && 'completed' in item;

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

    // Handle Closing (Auto-save)
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && item) {
            if (isItem) {
                const updates: TimelineItem = {
                    ...(item as TimelineItem),
                    title,
                    projectId,
                    color,
                    content,
                    completed,
                    date,
                    subProjectId
                };
                onSave(updates);
            } else if (isMilestone) {
                const updates: Milestone = {
                    ...(item as Milestone),
                    title,
                    projectId,
                    color,
                    content,
                    date
                };
                onSave(updates);
            } else if (isSubProject) {
                const updates: SubProject = {
                    ...(item as SubProject),
                    title,
                    projectId,
                    color,
                    startDate,
                    endDate,
                    description: content
                };
                onSave(updates);
            }
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

    const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
    }, []);

    // Also helper to synthesize change from our EditorToolbar if needed
    // But since we are passing `setContent` logic down via `ItemSheetEditor`, we need to match its prop expectation
    // `ItemSheetEditor` expects `onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void`
    // And I implemented a hack in `ItemSheetEditor` to dispatch event.

    if (!item) return null;

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
                    onDelete={onDelete}
                    completed={completed}
                    setCompleted={setCompleted}
                    isItem={isItem}
                    isMilestone={isMilestone}
                    isSubProject={isSubProject}
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
    );
}
