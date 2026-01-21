import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, Plus, FolderKanban, Milestone as MilestoneIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Project, SubProject } from '@/types/timeline';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface CreateItemPopoverProps {
    onAddItem: (title: string, date: string, projectId: string, subProjectId?: string, color?: number) => void;
    onAddMilestone: (projectId: string, title: string, date: string, color?: number) => void;
    onAddSubProject: (projectId: string, title: string, startDate: string, endDate: string, color?: number) => void;
    projects: (Project & { workspaceName?: string })[];
    subProjects: { id: string; title: string; projectId: string }[];
    activeProjectId?: string;
    trigger?: React.ReactNode;
}

export function CreateItemPopover({
    onAddItem,
    onAddMilestone,
    onAddSubProject,
    projects,
    subProjects,
    activeProjectId,
    trigger
}: CreateItemPopoverProps) {
    const [open, setOpen] = useState(false);
    const [type, setType] = useState<'item' | 'milestone' | 'subProject'>('item');
    const [title, setTitle] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [selectedProjectId, setSelectedProjectId] = useState<string>(activeProjectId || projects[0]?.id || '');
    const [selectedSubProjectId, setSelectedSubProjectId] = useState<string>('none');
    const [color, setColor] = useState<number>(1); // Default color

    // Reset when opening
    useEffect(() => {
        if (open) {
            if (activeProjectId) setSelectedProjectId(activeProjectId);
            setDate(new Date());
            setEndDate(undefined);
            setTitle('');
        }
    }, [open, activeProjectId]);

    const handleSubmit = () => {
        if (!title.trim() || !date) return;
        if (!selectedProjectId) return;

        const dateStr = format(date, 'yyyy-MM-dd');

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
            if (!endDate) return; // End date required for subproject
            onAddSubProject(
                selectedProjectId,
                title,
                dateStr,
                format(endDate, 'yyyy-MM-dd'),
                color
            );
        }
        setOpen(false);
    };

    const filteredSubProjects = subProjects.filter(sp => sp.projectId === selectedProjectId);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {trigger || (
                    <Button
                        className="fixed bottom-4 right-4 w-12 h-12 rounded-full shadow-lg z-50 p-0"
                    >
                        <Plus className="w-6 h-6" />
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end" side="top">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Create New</h4>
                        <p className="text-sm text-muted-foreground">Add a task, milestone, or sub-project.</p>
                    </div>

                    <ToggleGroup type="single" value={type} onValueChange={(v) => v && setType(v as any)} className="justify-start w-full border rounded-md p-1">
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

                    <Button className="w-full h-8 text-xs" onClick={handleSubmit} disabled={!title || !date || (type === 'subProject' && !endDate)}>
                        Create
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
