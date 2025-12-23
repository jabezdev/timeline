import { Workspace, Project, TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { ProjectRow } from './ProjectRow';
import { CELL_WIDTH, WORKSPACE_HEADER_HEIGHT } from '@/lib/constants';

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
  return (
    <div className="border-b border-border">
      {/* Workspace header - filler row for timeline side */}
      <div
        className="bg-secondary/10 border-b border-border/50"
        style={{
          height: WORKSPACE_HEADER_HEIGHT,
          width: visibleDays * CELL_WIDTH
        }}
      />

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
