import { Workspace, Project, SubProject, TimelineItem } from '@/types/timeline';
import { ChevronDown, ChevronRight, ChevronLeft, Building2, Calendar, ChevronsDown, ChevronsUp, PanelLeftClose, RefreshCw, FolderPlus, Plus, FilePlus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { PreferencesPopover } from '../preferences-popover';
import { WorkspaceManagerPopover, AddWorkspacePopover } from '../workspace-manager-popover';
import { Button } from '../ui/button';
import { useTimelineMutations } from '@/hooks/useTimelineMutations';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import {
  SIDEBAR_WIDTH,
  COLLAPSED_SIDEBAR_WIDTH,
  HEADER_HEIGHT,
  WORKSPACE_HEADER_HEIGHT,
  PROJECT_HEADER_HEIGHT,
  SUBPROJECT_HEADER_HEIGHT
} from '@/lib/constants';
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
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function SidebarHeader({
  startDate,
  onNavigate,
  onTodayClick,
  onExpandAll,
  isAllExpanded,
  isCollapsed,
  onToggleCollapse
}: SidebarHeaderProps) {
  const queryClient = useQueryClient();
  const width = isCollapsed ? COLLAPSED_SIDEBAR_WIDTH : SIDEBAR_WIDTH;

  if (isCollapsed) return null;

  return (
    <div
      className="shrink-0 flex items-center justify-between px-2 border-r border-b border-border bg-background"
      style={{ width, minWidth: width, height: HEADER_HEIGHT }}
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
          onClick={() => {
            queryClient.invalidateQueries();
          }}
          title="Purge & Refetch"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="sr-only">Purge & Refetch</span>
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

        <div className="w-px h-4 bg-border mx-1" />
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={onToggleCollapse} title="Collapse Sidebar">
          <PanelLeftClose className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface SidebarWorkspaceProps {
  workspace: Workspace;
  isCollapsed: boolean; // New prop
  projects: Project[]; // Explicitly passed
  projectsItems: Map<string, TimelineItem[]>;
  projectsMilestones: Map<string, Milestone[]>; // Added prop
  projectsSubProjects: Map<string, SubProject[]>;
  openProjectIds: string[]; // Normalized to strings array
  onToggleWorkspace: () => void;
  onToggleProject: (projectId: string, workspaceId: string) => void;
  isSidebarCollapsed: boolean;
}

// Header component for flat list
export function SidebarWorkspaceHeader({
  workspace,
  isCollapsed,
  projects, // Still needed for metrics and collapsed indicators
  projectsItems,
  projectsMilestones,
  onToggleWorkspace,
  isSidebarCollapsed
}: Omit<SidebarWorkspaceProps, 'projectsSubProjects' | 'openProjectIds' | 'onToggleProject'>) {
  const projectCount = projects.length;
  const mutations = useTimelineMutations();
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleAddProject = () => {
    if (!newProjectName.trim()) return;
    mutations.addProject.mutate({
      workspaceId: workspace.id,
      name: newProjectName.trim(),
      color: 1,
      position: 0
    });
    setNewProjectName('');
    setIsAddProjectOpen(false);
  };

  if (isSidebarCollapsed) return null;

  return (
    <div className="border-b border-border">
      {/* Workspace header */}
      <div
        className="flex items-center gap-2 px-2 bg-background cursor-pointer hover:bg-secondary/30"
        style={{ height: WORKSPACE_HEADER_HEIGHT }}
        onClick={onToggleWorkspace}
      >
        {isCollapsed ? (
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

        <span className="text-[10px] text-muted-foreground shrink-0 group-hover/ws:hidden">
          {projectCount} {projectCount === 1 ? 'proj' : 'projs'}
        </span>

        {/* Quick Add Project Button (Contextual) */}
        <Popover open={isAddProjectOpen} onOpenChange={(open) => {
          if (!open) setIsAddProjectOpen(false);
        }}>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsAddProjectOpen(true);
              }}
              className="h-5 w-5 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              title="Quick Add Project"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start" side="right" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              <h4 className="font-medium text-xs">New Project in {workspace.name}</h4>
              <div className="flex gap-2">
                <Input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project Name"
                  className="h-7 text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddProject();
                  }}
                />
                <Button size="sm" className="h-7 text-xs" onClick={handleAddProject}>Add</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Collapsed State Indicators */}
      {isCollapsed && (
        <div className="px-2 pt-1 pb-2 flex flex-col gap-1">
          {projects.map(p => {
            const items = projectsItems.get(p.id) || [];
            const milestones = projectsMilestones.get(p.id) || [];


            if (items.length === 0 && milestones.length === 0) return null;

            return (
              <div key={p.id} className="flex flex-wrap gap-1 px-1.5 py-1">
                {/* Milestones */}
                {milestones.map(m => (
                  <div
                    key={m.id}
                    className="w-2.5 h-2.5 rounded-full border-[2px] border-current box-border bg-transparent shrink-0"
                    style={{
                      color: m.color
                        ? (m.color.startsWith('#') ? m.color : `hsl(var(--workspace-${m.color}))`)
                        : `hsl(var(--workspace-${workspace.color}))`
                    }}
                    title={`Milestone: ${m.title}`}
                  />
                ))}
                {/* Task Dots */}
                {items.map(i => (
                  <div
                    key={i.id}
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${i.completed ? 'opacity-30' : 'opacity-80'}`}
                    style={{
                      backgroundColor: i.completed ? 'currentColor' : `hsl(var(--workspace-${workspace.color}))`,
                      color: `hsl(var(--workspace-${workspace.color}))`
                    }}
                    title={`Task: ${i.title} (${i.completed ? 'Completed' : 'Pending'})`}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SidebarProjectProps {
  project: Project;
  items: TimelineItem[];
  subProjects: SubProject[];
  isOpen: boolean;
  onToggle: () => void;
  workspaceColor: string;
}

export function SidebarProject({ project, items, subProjects, isOpen, onToggle, workspaceColor }: SidebarProjectProps) {
  const itemCount = items.length;
  const completedCount = items.filter(t => t.completed).length;

  // Compute the expected height based on project structure
  const computedHeight = useMemo(() => {
    if (!isOpen) return 0;
    const { totalHeight } = calculateProjectExpandedHeight(project, items, subProjects);
    return totalHeight;
  }, [project, items, subProjects, isOpen]);

  // Use deterministic computed height.
  // This matches the calculation logic in ProjectRow's rendering.
  const projectHeight = computedHeight;

  const wasOpenRef = useRef(isOpen);
  useEffect(() => {
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  return (
    <div className="border-b border-border/50">
      {/* Project header */}
      <div
        className="flex items-center gap-1.5 px-2 cursor-pointer hover:bg-secondary/30"
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
      {isOpen && (
        <div
          style={{ height: projectHeight }}
          className="overflow-hidden"
        />
      )}
    </div>
  );
}


