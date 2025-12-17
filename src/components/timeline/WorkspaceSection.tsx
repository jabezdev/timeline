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
  const projectCount = workspace.projects.length;

  return (
    <div className="border-b border-border">
      {/* Workspace header - spans full width */}
      <div 
        className="flex items-center gap-2 px-2 py-1.5 bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors sticky left-0 z-10"
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
        
        <span className="text-xs font-medium text-foreground">{workspace.name}</span>
        
        {/* Stats on rightmost side */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground ml-auto">
          <span>{projectCount} {projectCount === 1 ? 'project' : 'projects'}</span>
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-task rounded-full transition-all" 
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span>{completedTasks}/{totalTasks} tasks</span>
          </div>
        </div>
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
