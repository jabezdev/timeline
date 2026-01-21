import { useTimelineData } from '@/hooks/useTimelineData';
import { useTimelineSelectors } from '@/hooks/useTimelineSelectors';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { useTimelineMutations } from '@/hooks/useTimelineMutations';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { TimelineItem, Milestone, SubProject, Project } from '@/types/timeline';
import { ChevronDown, ChevronRight, Briefcase, Folder, Flag, Check, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileTimelineProps {
    activeDate: Date;
    onItemClick: (item: TimelineItem | Milestone | SubProject) => void;
    expandedWorkspaces: Set<string>;
    expandedProjects: Set<string>;
    onToggleWorkspace: (id: string) => void;
    onToggleProject: (id: string) => void;
}

export function MobileTimeline({
    activeDate,
    onItemClick,
    expandedWorkspaces,
    expandedProjects,
    onToggleWorkspace,
    onToggleProject
}: MobileTimelineProps) {
    const { data: timelineState } = useTimelineData(activeDate, 14);
    const { openProjectIds } = useTimelineStore();
    const { workspaces } = timelineState;
    const mutations = useTimelineMutations();

    const {
        workspaceProjects,
        sortedWorkspaceIds,
        projectsItems,
        projectsMilestones,
        projectsSubProjects,
    } = useTimelineSelectors(timelineState, openProjectIds);

    const days = [
        activeDate,
        addDays(activeDate, 1),
        addDays(activeDate, 2)
    ];

    return (
        <div className="h-full overflow-y-auto pb-20 select-none [&::-webkit-scrollbar]:hidden scrollbar-none">
            {/* Column Headers */}
            <div className="grid grid-cols-3 border-b border-border bg-background border-t text-xs font-medium text-center sticky top-0 z-30 shadow-sm">
                {days.map((day, i) => (
                    <div key={i} className="py-2 border-r border-border/50 last:border-r-0 text-muted-foreground">
                        <span className="block font-bold text-foreground">{format(day, 'EEE')}</span>
                        {format(day, 'd')}
                    </div>
                ))}
            </div>

            <div className="flex flex-col">
                {sortedWorkspaceIds.map(wsId => {
                    const workspace = workspaces[wsId];
                    if (!workspace) return null;
                    const projects = workspaceProjects.get(wsId) || [];
                    const isExpanded = expandedWorkspaces.has(wsId);

                    return (
                        <div key={wsId} className="flex flex-col">
                            {/* Workspace Header */}
                            <div
                                className="flex items-center gap-2 px-3 py-2 bg-background border-b border-border sticky top-[37px] z-20 cursor-pointer hover:bg-secondary/10"
                                onClick={() => onToggleWorkspace(wsId)}
                            >
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                <div className="p-1 rounded bg-secondary/20" style={{ color: `hsl(var(--workspace-${workspace.color}))` }}>
                                    <Briefcase className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-semibold truncate">{workspace.name}</span>
                            </div>

                            {isExpanded && projects.map(project => (
                                <MobileProjectRow
                                    key={project.id}
                                    project={project}
                                    days={days}
                                    items={projectsItems.get(project.id) || []}
                                    milestones={projectsMilestones.get(project.id) || []}
                                    subProjects={projectsSubProjects.get(project.id) || []}
                                    workspaceColor={workspace.color}
                                    isExpanded={expandedProjects.has(project.id)}
                                    onToggle={() => onToggleProject(project.id)}
                                    onItemClick={onItemClick}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function MobileProjectRow({
    project,
    days,
    items,
    milestones,
    subProjects,
    workspaceColor,
    isExpanded,
    onToggle,
    onItemClick,
}: {
    project: Project;
    days: Date[];
    items: TimelineItem[];
    milestones: Milestone[];
    subProjects: SubProject[];
    workspaceColor: string;
    isExpanded: boolean;
    onToggle: () => void;
    onItemClick: (item: TimelineItem | Milestone | SubProject) => void;
}) {
    return (
        <div className="flex flex-col border-b border-border">
            {/* Project Header */}
            <div
                className="flex items-center gap-2 px-6 py-1.5 bg-background/50 cursor-pointer hover:bg-secondary/10"
                onClick={onToggle}
            >
                {isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                <Folder className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground/80">{project.name}</span>
            </div>

            {/* Grid Row */}
            {isExpanded && (
                <div className="flex flex-col min-h-[40px]">

                    {/* 1. Milestones Row */}
                    <div className="grid grid-cols-3 border-b border-border/20">
                        {days.map((day, i) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const dayMilestones = milestones.filter(m => m.date === dateStr);
                            return (
                                <div key={i} className="border-r border-border/50 last:border-r-0 p-1 flex flex-col gap-2 min-h-[24px]">
                                    {dayMilestones.map(m => {
                                        const isHex = m.color?.startsWith('#');
                                        const bgColor = isHex
                                            ? `${m.color}26`
                                            : m.color
                                                ? `hsl(var(--workspace-${m.color}) / 0.15)`
                                                : 'hsl(var(--primary) / 0.1)';
                                        const borderColor = isHex
                                            ? `${m.color}4D`
                                            : m.color
                                                ? `hsl(var(--workspace-${m.color}) / 0.3)`
                                                : 'hsl(var(--border))';
                                        const textColor = isHex
                                            ? m.color
                                            : m.color
                                                ? `hsl(var(--workspace-${m.color}))`
                                                : 'hsl(var(--foreground))';

                                        return (
                                            <div
                                                key={m.id}
                                                onClick={(e) => { e.stopPropagation(); onItemClick(m); }}
                                                className={cn(
                                                    "border rounded-sm px-1 py-0.5 text-[10px] font-medium flex items-center gap-1 shadow-sm select-none hover:brightness-110 active:scale-95 transition-all cursor-pointer whitespace-nowrap overflow-hidden max-w-full z-10",
                                                    "bg-background" // Default, overridden by style
                                                )}
                                                style={{
                                                    backgroundColor: bgColor,
                                                    borderColor: borderColor,
                                                    color: textColor
                                                }}
                                                title={m.title}
                                            >
                                                <Flag className="w-2.5 h-2.5 fill-current shrink-0" />
                                                <span className="truncate">{m.title}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        })}
                    </div>

                    {/* 2. Independent Items (No SubProject) */}
                    <div className="grid grid-cols-3 border-b border-border/20">
                        {days.map((day, i) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const dayItems = items.filter(item => item.date === dateStr && !item.subProjectId);

                            return (
                                <div key={i} className="border-r border-border/50 last:border-r-0 p-1 flex flex-col gap-1">
                                    {dayItems.map(item => {

                                        const isHex = item.color?.startsWith('#');
                                        const style: React.CSSProperties = {
                                            backgroundColor: item.color
                                                ? (isHex ? `${item.color}20` : `hsl(var(--workspace-${item.color}) / 0.2)`)
                                                : undefined,
                                            borderColor: item.color
                                                ? (isHex ? `${item.color}50` : `hsl(var(--workspace-${item.color}) / 0.5)`)
                                                : undefined
                                        };

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
                                                className={cn(
                                                    "group relative flex items-start gap-1.5 px-2 py-1.5 rounded-sm border select-none cursor-pointer hover:shadow-sm transition-all",
                                                    item.completed
                                                        ? "opacity-60 bg-secondary/30 border-border"
                                                        : "bg-secondary/50 border-border hover:border-primary/30"
                                                )}
                                                style={style}
                                            >
                                                <button
                                                    className={cn(
                                                        "w-4 h-4 rounded-sm border flex items-center justify-center transition-all shrink-0",
                                                        item.completed
                                                            ? "bg-primary border-primary"
                                                            : "border-muted-foreground group-hover:border-primary"
                                                    )}
                                                    style={{
                                                        backgroundColor: item.completed && item.color
                                                            ? (isHex ? item.color : `hsl(var(--workspace-${item.color}))`)
                                                            : undefined,
                                                        borderColor: item.color
                                                            ? (isHex ? item.color : `hsl(var(--workspace-${item.color}))`)
                                                            : undefined
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        mutations.updateItem.mutate({
                                                            id: item.id,
                                                            updates: { completed: !item.completed }
                                                        });
                                                    }}
                                                >
                                                    {item.completed && <Check className="w-3 h-3 text-white" />}
                                                </button>

                                                <span className={cn(
                                                    "flex-1 min-w-0 text-xs font-medium break-words whitespace-pre-wrap leading-tight block pt-0.5",
                                                    item.completed ? "line-through text-muted-foreground" : "text-foreground"
                                                )}>
                                                    {item.title}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        })}
                    </div>

                    {/* 3. SubProjects Rows */}
                    {subProjects.map(sp => {
                        const spStart = parseISO(sp.startDate);
                        const spEnd = parseISO(sp.endDate);
                        const isActive = days.some(day =>
                            (day >= spStart && day <= spEnd) || isSameDay(day, spStart) || isSameDay(day, spEnd)
                        );

                        if (!isActive) return null;

                        return (
                            <div key={sp.id} className="grid grid-cols-3 mt-1 relative pb-1">
                                {days.map((day, i) => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const isStart = sp.startDate === dateStr;
                                    const isEnd = sp.endDate === dateStr;
                                    const inRange = (day >= spStart && day <= spEnd) || isSameDay(day, spStart) || isSameDay(day, spEnd);

                                    const spItems = items.filter(item => item.date === dateStr && item.subProjectId === sp.id);

                                    return (
                                        <div key={i} className={cn(
                                            "p-1 relative flex flex-col gap-1 min-h-[30px]",
                                            "border-y border-dashed",
                                            (isStart || (i === 0 && day > spStart)) && "border-l border-dashed rounded-l-sm pl-1.5",
                                            (isEnd || (i === 2 && day < spEnd)) && "border-r border-dashed rounded-r-sm pr-1.5",
                                            // Handle internal borders between days if needed, or rely on spacing
                                            // Since we use separated columns, we might need to rely on the background visual continuity.
                                            // But standard borders will separate them. Let's try to make it look connected or just boxed per day?
                                            // The user wants "dashed border". If we box each day, it looks broken.
                                            // But since layout is 3 columns, achieving a single box across columns is hard without absolute overlay.
                                            // Let's stick to per-cell borders but try to remove internal vertical borders if adjacent.
                                            // Actually, `MobileTimeline` grid has gaps or borders? It has `border-r border-border/50` on the container cells.
                                            // Here we are INSIDE the cell.
                                            // Let's just apply full border to start/end and top/bottom to all.
                                            // It will look like [ --- ] [ --- ] [ --- ]
                                        )}
                                            style={{
                                                backgroundColor: sp.color
                                                    ? (sp.color.startsWith('#') ? `${sp.color}10` : `hsl(var(--workspace-${sp.color}) / 0.1)`)
                                                    : 'hsl(var(--primary) / 0.05)',
                                                borderColor: sp.color
                                                    ? (sp.color.startsWith('#') ? `${sp.color}50` : `hsl(var(--workspace-${sp.color}) / 0.5)`)
                                                    : 'hsl(var(--primary) / 0.2)',
                                            }}
                                        >
                                            {inRange && (isStart || i === 0 && day > spStart) && (
                                                <div className="absolute left-0 right-0 top-0 h-6 flex items-center px-1 gap-1 pointer-events-none z-10"
                                                    onClick={(e) => { e.stopPropagation(); onItemClick(sp); }}
                                                >
                                                    <GripVertical className="w-3 h-3 opacity-50 shrink-0" />
                                                    <span className="text-xs font-semibold truncate text-foreground pointer-events-auto cursor-pointer flex-1">
                                                        {sp.title}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Spacer for header */}
                                            <div className="h-6 w-full shrink-0" />

                                            {spItems.map(item => {
                                                const isHex = item.color?.startsWith('#');
                                                const style: React.CSSProperties = {
                                                    backgroundColor: item.color
                                                        ? (isHex ? `${item.color}20` : `hsl(var(--workspace-${item.color}) / 0.2)`)
                                                        : undefined,
                                                    borderColor: item.color
                                                        ? (isHex ? `${item.color}50` : `hsl(var(--workspace-${item.color}) / 0.5)`)
                                                        : undefined
                                                };

                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
                                                        className={cn(
                                                            "group relative flex items-start gap-1.5 px-2 py-1.5 rounded-sm border select-none cursor-pointer hover:shadow-sm transition-all z-20 mb-1",
                                                            item.completed
                                                                ? "opacity-60 bg-secondary/30 border-border"
                                                                : "bg-secondary/50 border-border hover:border-primary/30"
                                                        )}
                                                        style={style}
                                                    >
                                                        <button
                                                            className={cn(
                                                                "w-4 h-4 rounded-sm border flex items-center justify-center transition-all shrink-0",
                                                                item.completed
                                                                    ? "bg-primary border-primary"
                                                                    : "border-muted-foreground group-hover:border-primary"
                                                            )}
                                                            style={{
                                                                backgroundColor: item.completed && item.color
                                                                    ? (isHex ? item.color : `hsl(var(--workspace-${item.color}))`)
                                                                    : undefined,
                                                                borderColor: item.color
                                                                    ? (isHex ? item.color : `hsl(var(--workspace-${item.color}))`)
                                                                    : undefined
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                mutations.updateItem.mutate({
                                                                    id: item.id,
                                                                    updates: { completed: !item.completed }
                                                                });
                                                            }}
                                                        >
                                                            {item.completed && <Check className="w-3 h-3 text-white" />}
                                                        </button>

                                                        <span className={cn(
                                                            "flex-1 min-w-0 text-xs font-medium break-words whitespace-pre-wrap leading-tight block pt-0.5",
                                                            item.completed ? "line-through text-muted-foreground" : "text-foreground"
                                                        )}>
                                                            {item.title}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
}
