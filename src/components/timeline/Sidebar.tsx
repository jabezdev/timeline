import { Workspace, Project, TimelineItem } from '@/types/timeline';
import { ChevronLeft, ChevronRight, Building2, Calendar, RefreshCw, Plus, Settings2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { PreferencesContent } from '../preferences-popover';
import { WorkspaceManagerContent } from '../workspace-manager-popover';
import { Button } from '../ui/button';
import { useTimelineMutations } from '@/hooks/useTimelineMutations';
import { format } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useState, memo } from 'react';
import {
  HEADER_HEIGHT,
  WORKSPACE_HEADER_HEIGHT,
  PROJECT_HEADER_HEIGHT,
} from '@/lib/constants';

export { HEADER_HEIGHT, WORKSPACE_HEADER_HEIGHT, PROJECT_HEADER_HEIGHT } from '@/lib/constants';

// ── Timeline Settings & Controls ────────────────────────────────────────

interface TimelineControlsProps {
  startDate: Date;
  onNavigate: (direction: 'prev' | 'next') => void;
  onTodayClick: () => void;
}

export function TimelineControls({ startDate, onNavigate, onTodayClick }: TimelineControlsProps) {
  const queryClient = useQueryClient();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground hover:text-foreground">
          <Settings2 className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start" side="bottom" sideOffset={8}>
        <div className="flex flex-col gap-4">

          {/* Section 1: Navigation */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Navigation</h4>
            <div className="flex items-center gap-1 justify-between bg-secondary/30 p-1 rounded-md">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onNavigate('prev')} title="Previous Week">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium whitespace-nowrap w-[80px] text-center">
                {format(startDate, 'MMM yyyy')}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onNavigate('next')} title="Next Week">
                <ChevronRight className="h-4 w-4" />
              </Button>

              <div className="w-px h-4 bg-border mx-1" />

              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onTodayClick} title="Go to Today">
                <Calendar className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => queryClient.invalidateQueries()}
                title="Refresh Data"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Section 2: Preferences */}
          <PreferencesContent />

          <div className="h-px bg-border" />

          {/* Section 3: Workspace Manager */}
          <WorkspaceManagerContent />

        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Sidebar Cells ──────────

interface SidebarCellProps {
  children: React.ReactNode;
  height?: number;
  minHeight?: number;
  backgroundColor?: string;
  className?: string;
  isStickyTop?: boolean;
  width?: number;
}

export const SidebarCell = memo(function SidebarCell({ children, height, minHeight, backgroundColor, className, isStickyTop, width = 350 }: SidebarCellProps) {
  return (
    <div
      className={`sticky left-0 z-50 flex items-center border-r border-border shrink-0 bg-background ${className || ''}`}
      style={{
        height: height ?? 'auto',
        minHeight: minHeight ?? height,
        width,
        minWidth: width,
      }}
    >
      <div
        className="w-full h-full flex items-center px-4"
        style={{
          backgroundColor: backgroundColor || 'transparent'
        }}
      >
        {children}
      </div>
    </div>
  );
});

interface InlineWorkspaceLabelProps {
  workspace: Workspace;
  projects: Project[];
  width?: number;
}

export const WorkspaceSidebarCell = memo(function WorkspaceSidebarCell({
  workspace,
  projects,
  width,
}: InlineWorkspaceLabelProps) {
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
      position: 0,
    });
    setNewProjectName('');
    setIsAddProjectOpen(false);
  };

  return (
    <SidebarCell height={WORKSPACE_HEADER_HEIGHT} backgroundColor={`hsl(var(--workspace-${workspace.color}) / 0.15)`} className="z-[55]" width={width}>
      <div className="flex items-center gap-2 w-full group">
        <div
          className="w-5 h-5 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: `hsl(var(--workspace-${workspace.color}) / 0.2)` }}
        >
          <Building2 className="w-3 h-3" style={{ color: `hsl(var(--workspace-${workspace.color}))` }} />
        </div>
        <span className="text-sm font-semibold text-foreground truncate flex-1">{workspace.name}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {projectCount} {projectCount === 1 ? 'proj' : 'projs'}
        </span>

        <Popover open={isAddProjectOpen} onOpenChange={(open) => { if (!open) setIsAddProjectOpen(false); }}>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); setIsAddProjectOpen(true); }}
              className="h-5 w-5 rounded hover:bg-secondary/80 flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              title="Quick Add Project"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start" side="bottom" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              <h4 className="font-medium text-xs">New Project in {workspace.name}</h4>
              <div className="flex gap-2">
                <Input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project Name"
                  className="h-7 text-xs"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddProject(); }}
                />
                <Button size="sm" className="h-7 text-xs" onClick={handleAddProject}>Add</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </SidebarCell>
  );
});

interface InlineProjectLabelProps {
  project: Project;
  items: TimelineItem[];
  workspaceColor: string;
  width?: number;
}

export const ProjectSidebarCell = memo(function ProjectSidebarCell({
  project,
  items,
  workspaceColor,
  width,
}: InlineProjectLabelProps) {
  const itemCount = items.length;
  const completedCount = items.filter(t => t.completed).length;

  return (
    <SidebarCell minHeight={PROJECT_HEADER_HEIGHT} backgroundColor={`hsl(var(--workspace-${workspaceColor}) / 0.07)`} className="z-[54]" width={width}>
      <div className="flex items-center gap-2 w-full pl-2">
        <span className="text-xs font-medium text-foreground truncate flex-1">{project.name}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">{completedCount}/{itemCount}</span>
      </div>
    </SidebarCell>
  );
});
