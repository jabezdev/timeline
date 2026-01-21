import { Workspace, Project, TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { ProjectRow } from './ProjectRow';
import { CELL_WIDTH, WORKSPACE_HEADER_HEIGHT } from '@/lib/constants';
import { useMemo } from 'react';
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

export function WorkspaceSection({
  workspace,
  isCollapsed,
  projects,
  projectsItems,
  projectsMilestones,
  projectsSubProjects,
  openProjectIds,
  startDate,
  visibleDays,
  onToggleItemComplete,
  onItemClick,
  onSubProjectClick
}: WorkspaceSectionProps) {
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
    <div className="border-b border-border">
      {/* Workspace header - Summary Row (Persistent) */}
      <div
        className={`flex border-b border-border/50 items-center ${isCollapsed ? 'bg-secondary/20' : 'bg-secondary/5'}`}
        style={{
          height: WORKSPACE_HEADER_HEIGHT,
          width: visibleDays * CELL_WIDTH
        }}
      >
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const items = summaryItems.get(dateStr) || [];
          const milestones = summaryMilestones.get(dateStr) || [];

          if (items.length === 0 && milestones.length === 0) {
            return <div key={dateStr} style={{ width: CELL_WIDTH }} className="h-full border-r border-border/50 last:border-r-0" />;
          }

          // Combined list for "Same Row" mixing
          // Since we don't have time-of-day, we just list them. 
          // Milestones usually more significant, maybe emphasize or shuffle? 
          // Simple concatenation is fine for "same row" visual.
          // Or we can just map them in a single flex container.

          return (
            <div
              key={dateStr}
              style={{ width: CELL_WIDTH }}
              className="h-full border-r border-border/50 last:border-r-0 flex items-center justify-center content-center flex-wrap gap-0.5 px-0.5"
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
              {/* Render Items */}
              {items.map(i => (
                <div
                  key={i.id}
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${i.completed ? 'opacity-30' : 'opacity-80'}`}
                  style={{
                    backgroundColor: i.completed ? 'currentColor' : `hsl(var(--workspace-${workspace.color}))`,
                    color: `hsl(var(--workspace-${workspace.color}))`
                  }}
                  title={`Task: ${i.title}`}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Projects */}
      {!isCollapsed && (
        <div className="overflow-hidden">
          {projects.map(project => (
            <ProjectRow
              key={project.id}
              project={project}
              items={projectsItems.get(project.id) || []}
              milestones={projectsMilestones.get(project.id) || []}
              subProjects={projectsSubProjects.get(project.id) || []}
              isOpen={openProjectIds.has(project.id)}
              startDate={startDate}
              visibleDays={visibleDays}
              workspaceColor={workspace.color}
              onToggleItemComplete={onToggleItemComplete}
              onItemClick={onItemClick}
              onSubProjectClick={onSubProjectClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
