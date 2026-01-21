import { useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTimelineMutations } from "@/hooks/useTimelineMutations";
import { TimelineItem, Milestone } from "@/types/timeline";

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
    date: string; // YYYY-MM-DD
    children: React.ReactNode;
    defaultColor?: number;
}

export function QuickCreatePopover({
    open,
    onOpenChange,
    type,
    projectId,
    subProjectId,
    date: initialDate,
    children,
    defaultColor = 3
}: QuickCreatePopoverProps) {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(initialDate);
    const [color, setColor] = useState<number>(defaultColor);

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
        }
    }, [open, initialDate, defaultColor]);

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

    return (
        <Popover open={open} onOpenChange={onOpenChangeWrapper}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent
                className="w-72 p-3"
                align="start"
                side="bottom"
                onOpenAutoFocus={(e) => e.preventDefault()} // We'll manage focus
            >
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label className="text-xs">Title</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="h-8 text-xs"
                            placeholder={type === 'item' ? "Task Name" : "Milestone Name"}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs">Date</Label>
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
                                    onSelect={(d) => d && setDate(format(d, 'yyyy-MM-dd'))}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs">Color</Label>
                        <div className="grid grid-cols-6 gap-2 justify-items-center">
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    className={cn(
                                        "w-6 h-6 rounded-full transition-all border border-border/20",
                                        color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                                    )}
                                    style={{ backgroundColor: `hsl(var(--workspace-${c}))` }}
                                    onClick={() => setColor(c)}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="pt-2 border-t border-border space-y-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="recurring"
                                checked={isRecurring}
                                onCheckedChange={(c) => setIsRecurring(!!c)}
                                className="w-4 h-4"
                            />
                            <label
                                htmlFor="recurring"
                                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Recurring
                            </label>
                        </div>

                        {isRecurring && (
                            <div className="flex gap-2">
                                <Select value={recurrenceInterval} onValueChange={(v: any) => setRecurrenceInterval(v)}>
                                    <SelectTrigger className="h-8 text-xs flex-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="day">Daily</SelectItem>
                                        <SelectItem value="week">Weekly</SelectItem>
                                        <SelectItem value="month">Monthly</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={recurrenceCount}
                                    onChange={(e) => setRecurrenceCount(parseInt(e.target.value) || 1)}
                                    className="h-8 w-16 text-xs"
                                    placeholder="Count"
                                />
                            </div>
                        )}
                    </div>
                    {/* No buttons, just like QuickEdit */}
                </div>
            </PopoverContent>
        </Popover>
    );
}
