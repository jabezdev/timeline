import { useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTimelineMutations } from "@/hooks/useTimelineMutations";
import { TimelineItem, Milestone, SubProject } from "@/types/timeline";

import { Calendar as CalendarIcon, X } from "lucide-react";
import { format, parseISO, addDays, addWeeks, addMonths } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn, generateId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";


const COLORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface QuickCreatePopoverProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: 'item' | 'milestone';
    projectId: string;
    subProjectId?: string;
    availableSubProjects?: SubProject[];
    date: string; // YYYY-MM-DD
    children?: React.ReactNode;
    defaultColor?: number;
    anchorRect?: DOMRect | { x: number; y: number; width: number; height: number; top: number; left: number; right: number; bottom: number; toJSON: () => any };
}

export function QuickCreatePopover({
    open,
    onOpenChange,
    type,
    projectId,
    subProjectId: initialSubProjectId,
    availableSubProjects = [],
    date: initialDate,
    children,
    defaultColor = 3,
    anchorRect
}: QuickCreatePopoverProps) {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(initialDate);
    const [color, setColor] = useState<number>(defaultColor);
    const [subProjectId, setSubProjectId] = useState<string | undefined>(initialSubProjectId);

    // Recurring State
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceInterval, setRecurrenceInterval] = useState<'day' | 'week' | 'month'>('week');
    const [recurrenceCount, setRecurrenceCount] = useState(1);

    const mutations = useTimelineMutations();

    // Reset state when opening
    useEffect(() => {
        if (open) {
            setTitle('');
            setDate(initialDate);
            setColor(defaultColor);
            setSubProjectId(initialSubProjectId);
            setIsRecurring(false);
            setRecurrenceCount(1);
        }
    }, [open, initialDate, defaultColor, initialSubProjectId]);

    const handleSave = () => {
        if (!title.trim()) {
            onOpenChange(false);
            return;
        }

        const count = isRecurring ? Math.max(1, recurrenceCount) : 1;
        const baseDate = parseISO(date);

        for (let i = 0; i < count; i++) {
            let currentDate = baseDate;
            if (i > 0) {
                switch (recurrenceInterval) {
                    case 'day': currentDate = addDays(baseDate, i); break;
                    case 'week': currentDate = addWeeks(baseDate, i); break;
                    case 'month': currentDate = addMonths(baseDate, i); break;
                }
            }
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            const id = generateId();

            if (type === 'item') {
                const newItem: TimelineItem = {
                    id,
                    title,
                    date: dateStr,
                    projectId,
                    subProjectId,
                    color: color?.toString(), // Ensure string if type expects string
                    completed: false,
                    content: ''
                };
                mutations.addItem.mutate(newItem);
            } else {
                const newMilestone: Milestone = {
                    id,
                    title,
                    date: dateStr,
                    projectId,
                    color: color?.toString(),
                };
                mutations.addMilestone.mutate(newMilestone);
            }
        }

        onOpenChange(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent standard form submission if any
            handleSave();
        }
    };

    // Auto-save on unmount/close is tricky because "click outside" triggers close.
    // We want "click outside" -> Save if content exists.
    // However, Popover's `onOpenChange(false)` happens on click outside.
    // We can hook into that.

    const onOpenChangeWrapper = (isOpen: boolean) => {
        if (!isOpen && title.trim()) {
            // trying to close? Save first.
            handleSave();
        } else {
            onOpenChange(isOpen);
        }
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
        <Popover open={open} onOpenChange={onOpenChangeWrapper}>
            {anchorRect ? (
                <PopoverAnchor virtualRef={virtualAnchor} />
            ) : (
                <PopoverTrigger asChild>
                    {children}
                </PopoverTrigger>
            )}
            <PopoverContent
                className="w-[340px] p-0 overflow-hidden shadow-2xl border border-border/40 bg-background/80 backdrop-blur-xl"
                align="center"
                side="bottom"
                onOpenAutoFocus={(e) => e.preventDefault()} // We'll manage focus
            >
                {/* Header / Title Input */}
                <div className="p-4 border-b border-border/10 bg-muted/20">
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="h-9 text-base font-semibold border-none bg-transparent shadow-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/50"
                        placeholder={type === 'item' ? "Task Name" : "Milestone Name"}
                        autoFocus
                    />
                </div>

                <div className="p-2 space-y-1">

                    {/* Date Row */}
                    <div className="flex items-center gap-2 group hover:bg-muted/30 rounded-md p-1.5 transition-colors">
                        <div className="w-8 flex items-center justify-center text-muted-foreground">
                            <CalendarIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-full justify-start px-2 font-normal text-sm hover:bg-transparent">
                                        {date ? format(parseISO(date), 'MMM d, yyyy') : "Select Date"}
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
                    </div>

                    {/* SubProject Row (Items only) */}
                    {type === 'item' && (
                        <div className="flex items-center gap-2 group hover:bg-muted/30 rounded-md p-1.5 transition-colors">
                            <div className="w-8 flex items-center justify-center text-muted-foreground text-[10px] font-mono">
                                SP
                            </div>
                            <div className="flex-1">
                                <Select value={subProjectId || "none"} onValueChange={(v) => setSubProjectId(v === "none" ? undefined : v)}>
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
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(var(--workspace-${color}))` }} />
                        </div>
                        <div className="flex-1 overflow-x-auto scrollbar-hide py-1">
                            <div className="flex items-center gap-1.5">
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        className={cn(
                                            "w-5 h-5 rounded-full transition-all border border-border/20",
                                            color === c ? "ring-2 ring-offset-1 ring-primary scale-110" : "hover:scale-105 opacity-70 hover:opacity-100"
                                        )}
                                        style={{ backgroundColor: `hsl(var(--workspace-${c}))` }}
                                        onClick={() => setColor(c)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-border/40 my-1" />

                    {/* Recurring Toggle */}
                    <div className="px-2 py-1">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="recurring"
                                checked={isRecurring}
                                onCheckedChange={(c) => setIsRecurring(!!c)}
                                className="w-4 h-4 border-muted-foreground/50"
                            />
                            <label
                                htmlFor="recurring"
                                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                            >
                                Repeat this task
                            </label>
                        </div>

                        {isRecurring && (
                            <div className="flex gap-2 mt-3 pl-6 animate-in slide-in-from-top-2 fade-in duration-200">
                                <Select value={recurrenceInterval} onValueChange={(v: any) => setRecurrenceInterval(v)}>
                                    <SelectTrigger className="h-7 text-xs flex-1 border-muted bg-muted/20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="day">Daily</SelectItem>
                                        <SelectItem value="week">Weekly</SelectItem>
                                        <SelectItem value="month">Monthly</SelectItem>
                                    </SelectContent>
                                </Select>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">x</span>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={recurrenceCount}
                                        onChange={(e) => setRecurrenceCount(parseInt(e.target.value) || 1)}
                                        className="h-7 w-14 text-xs border-muted bg-muted/20 text-center"
                                        placeholder="#"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-2 border-t border-border/40 bg-muted/10 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button size="sm" className="h-7 text-xs px-4" onClick={handleSave}>
                        Create
                    </Button>
                </div>

            </PopoverContent>
        </Popover >
    );
}
