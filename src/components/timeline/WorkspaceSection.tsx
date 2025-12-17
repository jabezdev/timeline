import { Workspace } from '@/types/timeline';
import { ProjectRow } from './ProjectRow';
import { ChevronDown, ChevronRight, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkspaceSectionProps {
  workspace: Workspace;
  openProjectIds: Set<string>;
  onToggleWorkspace: () => void;
  onToggleProject: (projectId: string, workspaceId: string) => void;
  startDate: Date;
  visibleDays: number;
  onToggleTaskComplete: (taskId: string) => void;
}

export function WorkspaceSection({ 
  workspace, 
  openProjectIds,
  onToggleWorkspace, 
  onToggleProject,
  startDate, 
  visibleDays,
  onToggleTaskComplete 
}: WorkspaceSectionProps) {
  const totalTasks = workspace.projects.reduce((acc, p) => acc + p.tasks.length, 0);
  const completedTasks = workspace.projects.reduce((acc, p) => acc + p.tasks.filter(t => t.completed).length, 0);
  const completionPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="border-b border-border">
      {/* Workspace header */}
      <div 
        className="flex items-center gap-2 px-2 py-1.5 bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
        onClick={onToggleWorkspace}
      >
        {workspace.isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
        
        {/* Stats on left */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground min-w-[80px]">
          <span>{workspace.projects.length}p</span>
          <div className="flex items-center gap-1">
            <div className="w-12 h-1 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-task rounded-full transition-all" 
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span>{completedTasks}/{totalTasks}</span>
          </div>
        </div>
        
        <div 
          className="w-5 h-5 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: `hsl(var(--workspace-${workspace.color}) / 0.2)` }}
        >
          <Building2 
            className="w-3 h-3" 
            style={{ color: `hsl(var(--workspace-${workspace.color}))` }}
          />
        </div>
        
        <span className="text-xs font-medium text-foreground truncate">{workspace.name}</span>
      </div>
      
      {/* Projects */}
      <AnimatePresence>
        {!workspace.isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
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
                onToggleTaskComplete={onToggleTaskComplete}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
