import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTimelineMutations } from '@/hooks/useTimelineMutations';
import { useTimelineData } from '@/hooks/useTimelineData';
import { useTimelineSelectors } from '@/hooks/useTimelineSelectors';
import { format, addDays, addWeeks, addMonths, parseISO } from 'date-fns';
import { generateId, cn } from '@/lib/utils';
import { ChevronLeft, Save, Trash2, Calendar as CalendarIcon, Hash } from 'lucide-react';
import { TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { Checkbox } from "@/components/ui/checkbox";

interface MobileDetailViewProps {
    open: boolean;
    onClose: () => void;
    editingItem: TimelineItem | Milestone | SubProject | null;
}

const COLORS = [
    'blue', 'green', 'red', 'yellow', 'purple', 'pink', 'gray', 'orange', 'teal', 'indigo'
];

export function MobileDetailView({ open, onClose, editingItem }: MobileDetailViewProps) {
    if (!open) return null;

    const mutations = useTimelineMutations();
    const { data: timelineState } = useTimelineData(new Date(), 3);
    const { allProjects, allSubProjects } = useTimelineSelectors(timelineState, new Set<string>());

    const [type, setType] = useState<'item' | 'milestone' | 'subProject'>('item');
    const [title, setTitle] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [selectedSubProjectId, setSelectedSubProjectId] = useState<string>('none');
    const [content, setContent] = useState('');
    const [color, setColor] = useState('blue');

    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceInterval, setRecurrenceInterval] = useState<'day' | 'week' | 'month'>('week');
    const [recurrenceCount, setRecurrenceCount] = useState(1);

    const isEditing = !!editingItem;

    useEffect(() => {
        if (open) {
            if (editingItem) {
                if ('startDate' in editingItem) {
                    setType('subProject');
                    setTitle((editingItem as SubProject).title);
                    setDate(parseISO((editingItem as SubProject).startDate));
                    setEndDate(parseISO((editingItem as SubProject).endDate));
                    setSelectedProjectId((editingItem as SubProject).projectId);
                    setColor((editingItem as SubProject).color || 'blue');
                } else if ('completed' in editingItem) {
                    setType('item');
                    setTitle((editingItem as TimelineItem).title);
                    setDate(parseISO((editingItem as TimelineItem).date));
                    setSelectedProjectId((editingItem as TimelineItem).projectId);
                    setSelectedSubProjectId((editingItem as TimelineItem).subProjectId || 'none');
                    setContent((editingItem as TimelineItem).content || '');
                } else {
                    setType('milestone');
                    setTitle((editingItem as Milestone).title);
                    setDate(parseISO((editingItem as Milestone).date));
                    setSelectedProjectId((editingItem as Milestone).projectId);
                    setColor((editingItem as Milestone).color || 'yellow');
                }
                setIsRecurring(false);
            } else {
                setDate(new Date());
                setTitle('');
                setContent('');
                setEndDate(undefined);
                setIsRecurring(false);
                setColor('blue');
                if (allProjects.length > 0 && !selectedProjectId) {
                    setSelectedProjectId(allProjects[0].id);
                }
            }
        }
    }, [open, editingItem, allProjects]);

    const handleSubmit = () => {
        if (!title.trim() || !date) return;
        if (!selectedProjectId) return;
        if (type === 'subProject' && !endDate) return;

        const dateStr = format(date, 'yyyy-MM-dd');

        if (isEditing && editingItem) {
            if (type === 'item') {
                mutations.updateItem.mutate({
                    id: editingItem.id,
                    updates: {
                        title,
                        date: dateStr,
                        projectId: selectedProjectId,
                        subProjectId: selectedSubProjectId === 'none' ? undefined : selectedSubProjectId,
                        content,
                    }
                });
            } else if (type === 'milestone') {
                mutations.updateMilestone.mutate({
                    id: editingItem.id,
                    updates: {
                        title,
                        date: dateStr,
                        projectId: selectedProjectId,
                        color,
                    }
                });
            } else if (type === 'subProject') {
                mutations.updateSubProject.mutate({
                    id: editingItem.id,
                    updates: {
                        title,
                        startDate: dateStr,
                        endDate: format(endDate!, 'yyyy-MM-dd'),
                        projectId: selectedProjectId,
                        color,
                    }
                });
            }
        } else {
            const count = isRecurring ? Math.max(1, recurrenceCount) : 1;
            for (let i = 0; i < count; i++) {
                let currentDate = date;
                let currentEndDate = endDate;
                if (i > 0) {
                    switch (recurrenceInterval) {
                        case 'day': currentDate = addDays(date, i); if (currentEndDate) currentEndDate = addDays(endDate!, i); break;
                        case 'week': currentDate = addWeeks(date, i); if (currentEndDate) currentEndDate = addWeeks(endDate!, i); break;
                        case 'month': currentDate = addMonths(date, i); if (currentEndDate) currentEndDate = addMonths(endDate!, i); break;
                    }
                }
                const curDateStr = format(currentDate, 'yyyy-MM-dd');
                const newId = generateId();

                if (type === 'item') {
                    mutations.addItem.mutate({
                        id: newId,
                        title,
                        date: curDateStr,
                        projectId: selectedProjectId,
                        subProjectId: selectedSubProjectId === 'none' ? undefined : selectedSubProjectId,
                        completed: false,
                        content
                    });
                } else if (type === 'milestone') {
                    mutations.addMilestone.mutate({
                        id: newId,
                        title,
                        date: curDateStr,
                        projectId: selectedProjectId,
                        color
                    });
                } else if (type === 'subProject') {
                    mutations.addSubProject.mutate({
                        id: newId,
                        title,
                        startDate: curDateStr,
                        endDate: format(currentEndDate!, 'yyyy-MM-dd'),
                        projectId: selectedProjectId,
                        color,
                    });
                }
            }
        }
        onClose();
    };

    const handleDelete = () => {
        if (!editingItem) return;
        const confirm = window.confirm("Delete this item?");
        if (!confirm) return;

        if (type === 'item') mutations.deleteItem.mutate(editingItem.id);
        else if (type === 'milestone') mutations.deleteMilestone.mutate(editingItem.id);
        else if (type === 'subProject') mutations.deleteSubProject.mutate({ id: editingItem.id, deleteItems: false });
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border bg-background safe-area-top">
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <ChevronLeft className="w-6 h-6" />
                </Button>
                <h2 className="font-semibold text-lg">{isEditing ? 'Details' : 'Create New'}</h2>
                <Button variant="ghost" size="icon" onClick={handleSubmit} className="text-primary">
                    <Save className="w-6 h-6" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24 safe-area-bottom">

                {!isEditing && (
                    <ToggleGroup type="single" value={type} onValueChange={(v) => v && setType(v as any)} className="w-full justify-start border rounded-md p-1">
                        <ToggleGroupItem value="item" className="flex-1">Task</ToggleGroupItem>
                        <ToggleGroupItem value="milestone" className="flex-1">Milestone</ToggleGroupItem>
                        <ToggleGroupItem value="subProject" className="flex-1">Period</ToggleGroupItem>
                    </ToggleGroup>
                )}

                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase">Title</label>
                    <Input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="text-xl font-bold border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                        placeholder="Item Title"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> Date</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal bg-secondary/10 border-0 h-10">
                                    {date ? format(date, "MMM d, yyyy") : "Pick date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {type === 'subProject' && (
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> End Date</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-secondary/10 border-0 h-10">
                                        {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}

                    <div className="space-y-1 col-span-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1"><Hash className="w-3 h-3" /> Project</label>
                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                            <SelectTrigger className="w-full bg-secondary/10 border-0 h-10">
                                <SelectValue placeholder="Select Project" />
                            </SelectTrigger>
                            <SelectContent>
                                {allProjects.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.workspaceName ? `${p.workspaceName} / ${p.name}` : p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {type === 'item' && (
                        <div className="space-y-1 col-span-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Sub-Project</label>
                            <Select value={selectedSubProjectId} onValueChange={setSelectedSubProjectId}>
                                <SelectTrigger className="w-full bg-secondary/10 border-0 h-10">
                                    <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {allSubProjects.filter(sp => sp.projectId === selectedProjectId).map(sp => (
                                        <SelectItem key={sp.id} value={sp.id}>{sp.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                {(type === 'milestone' || type === 'subProject') && (
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase">Color</label>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={cn(
                                        "w-8 h-8 rounded-full border-2 transition-all",
                                        color === c ? "border-foreground scale-110" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: `var(--workspace-${c}, ${c})` }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {type === 'item' && (
                    <div className="space-y-1 h-64 flex flex-col">
                        <label className="text-xs font-medium text-muted-foreground uppercase">Description (Markdown)</label>
                        <Textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            className="flex-1 resize-none bg-secondary/5 border-0 p-3 font-mono text-sm leading-relaxed"
                            placeholder="Add details, notes, or markdown content..."
                        />
                    </div>
                )}

                {!isEditing && (
                    <div className="space-y-4 pt-4 border-t border-border">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="rec" checked={isRecurring} onCheckedChange={c => setIsRecurring(!!c)} />
                            <label htmlFor="rec" className="text-sm font-medium">Recurring</label>
                        </div>
                        {isRecurring && (
                            <div className="flex gap-2">
                                <Select value={recurrenceInterval} onValueChange={(v: any) => setRecurrenceInterval(v)}>
                                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="day">Daily</SelectItem>
                                        <SelectItem value="week">Weekly</SelectItem>
                                        <SelectItem value="month">Monthly</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input type="number" value={recurrenceCount} onChange={e => setRecurrenceCount(+e.target.value)} className="w-20" />
                            </div>
                        )}
                    </div>
                )}

                {isEditing && (
                    <div className="pt-8 pb-8">
                        <Button variant="destructive" className="w-full" onClick={handleDelete}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Item
                        </Button>
                    </div>
                )}

            </div>
        </div>
    );
}
