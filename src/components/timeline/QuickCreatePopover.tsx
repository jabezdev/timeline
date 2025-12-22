import { useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTimelineStore } from "@/hooks/useTimelineStore";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

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

    const { addItem, addMilestone } = useTimelineStore();

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

        if (type === 'item') {
            addItem(projectId, title, date, subProjectId, color);
        } else {
            addMilestone(projectId, title, date, color);
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
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="h-8 text-xs"
                        />
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
                    {/* No buttons, just like QuickEdit */}
                </div>
            </PopoverContent>
        </Popover>
    );
}
