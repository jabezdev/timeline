import { Workspace, Project, TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { ProjectRow } from './ProjectRow';
import { motion, AnimatePresence } from 'framer-motion';
import { CELL_WIDTH } from './TimelineHeader';
import { WORKSPACE_HEADER_HEIGHT, EXPAND_ANIMATION } from '@/lib/timelineUtils';

interface WorkspaceSectionProps {
  workspace: Workspace;
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
      <AnimatePresence initial={false}>
        {!workspace.isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: EXPAND_ANIMATION.duration, ease: EXPAND_ANIMATION.ease },
              opacity: { duration: EXPAND_ANIMATION.duration * 0.6, ease: 'easeOut' }
            }}
            className="overflow-hidden"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
