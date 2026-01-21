import { useMemo, useRef, useLayoutEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { addDays, format } from 'date-fns';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Project, TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { TimelineCell } from './TimelineCell';
import { MilestoneItem } from './MilestoneItem';
import { SubProjectSection } from './SubProjectRow';
import { CELL_WIDTH, PROJECT_HEADER_HEIGHT } from '@/lib/constants';
import { packSubProjects } from '@/lib/timelineUtils';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { QuickCreatePopover } from './QuickCreatePopover';

// Droppable cell for milestones in the header row
function MilestoneDropCell({
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
  const uncompletedItems = items.filter(item => !item.completed);

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
        className={`flex flex-col justify-center px-1 border-r border-border/50 last:border-r-0 transition-colors ${isOver ? 'bg-milestone/10' : ''
          }`}
        style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
      >
        {/* Render Milestones */}
        <div className="flex flex-col gap-1">
          <SortableContext items={milestones.map(m => m.id)} strategy={verticalListSortingStrategy}>
            {milestones.map(milestone => (
              <div key={milestone.id} onClick={(e) => handleMilestoneClick(e, milestone)}>
                <MilestoneItem
                  milestone={milestone}
                  workspaceColor={workspaceColor}
                  isCompact={!isOpen && uncompletedItems.length > 0}
                />
              </div>
            ))}
          </SortableContext>
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
}

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

export function ProjectRow({
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

  // Ref for the expanded content
  const expandedContentRef = useRef<HTMLDivElement>(null);
  const setProjectHeight = useTimelineStore((state) => state.setProjectHeight);
  const measureTimeoutRef = useRef<number | null>(null);
  const lastMeasuredHeight = useRef<number>(0);

  // Measure and report height to store for sidebar sync
  // Use useLayoutEffect to measure before paint for smoother sync
  useLayoutEffect(() => {
    if (!isOpen) {
      if (lastMeasuredHeight.current !== 0) {
        setProjectHeight(project.id, 0);
        lastMeasuredHeight.current = 0;
      }
      return;
    }

    const measureHeight = () => {
      if (expandedContentRef.current) {
        const height = expandedContentRef.current.scrollHeight;
        if (Math.abs(height - lastMeasuredHeight.current) > 1) {
          setProjectHeight(project.id, height);
          lastMeasuredHeight.current = height;
        }
      }
    };

    // Debounced measurement to avoid multiple updates during animations
    const debouncedMeasure = () => {
      if (measureTimeoutRef.current) {
        clearTimeout(measureTimeoutRef.current);
      }
      measureTimeoutRef.current = window.setTimeout(measureHeight, 50);
    };

    // Measure immediately for initial sync
    measureHeight();

    // Use ResizeObserver with debouncing for dynamic content changes
    let resizeObserver: ResizeObserver | null = null;
    if (expandedContentRef.current) {
      resizeObserver = new ResizeObserver(debouncedMeasure);
      resizeObserver.observe(expandedContentRef.current);
    }

    return () => {
      if (measureTimeoutRef.current) {
        clearTimeout(measureTimeoutRef.current);
      }
      resizeObserver?.disconnect();
    };
  }, [isOpen, project.id, propItems, propSubProjects, setProjectHeight]);

  return (
    <div className="flex flex-col border-b border-border/50">
      {/* HEADER ROW - Milestones */}
      <div className="flex" style={{ height: PROJECT_HEADER_HEIGHT }}>
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayMilestones = milestones.get(dateStr) || [];
          const dayItems = allItems.get(dateStr) || [];

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
          className="flex flex-col overflow-hidden"
        >
          {/* Main Items Row */}
          <div
            className="flex border-b border-border/30 items-stretch"
          >
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              return (
                <TimelineCell
                  key={day.toISOString()}
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
  );
}
