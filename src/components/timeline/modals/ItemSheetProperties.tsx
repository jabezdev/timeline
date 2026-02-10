import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import {
    Palette,
    CalendarIcon,
    LayoutGrid,
    Folder,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Project, SubProject } from "@/types/timeline";

interface ItemSheetPropertiesProps {
    projects: Project[];
    availableSubProjects: SubProject[];
    projectId: string;
    subProjectId?: string;
    isItem: boolean;
    isSubProject: boolean;
    date: string;
    startDate: string;
    endDate: string;
    color?: string;
    onProjectChange: (value: string) => void;
    onSubProjectChange: (value: string) => void;
    onDateChange: (date: Date | undefined) => void;
    onStartDateChange: (date: Date | undefined) => void;
    onEndDateChange: (date: Date | undefined) => void;
    onColorChange: (color: string | undefined) => void;
}

const COLORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function ItemSheetProperties({
    projects,
    availableSubProjects,
    projectId,
    subProjectId,
    isItem,
    isSubProject,
    date,
    startDate,
    endDate,
    color,
    onProjectChange,
    onSubProjectChange,
    onDateChange,
    onStartDateChange,
    onEndDateChange,
    onColorChange
}: ItemSheetPropertiesProps) {
    return (
        <div className="p-4 py-2 grid grid-cols-2 gap-x-6 gap-y-2 bg-muted/10 border-b border-border/10 text-sm">
            {/* Project - Full width for SubProjects or if Item (to be consistent with side-by-side SubProject) */}
            <div className={cn("flex flex-col gap-1", isSubProject ? "col-span-2" : "")}>
                <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <LayoutGrid className="w-3 h-3" /> Project
                </label>
                <Select value={projectId} onValueChange={onProjectChange}>
                    <SelectTrigger className="h-7 text-xs border-border/40 bg-background/50">
                        <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                        {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* SubProject (for Items) - Placed next to Project */}
            {isItem && (
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                        <Folder className="w-3 h-3" /> Sub-Project
                    </label>
                    <Select value={subProjectId || "none"} onValueChange={onSubProjectChange}>
                        <SelectTrigger className="h-7 text-xs border-border/40 bg-background/50">
                            <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {availableSubProjects.map(sp => (
                                <SelectItem key={sp.id} value={sp.id}>{sp.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Date / Start Date */}
            {!isSubProject && (
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                        <CalendarIcon className="w-3 h-3" /> Date
                    </label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs justify-start text-left font-normal border-border/40 bg-background/50 w-full">
                                {date ? format(parseISO(date), 'MMM d, yyyy') : "Select date"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={date ? parseISO(date) : undefined}
                                onSelect={onDateChange}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            )}

            {/* SubProject Dates (Side-by-Side) */}
            {isSubProject && (
                <>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                            <CalendarIcon className="w-3 h-3" /> Start Date
                        </label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-xs justify-start text-left font-normal border-border/40 bg-background/50 w-full">
                                    {startDate ? format(parseISO(startDate), 'MMM d, yyyy') : "Select date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={startDate ? parseISO(startDate) : undefined}
                                    onSelect={onStartDateChange}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                            <CalendarIcon className="w-3 h-3" /> End Date
                        </label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-xs justify-start text-left font-normal border-border/40 bg-background/50 w-full">
                                    {endDate ? format(parseISO(endDate), 'MMM d, yyyy') : "Select date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={endDate ? parseISO(endDate) : undefined}
                                    onSelect={onEndDateChange}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </>
            )}

            {/* Color */}
            <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <Palette className="w-3 h-3" /> Color
                </label>
                <div className="flex items-center gap-2">
                    {/* Preview Dot */}
                    <div className="w-7 h-7 rounded-full border border-border flex items-center justify-center shrink-0">
                        <div className="w-3.5 h-3.5 rounded-full" style={{
                            backgroundColor: color ? `hsl(var(--workspace-${color}))` : 'transparent',
                            border: !color ? '1px solid currentColor' : 'none'
                        }} />
                    </div>

                    <div className="flex-1 overflow-x-auto scrollbar-hide py-0.5">
                        <div className="flex items-center gap-1">
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    className={cn(
                                        "w-5 h-5 rounded-md transition-all border border-border/20 hover:scale-110",
                                        color === String(c) ? "ring-2 ring-offset-1 ring-primary" : "opacity-70 hover:opacity-100"
                                    )}
                                    style={{ backgroundColor: `hsl(var(--workspace-${c}))` }}
                                    onClick={() => onColorChange(String(c))}
                                />
                            ))}
                            <button
                                className={cn(
                                    "w-5 h-5 rounded-md border border-border flex items-center justify-center text-[10px] opacity-70 hover:opacity-100 hover:bg-secondary",
                                    !color ? "ring-2 ring-offset-1 ring-primary" : ""
                                )}
                                onClick={() => onColorChange(undefined)}
                                title="None"
                            >
                                <div className="w-2.5 h-2.5 border-b border-l border-muted-foreground rotate-45" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
