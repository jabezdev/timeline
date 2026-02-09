import { useState, useEffect, useCallback, useRef } from 'react';
import { Popover, PopoverContent, PopoverAnchor, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimelineItem, Milestone, SubProject } from "@/types/timeline";
import { useTimelineMutations } from "@/hooks/useTimelineMutations";

import { Calendar as CalendarIcon, X, Trash2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { debounce } from 'lodash';
import { Button } from "@/components/ui/button";

const COLORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface QuickEditPopoverProps {
    item: TimelineItem | Milestone | SubProject;
    children?: React.ReactNode;
    className?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    anchorPosition?: { x: number; y: number };
}

export function QuickEditPopover({ item, children, className, open: controlledOpen, onOpenChange: setControlledOpen, anchorPosition }: QuickEditPopoverProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

    // Internal state for immediate UI feedback
    const [title, setTitle] = useState(item.title);
    const [date, setDate] = useState('date' in item ? item.date : (item as SubProject).startDate);
    const [endDate, setEndDate] = useState('endDate' in item ? item.endDate : '');
    const [color, setColor] = useState<string | undefined>(item.color);

    const isMilestone = !('completed' in item) && !('startDate' in item);
    const isSubProject = 'startDate' in item;
    const isItem = 'completed' in item;

    const mutations = useTimelineMutations();


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
            mutations.updateItem.mutate({ id: item.id, updates });
        } else if (isMilestone) {
            mutations.updateMilestone.mutate({ id: item.id, updates });
        } else if (isSubProject) {
            mutations.updateSubProject.mutate({ id: item.id, updates });
        }
    }, [isItem, isMilestone, isSubProject, item.id, mutations]);


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
            mutations.deleteItem.mutate(item.id);
        } else if (isMilestone) {
            mutations.deleteMilestone.mutate(item.id);
        } else if (isSubProject) {
            mutations.deleteSubProject.mutate({ id: item.id, deleteItems: false });
        }

        setOpen(false);
    };

    const virtualAnchor = useRef<any>({
        getBoundingClientRect: () => ({
            width: 0,
            height: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            x: 0,
            y: 0,
            toJSON: () => { },
        }),
    });

    useEffect(() => {
        if (anchorPosition) {
            virtualAnchor.current.getBoundingClientRect = () => ({
                width: 0,
                height: 0,
                top: anchorPosition.y,
                left: anchorPosition.x,
                right: anchorPosition.x,
                bottom: anchorPosition.y,
                x: anchorPosition.x,
                y: anchorPosition.y,
                toJSON: () => { },
            });
        }
    }, [anchorPosition]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            {anchorPosition ? (
                <PopoverAnchor virtualRef={virtualAnchor} />
            ) : (
                <PopoverAnchor asChild>
                    <div className={className}>
                        {children}
                    </div>
                </PopoverAnchor>
            )}
            <PopoverContent
                className="w-72 p-3"
                align="center"
                side="right"
                sideOffset={8}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
                onInteractOutside={(e) => {
                    // Default close behavior
                }}
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
                        <div className="space-y-1 flex-1 min-w-0">
                            <Label className="text-xs">{isSubProject ? 'Start' : 'Date'}</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full h-8 justify-start text-left font-normal px-2 text-xs">
                                        <CalendarIcon className="mr-2 h-3 w-3 opacity-50 shrink-0" />
                                        <span className="truncate">{date ? format(parseISO(date), 'MMM d') : "Date"}</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date ? parseISO(date) : undefined}
                                        onSelect={(d) => d && handleDateChange(format(d, 'yyyy-MM-dd'))}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        {isSubProject && (
                            <div className="space-y-1 flex-1 min-w-0">
                                <Label className="text-xs">End</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="w-full h-8 justify-start text-left font-normal px-2 text-xs">
                                            <CalendarIcon className="mr-2 h-3 w-3 opacity-50 shrink-0" />
                                            <span className="truncate">{endDate ? format(parseISO(endDate), 'MMM d') : "End"}</span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={endDate ? parseISO(endDate) : undefined}
                                            onSelect={(d) => d && handleEndDateChange(format(d, 'yyyy-MM-dd'))}
                                            disabled={(d) => date ? d < parseISO(date) : false}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
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
