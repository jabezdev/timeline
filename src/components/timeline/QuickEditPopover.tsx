import { useState, useEffect, useCallback, useRef } from 'react';
import { Popover, PopoverContent, PopoverAnchor, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimelineItem, Milestone, SubProject } from "@/types/timeline";
import { useTimelineMutations } from "@/hooks/useTimelineMutations";

import { Calendar as CalendarIcon, X, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { debounce } from 'lodash';
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { addDays, addWeeks } from "date-fns";

const COLORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface QuickEditPopoverProps {
    item: TimelineItem | Milestone | SubProject;
    availableSubProjects?: SubProject[];
    children?: React.ReactNode;
    className?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;

    anchorRect?: DOMRect | { x: number; y: number; width: number; height: number; top: number; left: number; right: number; bottom: number; toJSON: () => any };
}

export function QuickEditPopover({ item, availableSubProjects = [], children, className, open: controlledOpen, onOpenChange: setControlledOpen, anchorRect }: QuickEditPopoverProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

    // Internal state for immediate UI feedback
    const [title, setTitle] = useState(item.title);
    const [date, setDate] = useState('date' in item ? item.date : (item as SubProject).startDate);
    const [endDate, setEndDate] = useState('endDate' in item ? item.endDate : '');
    const [color, setColor] = useState<string | undefined>(item.color);
    const [subProjectId, setSubProjectId] = useState<string | undefined>('subProjectId' in item ? item.subProjectId : undefined);

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
            setSubProjectId('subProjectId' in item ? item.subProjectId : undefined);
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

    const handleSubProjectChange = (newSubProjectId: string) => {
        const val = newSubProjectId === "none" ? undefined : newSubProjectId;
        setSubProjectId(val);
        saveChanges({ subProjectId: val });
    };

    const shiftDate = (amount: number, unit: 'days' | 'weeks') => {
        if (!date) return;
        const current = parseISO(date);
        const newDate = unit === 'days' ? addDays(current, amount) : addWeeks(current, amount);
        const newDateStr = format(newDate, 'yyyy-MM-dd');
        handleDateChange(newDateStr);

        // Also shift end date for subprojects to maintain duration
        if (isSubProject && endDate) {
            const currentEnd = parseISO(endDate);
            const newEnd = unit === 'days' ? addDays(currentEnd, amount) : addWeeks(currentEnd, amount);
            handleEndDateChange(format(newEnd, 'yyyy-MM-dd'));
        }
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
        if (anchorRect) {
            virtualAnchor.current.getBoundingClientRect = () => anchorRect;
        }
    }, [anchorRect]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            {anchorRect ? (
                <PopoverAnchor virtualRef={virtualAnchor} />
            ) : (
                <PopoverAnchor asChild>
                    <div className={className}>
                        {children}
                    </div>
                </PopoverAnchor>
            )}
            <PopoverContent
                className="w-[340px] p-0 overflow-hidden shadow-2xl border border-border/40 bg-background/80 backdrop-blur-xl"
                align="center"
                side="bottom"
                sideOffset={8}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
                onInteractOutside={(e) => {
                    // Default close behavior
                }}
            >
                {/* Header / Title Input */}
                <div className="p-4 border-b border-border/10 bg-muted/20">
                    <Input
                        value={title}
                        onChange={handleTitleChange}
                        className="h-9 text-base font-semibold border-none bg-transparent shadow-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/50"
                        placeholder="Item Title"
                        autoFocus
                    />
                </div>

                <div className="p-2 space-y-1">

                    {/* Quick Date Actions Row - Integrated */}
                    <div className="flex items-center gap-2 group hover:bg-muted/30 rounded-md p-1.5 transition-colors">
                        <div className="w-8 flex items-center justify-center text-muted-foreground">
                            <CalendarIcon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => shiftDate(-1, 'weeks')} title="-1 Week">
                                    <ChevronsLeft className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => shiftDate(-1, 'days')} title="-1 Day">
                                    <ChevronLeft className="h-3 w-3" />
                                </Button>
                            </div>

                            <div className="flex-1 min-w-0">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 w-full justify-center px-2 font-normal text-sm hover:bg-transparent">
                                            {date ? format(parseISO(date), 'MMM d, yyyy') : "Date"}
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

                            <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => shiftDate(1, 'days')} title="+1 Day">
                                    <ChevronRight className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => shiftDate(1, 'weeks')} title="+1 Week">
                                    <ChevronsRight className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {isSubProject && (
                        <div className="flex items-center gap-2 group hover:bg-muted/30 rounded-md p-1.5 transition-colors">
                            <div className="w-8 flex items-center justify-center text-muted-foreground text-[10px]">
                                END
                            </div>
                            <div className="flex-1">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-7 w-full justify-start px-2 font-normal text-sm hover:bg-transparent">
                                            {endDate ? format(parseISO(endDate), 'MMM d, yyyy') : "End Date"}
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
                        </div>
                    )}

                    {/* SubProject (Items only) */}
                    {isItem && (
                        <div className="flex items-center gap-2 group hover:bg-muted/30 rounded-md p-1.5 transition-colors">
                            <div className="w-8 flex items-center justify-center text-muted-foreground text-[10px] font-mono">
                                SP
                            </div>
                            <div className="flex-1">
                                <Select value={subProjectId || "none"} onValueChange={handleSubProjectChange}>
                                    <SelectTrigger className="h-7 w-full border-none shadow-none bg-transparent focus:ring-0 px-2 text-sm">
                                        <SelectValue placeholder="No SubProject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            <span className="text-muted-foreground italic">None</span>
                                        </SelectItem>
                                        {availableSubProjects.map(sp => (
                                            <SelectItem key={sp.id} value={sp.id}>
                                                <span className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sp.color ? (sp.color.startsWith('#') ? sp.color : `hsl(var(--workspace-${sp.color}))`) : 'hsl(var(--primary))' }} />
                                                    {sp.title}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Color Row */}
                    <div className="flex items-center gap-2 p-1.5">
                        <div className="w-8 flex items-center justify-center text-muted-foreground">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color ? `hsl(var(--workspace-${color}))` : 'transparent', border: !color ? '1px solid currentColor' : 'none' }} />
                        </div>
                        <div className="flex-1 overflow-x-auto scrollbar-hide py-1">
                            <div className="flex items-center gap-1.5">
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        className={cn(
                                            "w-5 h-5 rounded-full transition-all border border-border/20",
                                            color === String(c) ? "ring-2 ring-offset-1 ring-primary scale-110" : "hover:scale-105 opacity-70 hover:opacity-100"
                                        )}
                                        style={{ backgroundColor: `hsl(var(--workspace-${c}))` }}
                                        onClick={() => handleColorChange(String(c))}
                                    />
                                ))}
                                <button
                                    className={cn(
                                        "w-5 h-5 rounded-full border border-border flex items-center justify-center text-[10px] opacity-70 hover:opacity-100 hover:bg-secondary",
                                        !color ? "ring-2 ring-offset-1 ring-primary" : ""
                                    )}
                                    onClick={() => handleColorChange(undefined)}
                                    title="None"
                                >
                                    <X className="w-3 h-3 text-muted-foreground" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-2 border-t border-border/40 bg-muted/10 flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={handleDelete}
                    >
                        <Trash2 className="w-3 h-3 mr-1.5" />
                        Delete
                    </Button>
                </div>

            </PopoverContent>
        </Popover >
    );
}
