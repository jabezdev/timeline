import { useState } from 'react';
import { Workspace, TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { ProjectRow } from './ProjectRow';
import { motion, AnimatePresence } from 'framer-motion';
import { CELL_WIDTH } from './TimelineHeader';

interface WorkspaceSectionProps {
  workspace: Workspace;
  openProjectIds: Set<string>;
  startDate: Date;
  visibleDays: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemClick: (item: TimelineItem | Milestone) => void;
  onSubProjectClick: (subProject: SubProject) => void;
}

export function WorkspaceSection({ 
  workspace, 
  openProjectIds,
  startDate, 
  visibleDays,
  onToggleItemComplete,
  onItemClick,
  onSubProjectClick
}: WorkspaceSectionProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  return (
    <div className="border-b border-border">
      {/* Workspace header - filler row for timeline side */}
      <div 
        className="bg-secondary/10 border-b border-border/50"
        style={{ 
          height: '36px',
          width: visibleDays * CELL_WIDTH 
        }}
      />
      
      {/* Projects */}
      <AnimatePresence>
        {!workspace.isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={isAnimating ? "overflow-hidden" : ""}
            onAnimationStart={() => setIsAnimating(true)}
            onAnimationComplete={() => setIsAnimating(false)}
          >
            {workspace.projects.map(project => (
              <ProjectRow
                key={project.id}
                project={project}
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
