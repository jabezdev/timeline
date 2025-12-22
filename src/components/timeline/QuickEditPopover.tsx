import { useState, useEffect, useCallback, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimelineItem, Milestone, SubProject } from "@/types/timeline";
import { useTimelineStore } from "@/hooks/useTimelineStore";
import { X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { debounce } from 'lodash';
import { Button } from "@/components/ui/button";

const COLORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface QuickEditPopoverProps {
    item: TimelineItem | Milestone | SubProject;
    children: React.ReactNode;
    className?: string;
}

export function QuickEditPopover({ item, children, className }: QuickEditPopoverProps) {
    const [open, setOpen] = useState(false);

    // Internal state for immediate UI feedback
    const [title, setTitle] = useState(item.title);
    const [date, setDate] = useState('date' in item ? item.date : (item as SubProject).startDate);
    const [endDate, setEndDate] = useState('endDate' in item ? item.endDate : '');
    const [color, setColor] = useState<string | undefined>(item.color);

    const isMilestone = !('completed' in item) && !('startDate' in item);
    const isSubProject = 'startDate' in item;
    const isItem = 'completed' in item;

    const {
        updateItem,
        updateMilestone,
        updateSubProject,
        deleteItem,
        deleteMilestone,
        deleteSubProject
    } = useTimelineStore();

    // Reset state when item changes or popover opens
    useEffect(() => {
        if (open) {
            setTitle(item.title);
            if (isSubProject) {
                setDate((item as SubProject).startDate);
                setEndDate((item as SubProject).endDate);
            } else {
                setDate((item as any).date);
            }
            setColor(item.color);
        }
    }, [open, item, isSubProject]);

    // Save Logic
    const saveChanges = useCallback((updates: any) => {
        if (isItem) {
            updateItem(item.id, updates);
        } else if (isMilestone) {
            updateMilestone(item.id, updates);
        } else if (isSubProject) {
            updateSubProject(item.id, updates);
        }
    }, [isItem, isMilestone, isSubProject, item.id, updateItem, updateMilestone, updateSubProject]);

    // Debounced Save for Title
    const debouncedSaveTitle = useRef(
        debounce((newTitle: string) => {
            saveChanges({ title: newTitle });
        }, 500)
    ).current;

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setTitle(newVal);
        debouncedSaveTitle(newVal);
    };

    const handleDateChange = (newDate: string) => {
        setDate(newDate);
        if (isSubProject) {
            saveChanges({ startDate: newDate });
        } else {
            saveChanges({ date: newDate });
        }
    };

    const handleEndDateChange = (newDate: string) => {
        setEndDate(newDate);
        saveChanges({ endDate: newDate });
    };

    const handleColorChange = (newColor: string | undefined) => {
        setColor(newColor);
        saveChanges({ color: newColor });
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isItem) {
            deleteItem(item.id);
        } else if (isMilestone) {
            deleteMilestone(item.id);
        } else if (isSubProject) {
            // Default to deleting items? Or ask? User said "edit really quickly".
            // SubProject deletion usually requires confirmation on items.
            // For now, let's assume rapid delete means delete SubProject + unlink items (safe) or just delete subProject.
            // The store signature is deleteSubProject(id, deleteItems: boolean).
            // Let's pass 'false' (unlink) to be safe/standard for quick delete, or maybe we want a confirmation?
            // "edit really quickly without opening each thing" -> speed.
            // A simple delete button might be too dangerous for SubProjects if it nukes items.
            // BUT, for tasks/milestones it's fine.
            // Let's implement unlink (false) for SubProjects to be safe but fast.
            deleteSubProject(item.id, false);
        }
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div
                    className={className}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpen(true);
                    }}
                >
                    {children}
                </div>
            </PopoverTrigger>
            <PopoverContent
                className="w-72 p-3"
                align="start"
                side="bottom"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label className="text-xs">Title</Label>
                        <Input
                            value={title}
                            onChange={handleTitleChange}
                            className="h-8 text-xs"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-2">
                        <div className="space-y-1 flex-1">
                            <Label className="text-xs">{isSubProject ? 'Start' : 'Date'}</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                        {isSubProject && (
                            <div className="space-y-1 flex-1">
                                <Label className="text-xs">End</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => handleEndDateChange(e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs">Color</Label>
                        <div className="grid grid-cols-6 gap-2 justify-items-center">
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    className={cn(
                                        "w-6 h-6 rounded-full transition-all border border-border/20",
                                        color === String(c) ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                                    )}
                                    style={{ backgroundColor: `hsl(var(--workspace-${c}))` }}
                                    onClick={() => handleColorChange(String(c))}
                                />
                            ))}
                            <button
                                className={cn(
                                    "w-6 h-6 rounded-full border border-border flex items-center justify-center text-[10px]",
                                    !color ? "ring-2 ring-offset-2 ring-primary" : "hover:bg-secondary"
                                )}
                                onClick={() => handleColorChange(undefined)}
                                title="None"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-border flex justify-end">
                        <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 w-full text-xs"
                            onClick={handleDelete}
                        >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
