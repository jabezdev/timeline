import { useState } from 'react';
import { Workspace, TimelineItem, Milestone } from '@/types/timeline';
import { ProjectRow } from './ProjectRow';
import { ChevronDown, ChevronRight, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SIDEBAR_WIDTH } from './TimelineHeader';

interface WorkspaceSectionProps {
  workspace: Workspace;
  openProjectIds: Set<string>;
  onToggleWorkspace: () => void;
  onToggleProject: (projectId: string, workspaceId: string) => void;
  startDate: Date;
  visibleDays: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemClick: (item: TimelineItem | Milestone) => void;
}

export function WorkspaceSection({ 
  workspace, 
  openProjectIds,
  onToggleWorkspace, 
  onToggleProject,
  startDate, 
  visibleDays,
  onToggleItemComplete,
  onItemClick
}: WorkspaceSectionProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const projectCount = workspace.projects.length;

  return (
    <div className="border-b border-border">
      {/* Workspace header - spans full width */}
      <div className="flex sticky left-0 z-10">
        <div 
          className="flex items-center gap-2 px-2 py-1.5 bg-background cursor-pointer hover:bg-secondary/30 transition-colors border-r border-border sticky left-0"
          style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
          onClick={onToggleWorkspace}
        >
          {workspace.isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          
          <div 
            className="w-5 h-5 rounded flex items-center justify-center shrink-0"
            style={{ backgroundColor: `hsl(var(--workspace-${workspace.color}) / 0.2)` }}
          >
            <Building2 
              className="w-3 h-3" 
              style={{ color: `hsl(var(--workspace-${workspace.color}))` }}
            />
          </div>
          
          <span className="text-xs font-medium text-foreground truncate flex-1">{workspace.name}</span>
          
          <span className="text-[10px] text-muted-foreground shrink-0">
            {projectCount} {projectCount === 1 ? 'proj' : 'projs'}
          </span>
        </div>
        
        {/* Divider/Filler for the rest of the row */}
        <div className="flex-1 bg-secondary/10 border-b border-border/50 min-w-0" />
      </div>
      
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
                onToggle={() => onToggleProject(project.id, workspace.id)}
                startDate={startDate}
                visibleDays={visibleDays}
                workspaceColor={workspace.color}
                onToggleItemComplete={onToggleItemComplete}
                onItemClick={onItemClick}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
