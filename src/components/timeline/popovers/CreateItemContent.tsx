import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { Calendar as CalendarIcon, Check, Plus, FolderKanban, Milestone as MilestoneIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Project, SubProject } from '@/types/timeline';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Shared Constants
const COLORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface CreateItemContentProps {
    onAddItem: (title: string, date: string, projectId: string, subProjectId?: string, color?: number) => void;
    onAddMilestone: (projectId: string, title: string, date: string, color?: number) => void;
    onAddSubProject: (projectId: string, title: string, startDate: string, endDate: string, color?: number) => void;
    projects: (Project & { workspaceName?: string })[];
    subProjects: { id: string; title: string; projectId: string }[];
    activeProjectId?: string;
    onClose: () => void;
}

export function CreateItemContent({
    onAddItem,
    onAddMilestone,
    onAddSubProject,
    projects,
    subProjects,
    activeProjectId,
    onClose
}: CreateItemContentProps) {
    const [type, setType] = useState<'item' | 'milestone' | 'subProject'>('item');
    const [title, setTitle] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [selectedProjectId, setSelectedProjectId] = useState<string>(activeProjectId || projects[0]?.id || '');
    const [selectedSubProjectId, setSelectedSubProjectId] = useState<string>('none');
    const [color, setColor] = useState<number>(1); // Default color

    // Recurring State
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceInterval, setRecurrenceInterval] = useState<'day' | 'week' | 'month'>('week');
    const [recurrenceCount, setRecurrenceCount] = useState(1);

    // Initializer
    useEffect(() => {
        if (activeProjectId) setSelectedProjectId(activeProjectId);
        // We don't need to reset everything else here as mounting this component implies a fresh start usually,
        // unless it's kept alive. But normally Popover unmounts content.
        // However, `CreateItemPopover` has explicit `useEffect` on `open`.
        // If we move state here, we rely on mounting/unmounting.
        // `Popover` unmounts content when closed by default? No, `PopoverContent` stays in DOM if `forceMount` is used, 
        // but typically it unmounts.
        // Let's assume it unmounts or we interpret "mount" as "open".
    }, [activeProjectId]);


    const handleSubmit = () => {
        if (!title.trim() || !date) return;
        if (!selectedProjectId) return;
        if (type === 'subProject' && !endDate) return;

        const count = isRecurring ? Math.max(1, recurrenceCount) : 1;

        for (let i = 0; i < count; i++) {
            let currentDate = date;
            let currentEndDate = endDate;

            if (i > 0) {
                switch (recurrenceInterval) {
                    case 'day':
                        currentDate = addDays(date, i);
                        if (currentEndDate) currentEndDate = addDays(endDate!, i);
                        break;
                    case 'week':
                        currentDate = addWeeks(date, i);
                        if (currentEndDate) currentEndDate = addWeeks(endDate!, i);
                        break;
                    case 'month':
                        currentDate = addMonths(date, i);
                        if (currentEndDate) currentEndDate = addMonths(endDate!, i);
                        break;
                }
            }

            const dateStr = format(currentDate, 'yyyy-MM-dd');

            if (type === 'item') {
                onAddItem(
                    title,
                    dateStr,
                    selectedProjectId,
                    selectedSubProjectId === 'none' ? undefined : selectedSubProjectId,
                    color
                );
            } else if (type === 'milestone') {
                onAddMilestone(selectedProjectId, title, dateStr, color);
            } else if (type === 'subProject') {
                onAddSubProject(
                    selectedProjectId,
                    title,
                    dateStr,
                    format(currentEndDate!, 'yyyy-MM-dd'),
                    color
                );
            }
        }
        onClose();
    };

    const filteredSubProjects = subProjects.filter(sp => sp.projectId === selectedProjectId);

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <h4 className="font-medium leading-none">Create New</h4>
                <p className="text-sm text-muted-foreground">Add a task, milestone, or sub-project.</p>
            </div>

            <ToggleGroup type="single" value={type} onValueChange={(v) => v && setType(v as 'item' | 'milestone' | 'subProject')} className="justify-start w-full border rounded-md p-1">
                <ToggleGroupItem value="item" className="flex-1 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Task</ToggleGroupItem>
                <ToggleGroupItem value="milestone" className="flex-1 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Milestone</ToggleGroupItem>
                <ToggleGroupItem value="subProject" className="flex-1 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Period</ToggleGroupItem>
            </ToggleGroup>

            <div className="space-y-2">
                <Input
                    placeholder={type === 'subProject' ? "Period Name" : "Title"}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSubmit();
                    }}
                />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full h-8 justify-start text-left font-normal px-2">
                            <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50" />
                            <span className="text-xs truncate">{date ? format(date, 'MMM d') : "Date"}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                    </PopoverContent>
                </Popover>

                {type === 'subProject' && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full h-8 justify-start text-left font-normal px-2">
                                <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50" />
                                <span className="text-xs truncate">{endDate ? format(endDate, 'MMM d') : "End Date"}</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(d) => date ? d < date : false} initialFocus />
                        </PopoverContent>
                    </Popover>
                )}
            </div>

            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                    {projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                            {p.workspaceName ? `${p.workspaceName} / ${p.name}` : p.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {type === 'item' && filteredSubProjects.length > 0 && (
                <Select value={selectedSubProjectId} onValueChange={setSelectedSubProjectId}>
                    <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue placeholder="No Sub-Project" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">No Sub-Project</SelectItem>
                        {filteredSubProjects.map(sp => (
                            <SelectItem key={sp.id} value={sp.id}>{sp.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {/* Color Picker */}
            <div className="pt-2 border-t border-border space-y-2">
                <div className="flex items-center gap-2 p-1.5 bg-muted/20 rounded-md">
                    <div className="w-8 flex items-center justify-center text-muted-foreground">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(var(--workspace-${color}))` }} />
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
            </div>

            <div className="pt-2 border-t border-border space-y-2">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="create-recurring"
                        checked={isRecurring}
                        onCheckedChange={(c) => setIsRecurring(!!c)}
                        className="w-4 h-4"
                    />
                    <label
                        htmlFor="create-recurring"
                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        Recurring
                    </label>
                </div>

                {isRecurring && (
                    <div className="flex gap-2">
                        <Select value={recurrenceInterval} onValueChange={(v: 'day' | 'week' | 'month') => setRecurrenceInterval(v)}>
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

            <Button className="w-full h-8 text-xs" onClick={handleSubmit} disabled={!title || !date || (type === 'subProject' && !endDate)}>
                Create
            </Button>
        </div>
    );
}
