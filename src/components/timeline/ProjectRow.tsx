import { useMemo, useRef, useLayoutEffect, useState, memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { addDays, format } from 'date-fns';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { Project, TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { TimelineCell } from './TimelineCell';
import { MilestoneItem } from './MilestoneItem';
import { SubProjectSection } from './SubProjectRow';
import { PROJECT_HEADER_HEIGHT, EMPTY_ITEMS_ARRAY, EMPTY_MILESTONES_ARRAY } from '@/lib/constants';
import { packSubProjects } from '@/lib/timelineUtils';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { QuickCreatePopover } from './QuickCreatePopover';

// Memoized Droppable cell for milestones in the header row
const MilestoneDropCell = memo(function MilestoneDropCell({
  date,
  projectId,
  milestones,
  workspaceColor,
  onItemClick,
  items,
  isOpen
}: {
  date: Date;
  projectId: string;
  milestones: Milestone[];
  workspaceColor: number;
  onItemClick: (item: Milestone) => void;
  items: TimelineItem[];
  isOpen: boolean;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const dateStr = format(date, 'yyyy-MM-dd');

  const { setNodeRef, isOver } = useDroppable({
    id: `milestone-${projectId}-${dateStr}`,
    data: { projectId, date: dateStr, type: 'milestone' },
  });

  // Filter out completed items for collapsed view
  const uncompletedItems = useMemo(() => items.filter(item => !item.completed), [items]);

  const handleMilestoneClick = (e: React.MouseEvent, m: Milestone) => {
    e.stopPropagation();
    onItemClick(m);
  };

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
        className={`flex-1 min-w-0 flex flex-col justify-center px-1 border-r border-border/50 last:border-r-0 transition-colors ${isOver ? 'bg-milestone/10' : ''
          }`}
      >
        {/* Render Milestones - No individual SortableContext */}
        <div className="flex flex-col gap-1">
          {milestones.map(milestone => (
            <div key={milestone.id} onClick={(e) => handleMilestoneClick(e, milestone)}>
              <MilestoneItem
                milestone={milestone}
                workspaceColor={workspaceColor}
                isCompact={!isOpen && uncompletedItems.length > 0}
              />
            </div>
          ))}
        </div>

        {/* If collapsed and has uncompleted items, show dots for each */}
        {!isOpen && uncompletedItems.length > 0 && (
          <div className="flex justify-center gap-0.5 flex-wrap mt-1">
            {uncompletedItems.map(item => (
              <div
                key={item.id}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: item.color
                    ? (item.color.startsWith('#') ? item.color : `hsl(var(--workspace-${item.color}))`)
                    : 'hsl(var(--task))'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </QuickCreatePopover>
  );
});

interface ProjectRowProps {
  project: Project;
  items: TimelineItem[];
  milestones: Milestone[];
  subProjects: SubProject[];
  isOpen: boolean;
  startDate: Date;
  visibleDays: number;
  workspaceColor: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemClick: (item: TimelineItem | Milestone) => void;
  onSubProjectClick: (subProject: SubProject) => void;
}

export const ProjectRow = memo(function ProjectRow({
  project,
  items: propItems,
  milestones: propMilestones,
  subProjects: propSubProjects,
  isOpen,
  startDate,
  visibleDays,
  workspaceColor,
  onToggleItemComplete,
  onItemClick,
  onSubProjectClick
}: ProjectRowProps) {
  // ... (rest of logic same as before, already edited earlier)
  const days = Array.from({ length: visibleDays }, (_, i) => addDays(startDate, i));

  // Pre-calculate items by date for O(1) lookup
  const { items, milestones, subProjectItems, allItems } = useMemo(() => {
    const items = new Map<string, TimelineItem[]>();
    const milestones = new Map<string, Milestone[]>();
    const subProjectItems = new Map<string, Map<string, TimelineItem[]>>();
    const allItems = new Map<string, TimelineItem[]>();

    propItems.forEach(t => {
      // Add to allItems for collapsed view
      if (!allItems.has(t.date)) allItems.set(t.date, []);
      allItems.get(t.date)!.push(t);

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
    });

    propMilestones.forEach(m => {
      if (!milestones.has(m.date)) milestones.set(m.date, []);
      milestones.get(m.date)!.push(m);
    });

    return { items, milestones, subProjectItems, allItems };
  }, [propItems, propMilestones]);

  const subProjectLanes = useMemo(() => {
    return packSubProjects(propSubProjects || []);
  }, [propSubProjects]);

  // Consolidated sortable IDs for single SortableContext per project (performance optimization)
  const allSortableIds = useMemo(() => {
    const itemIds = propItems.map(i => i.id);
    const milestoneIds = propMilestones.map(m => m.id);
    return [...itemIds, ...milestoneIds];
  }, [propItems, propMilestones]);

  // Ref for the expanded content
  // We no longer rely on manual measurement for sidebar sync, defaulting to deterministic calculation in Sidebar
  const expandedContentRef = useRef<HTMLDivElement>(null);

  // Note: We used to measure height here and sync to store, but it caused massive re-render storms.
  // We now rely on 'calculateProjectExpandedHeight' being consistent between Sidebar and ProjectRow.


  return (
    // Single SortableContext per project - much more efficient than one per cell
    <SortableContext items={allSortableIds} strategy={rectSortingStrategy}>
      <div className="flex flex-col border-b border-border w-full">
        {/* HEADER ROW - Milestones */}
        <div className="flex w-full" style={{ height: PROJECT_HEADER_HEIGHT }}>
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayMilestones = milestones.get(dateStr) ?? EMPTY_MILESTONES_ARRAY;
            const dayItems = allItems.get(dateStr) ?? EMPTY_ITEMS_ARRAY;

            return (
              <MilestoneDropCell
                key={day.toISOString()}
                date={day}
                projectId={project.id}
                milestones={dayMilestones}
                workspaceColor={workspaceColor}
                onItemClick={onItemClick}
                items={dayItems}
                isOpen={isOpen}
              />
            );
          })}
        </div>

        {/* EXPANDED CONTENT */}
        {isOpen && (
          <div
            ref={expandedContentRef}
            className="flex flex-col overflow-hidden w-full"
          >
            {/* Main Items Row */}
            <div
              className="flex border-b border-border/30 items-stretch w-full"
            >
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                return (
                  <TimelineCell
                    key={day.toISOString()}
                    date={day}
                    projectId={project.id}
                    items={items.get(dateStr) ?? EMPTY_ITEMS_ARRAY}
                    milestones={EMPTY_MILESTONES_ARRAY}
                    workspaceColor={workspaceColor}
                    onToggleItemComplete={onToggleItemComplete}
                    onItemClick={onItemClick}
                  />
                );
              })}
            </div>

            {/* SubProjects Section - unified droppable zone spanning all lanes */}
            <SubProjectSection
              projectId={project.id}
              subProjectLanes={subProjectLanes}
              itemsBySubProject={subProjectItems}
              days={days}
              workspaceColor={workspaceColor}
              onToggleItemComplete={onToggleItemComplete}
              onItemClick={onItemClick}
              onSubProjectClick={onSubProjectClick}
            />
          </div>
        )}
      </div>
    </SortableContext>
  );
});
