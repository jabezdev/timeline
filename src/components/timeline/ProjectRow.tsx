import { useMemo, memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { addDays, format } from 'date-fns';
import { Plus } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Project, TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { TimelineCell } from './TimelineCell';
import { MilestoneItem } from './MilestoneItem';
import { SubProjectSection } from './SubProjectRow';
import { CELL_WIDTH, PROJECT_HEADER_HEIGHT } from '@/lib/constants';
import { packSubProjects } from '@/lib/timelineUtils';
import { useState } from 'react';

function MilestoneDropCell({
  date,
  projectId,
  milestones,
  workspaceColor,
  onItemDoubleClick,
  onQuickCreate,
  onQuickEdit
}: {
  date: Date;
  projectId: string;
  milestones: Milestone[];
  workspaceColor: number;
  onItemDoubleClick: (item: Milestone) => void;
  onQuickCreate: (projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
  onQuickEdit: (item: Milestone, anchorElement?: HTMLElement) => void;
}) {
  const dateStr = format(date, 'yyyy-MM-dd');

  const { setNodeRef, isOver } = useDroppable({
    id: `milestone-${projectId}-${dateStr}`,
    data: { projectId, date: dateStr, type: 'milestone' },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative group flex flex-col justify-start border-r border-border/50 last:border-r-0 ${isOver ? 'bg-milestone/10' : ''}`}
      style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
    >
      <div className="flex flex-col w-full h-full">
        <SortableContext items={milestones.map(m => m.id)} strategy={verticalListSortingStrategy}>
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
                />
              </div>
            </div>
          ))}
        </SortableContext>
      </div>

      {/* Floating Quick Create Button - always available on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onQuickCreate(projectId, dateStr, undefined, workspaceColor, e.currentTarget);
        }}
        className="absolute top-1 right-1 w-5 h-5 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-milestone/20 hover:bg-milestone/30 flex items-center justify-center z-10"
        title="Add milestone"
      >
        <Plus className="w-3 h-3 text-milestone" />
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
  onQuickCreate: (projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
}

export const MilestoneHeaderRow = memo(function MilestoneHeaderRow({
  project,
  milestones: propMilestones,
  startDate,
  visibleDays,
  workspaceColor,
  onItemDoubleClick,
  onQuickEdit,
  onQuickCreate
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
          <MilestoneDropCell
            key={dateStr}
            date={day}
            projectId={project.id}
            milestones={milestonesByDate.get(dateStr) || []}
            workspaceColor={workspaceColor}
            onItemDoubleClick={onItemDoubleClick}
            onQuickCreate={onQuickCreate}
            onQuickEdit={onQuickEdit}
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
  sidebarWidth: number;
  onQuickCreate: (projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
  onQuickEdit: (item: TimelineItem | Milestone | SubProject, anchorElement?: HTMLElement) => void;
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
  sidebarWidth,
  onQuickCreate,
  onQuickEdit
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
        sidebarWidth={sidebarWidth}
        onQuickCreate={onQuickCreate}
        onQuickEdit={onQuickEdit}
      />
    </div>
  );
});
