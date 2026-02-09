import { useMemo, memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { addDays, format } from 'date-fns';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Project, TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { TimelineCell } from './TimelineCell';
import { MilestoneItem } from './MilestoneItem';
import { SubProjectSection } from './SubProjectRow';
import { CELL_WIDTH, PROJECT_HEADER_HEIGHT } from '@/lib/constants';
import { packSubProjects } from '@/lib/timelineUtils';
import { QuickCreatePopover } from './QuickCreatePopover';
import { useState } from 'react';

function MilestoneDropCell({
  date,
  projectId,
  milestones,
  workspaceColor,
  onItemClick,
}: {
  date: Date;
  projectId: string;
  milestones: Milestone[];
  workspaceColor: number;
  onItemClick: (item: Milestone) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const dateStr = format(date, 'yyyy-MM-dd');

  const { setNodeRef, isOver } = useDroppable({
    id: `milestone-${projectId}-${dateStr}`,
    data: { projectId, date: dateStr, type: 'milestone' },
  });

  return (
    <QuickCreatePopover
      open={isCreating}
      onOpenChange={setIsCreating}
      type="milestone"
      projectId={projectId}
      date={dateStr}
      defaultColor={workspaceColor}
    >
      <div
        ref={setNodeRef}
        className={`flex flex-col justify-start border-r border-border/50 last:border-r-0 ${isOver ? 'bg-milestone/10' : ''}`}
        style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
      >
        <div className="flex flex-col w-full h-full">
          <SortableContext items={milestones.map(m => m.id)} strategy={verticalListSortingStrategy}>
            {milestones.map(milestone => (
              <div
                key={milestone.id}
                onClick={(e) => { e.stopPropagation(); onItemClick(milestone); }}
                className={milestones.length === 1 ? 'flex-1 h-full' : ''}
              >
                <MilestoneItem
                  milestone={milestone}
                  workspaceColor={workspaceColor}
                  className={milestones.length === 1 ? 'h-full' : ''}
                />
              </div>
            ))}
          </SortableContext>
        </div>
      </div>
    </QuickCreatePopover>
  );
}

// ── Milestone Header Row (used in the sticky project header) ────────────

interface MilestoneHeaderRowProps {
  project: Project;
  milestones: Milestone[];
  startDate: Date;
  visibleDays: number;
  workspaceColor: number;
  onItemClick: (item: Milestone) => void;
}

export const MilestoneHeaderRow = memo(function MilestoneHeaderRow({
  project,
  milestones: propMilestones,
  startDate,
  visibleDays,
  workspaceColor,
  onItemClick,
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
            onItemClick={onItemClick}
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
  onItemClick: (item: TimelineItem | Milestone) => void;
  onSubProjectClick: (subProject: SubProject) => void;
  sidebarWidth: number;
}

export const ProjectRow = memo(function ProjectRow({
  project,
  items: propItems,
  subProjects: propSubProjects,
  startDate,
  visibleDays,
  workspaceColor,
  onToggleItemComplete,
  onItemClick,
  onSubProjectClick,
  sidebarWidth
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
              onItemClick={onItemClick}
              cellWidth={CELL_WIDTH}
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
        onItemClick={onItemClick}
        onSubProjectClick={onSubProjectClick}
        sidebarWidth={sidebarWidth}
      />
    </div>
  );
});
