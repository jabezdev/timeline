import React, { useMemo, memo } from 'react';
import { addDays, format } from 'date-fns';
import { Plus } from 'lucide-react';
import { Project, TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { TimelineCell } from './TimelineCell';
import { MilestoneItem } from './MilestoneItem';
import { SubProjectSection } from './SubProjectRow';
import { CELL_WIDTH, PROJECT_HEADER_HEIGHT } from '@/lib/constants';
import { packSubProjects } from '@/lib/timelineUtils';

function MilestoneCell({
  date,
  projectId,
  milestones,
  workspaceColor,
  onItemDoubleClick,
  onQuickCreate,
  onQuickEdit,
  colorMode,
  systemAccent,
  onItemClick,
  onItemContextMenu
}: {
  date: Date;
  projectId: string;
  milestones: Milestone[];
  workspaceColor: number;
  onItemDoubleClick: (item: Milestone) => void;
  onQuickCreate: (type: 'item' | 'milestone', projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
  onQuickEdit: (item: Milestone, anchorElement?: HTMLElement) => void;
  colorMode?: 'full' | 'monochromatic';
  systemAccent?: string;
  onItemClick: (id: string, multi: boolean, e: React.MouseEvent) => void;
  onItemContextMenu: (id: string, type: 'item' | 'milestone' | 'subproject', e: React.MouseEvent) => void;
}) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative group flex flex-col justify-start border-r border-border/50 last:border-r-0"
      style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
    >
      <div className="flex flex-col w-full h-full">
        {milestones.map(milestone => (
          <div
            key={milestone.id}
            className={milestones.length === 1 ? 'flex-1 h-full' : ''}
          >
            <div className="h-full w-full">
              <MilestoneItem
                milestone={milestone}
                workspaceColor={workspaceColor}
                className={milestones.length === 1 ? 'h-full' : ''}
                onDoubleClick={onItemDoubleClick}
                onQuickEdit={onQuickEdit}
                minHeight={PROJECT_HEADER_HEIGHT}
                onClick={(multi, e) => onItemClick(milestone.id, multi, e)}
                colorMode={colorMode}
                systemAccent={systemAccent}
                onContextMenu={(e) => onItemContextMenu(milestone.id, 'milestone', e)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Floating Quick Create Button - always available on hover */}
      {/* Floating Quick Create Button - distinct for milestones */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onQuickCreate('milestone', projectId, dateStr, undefined, workspaceColor, containerRef.current || e.currentTarget);
        }}
        className="absolute top-1 right-1 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-all bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 hover:text-orange-700 flex items-center justify-center z-10 shadow-sm scale-90 hover:scale-100 border border-orange-500/20"
        title="Add milestone"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={3} />
      </button>
    </div>
  );
}

// ── Milestone Header Row (used in the sticky project header) ────────────

interface MilestoneHeaderRowProps {
  project: Project;
  milestones: Milestone[];
  startDate: Date;
  visibleDays: number;
  workspaceColor: number;
  onItemDoubleClick: (item: Milestone) => void;
  onQuickEdit: (item: Milestone, anchorElement?: HTMLElement) => void;
  onQuickCreate: (type: 'item' | 'milestone', projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
  colorMode?: 'full' | 'monochromatic';
  systemAccent?: string;
  onItemClick: (id: string, multi: boolean, e: React.MouseEvent) => void;
  onItemContextMenu: (id: string, type: 'item' | 'milestone' | 'subproject', e: React.MouseEvent) => void;
}

export const MilestoneHeaderRow = memo(function MilestoneHeaderRow({
  project,
  milestones: propMilestones,
  startDate,
  visibleDays,
  workspaceColor,
  onItemDoubleClick,
  onQuickEdit,
  onQuickCreate,
  colorMode,
  systemAccent,
  onItemClick,
  onItemContextMenu
}: MilestoneHeaderRowProps) {
  const days = useMemo(() => Array.from({ length: visibleDays }, (_, i) => addDays(startDate, i)), [startDate, visibleDays]);

  const milestonesByDate = useMemo(() => {
    const map = new Map<string, Milestone[]>();
    for (const m of propMilestones) {
      if (!map.has(m.date)) map.set(m.date, []);
      map.get(m.date)!.push(m);
    }
    return map;
  }, [propMilestones]);

  return (
    <div className="flex items-stretch" style={{ minHeight: PROJECT_HEADER_HEIGHT, height: 'auto' }}>
      {days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return (
          <MilestoneCell
            key={dateStr}
            date={day}
            projectId={project.id}
            milestones={milestonesByDate.get(dateStr) || []}
            workspaceColor={workspaceColor}
            onItemDoubleClick={onItemDoubleClick}
            onQuickCreate={onQuickCreate}
            onQuickEdit={onQuickEdit}
            onItemClick={onItemClick}
            onItemContextMenu={onItemContextMenu}
            colorMode={colorMode}
            systemAccent={systemAccent}
          />
        );
      })}
    </div>
  );
});

// ── Project Content (items + subprojects, NOT milestones) ───────────────

interface ProjectRowProps {
  project: Project;
  items: TimelineItem[];
  subProjects: SubProject[];
  startDate: Date;
  visibleDays: number;
  workspaceColor: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemDoubleClick: (item: TimelineItem | Milestone) => void;
  onSubProjectDoubleClick: (subProject: SubProject) => void;
  onQuickCreate: (type: 'item' | 'milestone', projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
  onQuickEdit: (item: TimelineItem | Milestone | SubProject, anchorElement?: HTMLElement) => void;
  onItemClick: (id: string, multi: boolean, e: React.MouseEvent) => void;
  onItemContextMenu: (id: string, type: 'item' | 'milestone' | 'subproject', e: React.MouseEvent) => void;
  onClearSelection: () => void;
  colorMode?: 'full' | 'monochromatic';
  systemAccent?: string;
}

export const ProjectRow = memo(function ProjectRow({
  project,
  items: propItems,
  subProjects: propSubProjects,
  startDate,
  visibleDays,
  workspaceColor,
  onToggleItemComplete,
  onItemDoubleClick,
  onSubProjectDoubleClick,
  onQuickCreate,
  onQuickEdit,
  onItemClick,
  onItemContextMenu,
  onClearSelection,
  colorMode,
  systemAccent
}: ProjectRowProps) {
  const days = useMemo(() => Array.from({ length: visibleDays }, (_, i) => addDays(startDate, i)), [startDate, visibleDays]);

  const { items, subProjectItems } = useMemo(() => {
    const items = new Map<string, TimelineItem[]>();
    const subProjectItems = new Map<string, Map<string, TimelineItem[]>>();

    for (const t of propItems) {
      if (t.subProjectId) {
        if (!subProjectItems.has(t.subProjectId)) {
          subProjectItems.set(t.subProjectId, new Map());
        }
        const spMap = subProjectItems.get(t.subProjectId)!;
        if (!spMap.has(t.date)) spMap.set(t.date, []);
        spMap.get(t.date)!.push(t);
      } else {
        if (!items.has(t.date)) items.set(t.date, []);
        items.get(t.date)!.push(t);
      }
    }

    return { items, subProjectItems };
  }, [propItems]);

  const subProjectLanes = useMemo(() => packSubProjects(propSubProjects || []), [propSubProjects]);

  return (
    <div className="flex flex-col">
      {/* Main Items Row */}
      <div className="flex border-b border-border/30 items-stretch">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          return (
            <TimelineCell
              key={dateStr}
              date={day}
              projectId={project.id}
              items={items.get(dateStr) || []}
              milestones={[]}
              workspaceColor={workspaceColor}
              onToggleItemComplete={onToggleItemComplete}
              onItemDoubleClick={onItemDoubleClick}
              cellWidth={CELL_WIDTH}
              onQuickCreate={onQuickCreate}
              onQuickEdit={onQuickEdit}
              onItemClick={onItemClick}
              onItemContextMenu={onItemContextMenu}
              colorMode={colorMode}
              systemAccent={systemAccent}
            />
          );
        })}
      </div>

      {/* SubProjects Section */}
      <SubProjectSection
        projectId={project.id}
        subProjectLanes={subProjectLanes}
        itemsBySubProject={subProjectItems}
        days={days}
        workspaceColor={workspaceColor}
        onToggleItemComplete={onToggleItemComplete}
        onItemDoubleClick={onItemDoubleClick}
        onSubProjectDoubleClick={onSubProjectDoubleClick}
        onQuickCreate={onQuickCreate}
        onQuickEdit={onQuickEdit}
        onItemClick={onItemClick}
        onItemContextMenu={onItemContextMenu}
        colorMode={colorMode}
        systemAccent={systemAccent}
      />
    </div>
  );
});
