import { Workspace, Project, TimelineItem, Milestone } from '@/types/timeline';
import { CELL_WIDTH, WORKSPACE_HEADER_HEIGHT } from '@/lib/constants';
import { useMemo, memo } from 'react';
import { addDays, format } from 'date-fns';

interface WorkspaceHeaderRowProps {
  workspace: Workspace;
  projects: Project[];
  projectsItems: Map<string, TimelineItem[]>;
  projectsMilestones: Map<string, Milestone[]>;
  startDate: Date;
  visibleDays: number;
  colorMode?: 'full' | 'monochromatic';
  systemAccent?: string;
}

export const WorkspaceHeaderRow = memo(function WorkspaceHeaderRow({
  workspace,
  projects,
  projectsItems,
  projectsMilestones,
  startDate,
  visibleDays,
  colorMode,
  systemAccent
}: WorkspaceHeaderRowProps) {
  const days = useMemo(() => Array.from({ length: visibleDays }, (_, i) => addDays(startDate, i)), [startDate, visibleDays]);

  const { summaryItems, summaryMilestones } = useMemo(() => {
    const summaryItems = new Map<string, TimelineItem[]>();
    const summaryMilestones = new Map<string, Milestone[]>();

    for (const p of projects) {
      const items = projectsItems.get(p.id);
      if (items) {
        for (const i of items) {
          if (!summaryItems.has(i.date)) summaryItems.set(i.date, []);
          summaryItems.get(i.date)!.push(i);
        }
      }
      const milestones = projectsMilestones.get(p.id);
      if (milestones) {
        for (const m of milestones) {
          if (!summaryMilestones.has(m.date)) summaryMilestones.set(m.date, []);
          summaryMilestones.get(m.date)!.push(m);
        }
      }
    }

    return { summaryItems, summaryMilestones };
  }, [projects, projectsItems, projectsMilestones]);

  return (
    <div
      className="flex items-center"
      style={{
        height: WORKSPACE_HEADER_HEIGHT,
        width: visibleDays * CELL_WIDTH
      }}
    >
      {days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const items = summaryItems.get(dateStr)?.filter(i => !i.completed);
        const milestones = summaryMilestones.get(dateStr);

        if (!items?.length && !milestones?.length) {
          return <div key={dateStr} style={{ width: CELL_WIDTH }} className="h-full border-r border-border/50 last:border-r-0" />;
        }

        return (
          <div
            key={dateStr}
            style={{ width: CELL_WIDTH }}
            className="h-full border-r border-border/50 last:border-r-0 flex items-center justify-center p-0.5"
          >
            <div className="flex items-center justify-center content-center flex-wrap gap-0.5 px-1.5 py-1 rounded-full bg-card border border-border shadow-sm z-10">
              {milestones?.map(m => (
                <div
                  key={m.id}
                  className="w-2.5 h-2.5 rounded-full border-[2.5px] border-current box-border bg-transparent shrink-0"
                  style={{
                    color: colorMode === 'monochromatic'
                      ? 'hsl(var(--primary))'
                      : (m.color
                        ? (m.color.startsWith('#') ? m.color : `hsl(var(--workspace-${m.color}))`)
                        : `hsl(var(--workspace-${workspace.color}))`)
                  }}
                  title={`Milestone: ${m.title}`}
                />
              ))}
              {items?.map(i => {
                const itemColor = colorMode === 'monochromatic'
                  ? 'hsl(var(--primary))'
                  : (i.color
                    ? (i.color.startsWith('#') ? i.color : `hsl(var(--workspace-${i.color}))`)
                    : `hsl(var(--workspace-${workspace.color}))`);
                return (
                  <div
                    key={i.id}
                    className={`w-2 h-2 rounded-full shrink-0 ${i.completed ? 'opacity-40' : 'opacity-100'}`}
                    style={{ backgroundColor: itemColor }}
                    title={`Task: ${i.title}`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});
