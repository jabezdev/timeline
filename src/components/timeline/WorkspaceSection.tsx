import { Workspace } from '@/types/timeline';
import { ProjectRow } from './ProjectRow';
import { ChevronDown, ChevronRight, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkspaceSectionProps {
  workspace: Workspace;
  openProjectId: string | null;
  onToggleWorkspace: () => void;
  onToggleProject: (projectId: string) => void;
  startDate: Date;
  visibleDays: number;
  onToggleTaskComplete: (taskId: string) => void;
}

export function WorkspaceSection({ 
  workspace, 
  openProjectId,
  onToggleWorkspace, 
  onToggleProject,
  startDate, 
  visibleDays,
  onToggleTaskComplete 
}: WorkspaceSectionProps) {
  const totalTasks = workspace.projects.reduce((acc, p) => acc + p.tasks.length, 0);
  const completedTasks = workspace.projects.reduce((acc, p) => acc + p.tasks.filter(t => t.completed).length, 0);

  return (
    <div className="border-b border-border">
      {/* Workspace header */}
      <div 
        className="flex items-center gap-3 px-4 py-3 bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
        onClick={onToggleWorkspace}
      >
        {workspace.isCollapsed ? (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
        
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `hsl(var(--workspace-${workspace.color}) / 0.2)` }}
        >
          <Building2 
            className="w-4 h-4" 
            style={{ color: `hsl(var(--workspace-${workspace.color}))` }}
          />
        </div>
        
        <div className="flex-1">
          <h2 className="font-semibold text-foreground">{workspace.name}</h2>
          <p className="text-xs text-muted-foreground">
            {workspace.projects.length} project{workspace.projects.length !== 1 ? 's' : ''} • {completedTasks}/{totalTasks} tasks
          </p>
        </div>
        
        <div 
          className="w-2 h-8 rounded-full"
          style={{ backgroundColor: `hsl(var(--workspace-${workspace.color}))` }}
        />
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
                isOpen={openProjectId === project.id}
                onToggle={() => onToggleProject(project.id)}
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
