import { Workspace, Project, SubProject, TimelineItem } from '@/types/timeline';
import { ChevronDown, ChevronRight, ChevronLeft, Building2 } from 'lucide-react';
import { PreferencesPopover } from '../preferences-popover';
import { WorkspaceManagerPopover } from '../workspace-manager-popover';
import { Button } from '../ui/button';
import { Calendar, ChevronsDown } from 'lucide-react';
import { format } from 'date-fns';
import { SIDEBAR_WIDTH } from './TimelineHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { 
  HEADER_HEIGHT, 
  WORKSPACE_HEADER_HEIGHT, 
  PROJECT_HEADER_HEIGHT,
  calculateProjectExpandedHeight 
} from '@/lib/timelineUtils';

// Re-export for backwards compatibility
export { HEADER_HEIGHT, WORKSPACE_HEADER_HEIGHT, PROJECT_HEADER_HEIGHT, SUBPROJECT_HEADER_HEIGHT } from '@/lib/timelineUtils';

interface SidebarHeaderProps {
  startDate: Date;
  onNavigate: (direction: 'prev' | 'next') => void;
  onTodayClick: () => void;
  onExpandAll: () => void;
}

export function SidebarHeader({ startDate, onNavigate, onTodayClick, onExpandAll }: SidebarHeaderProps) {
  return (
    <div 
      className="shrink-0 flex items-center justify-between px-2 border-r border-b border-border bg-background"
      style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH, height: HEADER_HEIGHT }}
    >
      {/* Left group: Preferences & Workspaces */}
      <div className="flex items-center gap-1">
        <PreferencesPopover />
        <WorkspaceManagerPopover />
      </div>
      
      {/* Right group: Date navigation, Today & Expand */}
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onNavigate('prev')} title="Previous Week">
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="sr-only">Previous Week</span>
        </Button>
        <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap w-[52px] text-center">
          {format(startDate, 'MMM yy')}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onNavigate('next')} title="Next Week">
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="sr-only">Next Week</span>
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button variant="outline" size="icon" className="h-6 w-6" onClick={onTodayClick} title="Go to Today">
          <Calendar className="h-3.5 w-3.5" />
          <span className="sr-only">Go to Today</span>
        </Button>
        <Button variant="outline" size="icon" className="h-6 w-6 ml-1" onClick={onExpandAll} title="Expand All Workspaces">
          <ChevronsDown className="h-3.5 w-3.5" />
          <span className="sr-only">Expand All Workspaces</span>
        </Button>
      </div>
    </div>
  );
}

interface SidebarWorkspaceProps {
  workspace: Workspace;
  openProjectIds: Set<string>;
  onToggleWorkspace: () => void;
  onToggleProject: (projectId: string, workspaceId: string) => void;
}

export function SidebarWorkspace({ 
  workspace, 
  openProjectIds,
  onToggleWorkspace, 
  onToggleProject 
}: SidebarWorkspaceProps) {
  const projectCount = workspace.projects.length;

  return (
    <div className="border-b border-border">
      {/* Workspace header */}
      <div 
        className="flex items-center gap-2 px-2 bg-background cursor-pointer hover:bg-secondary/30 transition-colors"
        style={{ height: WORKSPACE_HEADER_HEIGHT }}
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
        
        <span className="text-sm font-medium text-foreground truncate flex-1">{workspace.name}</span>
        
        <span className="text-[10px] text-muted-foreground shrink-0">
          {projectCount} {projectCount === 1 ? 'proj' : 'projs'}
        </span>
      </div>
      
      {/* Projects */}
      <AnimatePresence initial={false}>
        {!workspace.isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {workspace.projects.map(project => (
              <SidebarProject
                key={project.id}
                project={project}
                isOpen={openProjectIds.has(project.id)}
                onToggle={() => onToggleProject(project.id, workspace.id)}
                workspaceColor={workspace.color}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SidebarProjectProps {
  project: Project;
  isOpen: boolean;
  onToggle: () => void;
  workspaceColor: number;
}

function SidebarProject({ project, isOpen, onToggle, workspaceColor }: SidebarProjectProps) {
  const itemCount = project.items.length;
  const completedCount = project.items.filter(t => t.completed).length;
  
  // Use calculated height directly for synchronized animation with timeline
  const { totalHeight } = useMemo(() => 
    calculateProjectExpandedHeight(project), 
    [project]
  );

  return (
    <div className="border-b border-border/50">
      {/* Project header */}
      <div 
        className="flex items-center gap-1.5 px-2 cursor-pointer hover:bg-secondary/30 transition-colors"
        style={{ height: PROJECT_HEADER_HEIGHT }}
        onClick={onToggle}
      >
        <div className="pl-3 flex items-center gap-1.5 flex-1 min-w-0">
          {isOpen ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
          <span className="text-xs font-medium text-foreground truncate flex-1">
            {project.name}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {completedCount}/{itemCount}
          </span>
        </div>
      </div>

      {/* Expanded content spacer - single blank area matching timeline height */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: totalHeight }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
