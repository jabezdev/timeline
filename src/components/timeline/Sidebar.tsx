import { Workspace, Project, SubProject, TimelineItem } from '@/types/timeline';
import { ChevronDown, ChevronRight, ChevronLeft, Building2, Calendar, ChevronsDown, ChevronsUp } from 'lucide-react';
import { PreferencesPopover } from '../preferences-popover';
import { WorkspaceManagerPopover } from '../workspace-manager-popover';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import {
  SIDEBAR_WIDTH,
  HEADER_HEIGHT,
  WORKSPACE_HEADER_HEIGHT,
  PROJECT_HEADER_HEIGHT,
  SUBPROJECT_HEADER_HEIGHT,
  EXPAND_ANIMATION
} from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { useMemo, useRef, useEffect } from 'react';
import { calculateProjectExpandedHeight } from '@/lib/timelineUtils';

// Re-export for backwards compatibility if really needed, but generally better to removing these re-exports if no one uses them from here.
// However, to be safe and match previous intent:
export { HEADER_HEIGHT, WORKSPACE_HEADER_HEIGHT, PROJECT_HEADER_HEIGHT, SUBPROJECT_HEADER_HEIGHT } from '@/lib/constants';

interface SidebarHeaderProps {
  startDate: Date;
  onNavigate: (direction: 'prev' | 'next') => void;
  onTodayClick: () => void;
  onExpandAll: () => void;
  isAllExpanded: boolean;
}

export function SidebarHeader({ startDate, onNavigate, onTodayClick, onExpandAll, isAllExpanded }: SidebarHeaderProps) {
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
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6 ml-1"
          onClick={onExpandAll}
          title={isAllExpanded ? "Collapse All Workspaces" : "Expand All Workspaces"}
        >
          {isAllExpanded ? (
            <ChevronsUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronsDown className="h-3.5 w-3.5" />
          )}
          <span className="sr-only">{isAllExpanded ? "Collapse All Workspaces" : "Expand All Workspaces"}</span>
        </Button>
      </div>
    </div>
  );
}

interface SidebarWorkspaceProps {
  workspace: Workspace;
  projects: Project[]; // Explicitly passed
  projectsItems: Map<string, TimelineItem[]>;
  projectsSubProjects: Map<string, SubProject[]>;
  openProjectIds: string[]; // Normalized to strings array
  onToggleWorkspace: () => void;
  onToggleProject: (projectId: string, workspaceId: string) => void;
}

export function SidebarWorkspace({
  workspace,
  projects,
  projectsItems,
  projectsSubProjects,
  openProjectIds,
  onToggleWorkspace,
  onToggleProject
}: SidebarWorkspaceProps) {
  const projectCount = projects.length;

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
            transition={{
              height: { duration: EXPAND_ANIMATION.duration, ease: EXPAND_ANIMATION.ease },
              opacity: { duration: EXPAND_ANIMATION.duration * 0.6, ease: 'easeOut' }
            }}
          >
            {projects.map(project => (
              <SidebarProject
                key={project.id}
                project={project}
                items={projectsItems.get(project.id) || []}
                subProjects={projectsSubProjects.get(project.id) || []}
                isOpen={openProjectIds.includes(project.id)}
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
  items: TimelineItem[];
  subProjects: SubProject[];
  isOpen: boolean;
  onToggle: () => void;
  workspaceColor: number;
}

function SidebarProject({ project, items, subProjects, isOpen, onToggle, workspaceColor }: SidebarProjectProps) {
  const itemCount = items.length;
  const completedCount = items.filter(t => t.completed).length;

  // Compute the expected height based on project structure
  const computedHeight = useMemo(() => {
    const { totalHeight } = calculateProjectExpandedHeight(project, items, subProjects);
    return totalHeight;
  }, [project, items, subProjects]);

  // Also read measured height from store for dynamic content sync
  const measuredHeight = useTimelineStore((state) => state.projectHeights.get(project.id) || 0);

  // Prefer measured height when available
  const projectHeight = measuredHeight > 0 ? measuredHeight : computedHeight;

  const wasOpenRef = useRef(isOpen);
  const isExpandCollapse = wasOpenRef.current !== isOpen;
  useEffect(() => {
    wasOpenRef.current = isOpen;
  }, [isOpen]);

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

      {/* Expanded content spacer */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: projectHeight }}
            exit={{ height: 0 }}
            transition={{
              height: {
                duration: 0,
                ease: "linear"
              }
            }}
            style={{
              transition: 'none'
            }}
            className="overflow-hidden"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
