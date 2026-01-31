import { Workspace, Project, TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { ProjectRow } from './ProjectRow';
import { WORKSPACE_HEADER_HEIGHT, EMPTY_ITEMS_ARRAY, EMPTY_MILESTONES_ARRAY } from '@/lib/constants';
import { useMemo, memo } from 'react';
import { addDays, format } from 'date-fns';

interface WorkspaceSectionProps {
  workspace: Workspace;
  isCollapsed: boolean; // New prop
  projects: Project[];
  projectsItems: Map<string, TimelineItem[]>;
  projectsMilestones: Map<string, Milestone[]>;
  projectsSubProjects: Map<string, SubProject[]>;
  openProjectIds: Set<string>;
  startDate: Date;
  visibleDays: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemClick: (item: TimelineItem | Milestone) => void;
  onSubProjectClick: (subProject: SubProject) => void;
}

// This component renders ONLY the header (summary row) for the workspace.
// The projects are now rendered by the parent flat list.

export const WorkspaceHeaderRow = memo(function WorkspaceHeaderRow({
  workspace,
  isCollapsed,
  projects,
  projectsItems,
  projectsMilestones,
  startDate,
  visibleDays,
}: Omit<WorkspaceSectionProps, 'onToggleItemComplete' | 'onItemClick' | 'onSubProjectClick' | 'openProjectIds' | 'projectsSubProjects'>) {
  const days = Array.from({ length: visibleDays }, (_, i) => addDays(startDate, i));

  // Aggregate items and milestones by date for the collapsed view
  const { summaryItems, summaryMilestones } = useMemo(() => {
    const summaryItems = new Map<string, TimelineItem[]>();
    const summaryMilestones = new Map<string, Milestone[]>();

    // Always calculate summary for persistent header view
    projects.forEach(p => {
      const items = projectsItems.get(p.id) || [];
      const milestones = projectsMilestones.get(p.id) || [];

      items.forEach(i => {
        if (!summaryItems.has(i.date)) summaryItems.set(i.date, []);
        summaryItems.get(i.date)!.push(i);
      });

      milestones.forEach(m => {
        if (!summaryMilestones.has(m.date)) summaryMilestones.set(m.date, []);
        summaryMilestones.get(m.date)!.push(m);
      });
    });

    return { summaryItems, summaryMilestones };
  }, [projects, projectsItems, projectsMilestones]);

  return (
    <div className="border-b-2 border-border">
      {/* Workspace header - Summary Row (Persistent) - using flex for equal columns */}
      <div
        className={`flex w-full items-center ${isCollapsed ? 'bg-secondary/20' : 'bg-secondary/5'}`}
        style={{ height: WORKSPACE_HEADER_HEIGHT }}
      >
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const items = summaryItems.get(dateStr) ?? EMPTY_ITEMS_ARRAY;
          const milestones = summaryMilestones.get(dateStr) ?? EMPTY_MILESTONES_ARRAY;

          if (items.length === 0 && milestones.length === 0) {
            return <div key={dateStr} className="flex-1 min-w-0 h-full border-r border-border/50 last:border-r-0 overflow-hidden" />;
          }

          return (
            <div
              key={dateStr}
              className="flex-1 min-w-0 h-full border-r border-border/50 last:border-r-0 flex items-center justify-center overflow-hidden"
            >
              <div
                className="flex items-center justify-center gap-x-1 max-w-full max-h-full overflow-hidden"
                style={{ width: '100%', height: '100%' }}
              >
                {/* Render Milestones */}
                {milestones.map(m => (
                  <div
                    key={m.id}
                    className="w-2 h-2 rounded-full border-[2px] border-current box-border bg-transparent shrink-0"
                    style={{
                      color: m.color
                        ? (m.color.startsWith('#') ? m.color : `hsl(var(--workspace-${m.color}))`)
                        : `hsl(var(--workspace-${workspace.color}))`
                    }}
                    title={`Milestone: ${m.title}`}
                  />
                ))}
                {/* Render Items - only incomplete tasks */}
                {items.filter(i => !i.completed).map(i => {
                  const itemColor = i.color
                    ? (i.color.startsWith('#') ? i.color : `hsl(var(--workspace-${i.color}))`)
                    : `hsl(var(--workspace-${workspace.color}))`;

                  return (
                    <div
                      key={i.id}
                      className="w-1.5 h-1.5 rounded-full shrink-0 opacity-80"
                      style={{
                        backgroundColor: itemColor
                      }}
                      title={`Task: ${i.title}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
