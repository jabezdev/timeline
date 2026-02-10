import { Workspace, Project, TimelineItem } from '@/types/timeline';
import { ChevronLeft, ChevronRight, Building2, Calendar, RefreshCw, Plus, Settings2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useStructureQuery } from '@/hooks/useTimelineQueries';
import { PreferencesContent } from '../../preferences-popover';
import { WorkspaceManagerContent } from '../../workspace-manager-popover';
import { Button } from '@/components/ui/button';
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



// ── Timeline Settings & Controls ────────────────────────────────────────

interface TimelineControlsProps {
  startDate: Date;
  onNavigate: (direction: 'prev' | 'next') => void;
  onTodayClick: () => void;
}

export function TimelineControls({ startDate, onNavigate, onTodayClick, children }: TimelineControlsProps & { children?: React.ReactNode }) {
  const queryClient = useQueryClient();

  return (
    <div className="flex items-center w-full gap-2">
      {/* Left: Label (passed as children) */}
      <div className="shrink-0 min-w-0">
        {children}
      </div>

      {/* Center: Date Controls */}
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-0.5 bg-secondary/30 p-0.5 rounded-md">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onNavigate('prev')} title="Previous Week">
            <ChevronLeft className="h-3.5 w-3.5 opacity-70" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onTodayClick} title="Today">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/70" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onNavigate('next')} title="Next Week">
            <ChevronRight className="h-3.5 w-3.5 opacity-70" />
          </Button>
        </div>
      </div>

      {/* Right: Settings */}
      <div className="shrink-0 flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
              <Settings2 className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[700px] p-0 overflow-hidden bg-background/80 backdrop-blur-xl border-border/50 shadow-2xl"
            align="start"
            side="bottom"
            sideOffset={8}
          >
            <div className="grid grid-cols-[280px_1fr] h-[600px]">

              {/* Left Column: Preferences */}
              <div className="border-r border-border/40 bg-muted/30 flex flex-col overflow-y-auto">
                <div className="p-4 flex flex-col gap-6 min-h-0">
                  <PreferencesContent />
                </div>
              </div>

              {/* Right Column: Workspaces */}
              <div className="p-4 flex flex-col h-full overflow-hidden">
                <WorkspaceManagerContent />
              </div>

            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
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
  innerClassName?: string;
}

export const SidebarCell = memo(function SidebarCell({ children, height, minHeight, backgroundColor, className, width = 350, innerClassName }: SidebarCellProps) {
  return (
    <div
      className={`sticky left-0 z-50 flex items-center border-r border-border shrink-0 bg-background ${className || ''}`}
      style={{
        height: height ?? 'auto',
        minHeight: minHeight ?? height,
        width: 'var(--sidebar-width, ' + width + 'px)',
        minWidth: 'var(--sidebar-width, ' + width + 'px)',
      }}
    >
      <div
        className={`w-full h-full flex items-center px-4 ${innerClassName || ''}`}
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

  const { data: structure } = useStructureQuery();
  const userSettings = structure?.userSettings;
  const colorMode = userSettings?.colorMode || 'full';
  const systemAccent = userSettings?.systemAccent || '9';

  const getEffectiveColor = () => {
    if (colorMode === 'monochromatic') {
      return 'var(--primary)';
    }
    return `var(--workspace-${workspace.color})`;
  };

  const effectiveColorVar = getEffectiveColor();

  return (
    <SidebarCell height={WORKSPACE_HEADER_HEIGHT} backgroundColor={`hsl(${effectiveColorVar} / 0.15)`} className="z-[55]" width={width}>
      <div className="flex items-center gap-2 w-full group overflow-hidden">
        <div
          className="w-5 h-5 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: `hsl(${effectiveColorVar} / 0.2)` }}
        >
          <Building2 className="w-3 h-3" style={{ color: `hsl(${effectiveColorVar})` }} />
        </div>
        <span className="text-sm font-semibold text-foreground truncate flex-1">{workspace.name}</span>

        <div className="flex items-center">
          <span className="text-[10px] text-muted-foreground shrink-0 transition-transform duration-300 group-hover:-translate-x-1">
            {projectCount} {projectCount === 1 ? 'proj' : 'projs'}
          </span>

          <div className="w-0 overflow-hidden group-hover:w-6 transition-all duration-300 ease-in-out flex justify-end">
            <Popover open={isAddProjectOpen} onOpenChange={(open) => { if (!open) setIsAddProjectOpen(false); }}>
              <PopoverTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsAddProjectOpen(true); }}
                  className="h-5 w-5 rounded hover:bg-secondary/80 flex items-center justify-center text-muted-foreground transition-colors"
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
        </div>
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
  const activeCount = itemCount - completedCount;

  const { data: structure } = useStructureQuery();
  const userSettings = structure?.userSettings;
  const colorMode = userSettings?.colorMode || 'full';
  const systemAccent = userSettings?.systemAccent || '9';

  const getEffectiveColor = () => {
    if (colorMode === 'monochromatic') {
      return 'var(--primary)';
    }
    return `var(--workspace-${workspaceColor})`;
  };

  const effectiveColorVar = getEffectiveColor();

  return (
    <SidebarCell minHeight={PROJECT_HEADER_HEIGHT} backgroundColor={`hsl(${effectiveColorVar} / 0.07)`} className="z-[54]" width={width}>
      <div className="flex items-center gap-2 w-full pl-2 pr-2">
        <span className="text-xs font-medium text-foreground truncate flex-1">{project.name}</span>
        {activeCount > 0 && (
          <span className="shrink-0 flex items-center justify-center rounded-full h-4 min-w-[16px] px-1 bg-secondary text-[10px] font-bold text-secondary-foreground">
            {activeCount}
          </span>
        )}
      </div>
    </SidebarCell>
  );
});
