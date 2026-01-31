import React, { useRef, useState, useMemo, memo } from 'react';
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core';
import { SubProject, TimelineItem } from '@/types/timeline';
import { format, differenceInDays, parseISO, isWithinInterval } from 'date-fns';
import { UnifiedItem } from './UnifiedItem';
import { SUBPROJECT_HEADER_HEIGHT, SUBPROJECT_MIN_HEIGHT, ROW_PADDING, ITEM_HEIGHT, ITEM_GAP } from '@/lib/constants';
import { GripVertical } from 'lucide-react';

import { QuickEditPopover } from './QuickEditPopover';
import { QuickCreatePopover } from './QuickCreatePopover';

interface SubProjectLaneProps {
  subProjects: SubProject[];
  itemsBySubProject: Map<string, Map<string, TimelineItem[]>>;
  days: Date[];
  workspaceColor: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemClick: (item: TimelineItem) => void;
  onSubProjectClick: (subProject: SubProject) => void;
  rowHeight?: number;
  laneIndex: number;
  projectId: string;
}

interface SubProjectSectionProps {
  projectId: string;
  subProjectLanes: SubProject[][];
  itemsBySubProject: Map<string, Map<string, TimelineItem[]>>;
  days: Date[];
  workspaceColor: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemClick: (item: TimelineItem) => void;
  onSubProjectClick: (subProject: SubProject) => void;
}

export const SubProjectBar = React.forwardRef<HTMLDivElement, {
  subProject: SubProject;
  width?: number;
  height?: number;
  left?: number;
  isDragging?: boolean;
  onClick?: (subProject: SubProject) => void;
  dragHandleProps?: any;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  isStartClipped?: boolean;
}>(({
  subProject,
  width,
  height,
  left,
  isDragging,
  onClick,
  dragHandleProps,
  style,
  className,
  children,
  isStartClipped = false
}, ref) => {
  return (
    <div
      ref={ref}
      className={`rounded-sm border border-dashed flex flex-col pointer-events-none ${isDragging ? 'opacity-30' : 'z-10'} ${isStartClipped ? 'rounded-l-none border-l-0' : ''} ${className || ''}`}
      style={{
        left: left !== undefined ? `${left}px` : undefined,
        width: width !== undefined ? `${width}px` : undefined,
        height: height !== undefined ? `${height}px` : undefined,
        borderColor: subProject.color
          ? (subProject.color.startsWith('#') ? `${subProject.color}50` : `hsl(var(--workspace-${subProject.color}) / 0.5)`)
          : 'hsl(var(--primary) / 0.2)',
        backgroundColor: subProject.color
          ? (subProject.color.startsWith('#') ? `${subProject.color}10` : `hsl(var(--workspace-${subProject.color}) / 0.1)`)
          : 'hsl(var(--primary) / 0.05)',
        ...style
      }}
    >
      {/* Header with Drag Handle and Title - aligned with items (px-2, gap-1.5, checkbox w-3) */}
      <div className="h-6 shrink-0 w-full flex items-center rounded-t-sm z-20 pointer-events-auto pl-2.5 pr-2 gap-1.5">
        {/* Drag Handle - aligned with checkbox (w-3 to match checkbox width) */}
        <div
          {...dragHandleProps}
          className="w-3 h-3 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none shrink-0"

        >
          <GripVertical className="w-3 h-3 opacity-50" />
        </div>

        {/* Title - Clickable to Edit */}
        <QuickEditPopover item={subProject} className="flex-1 h-full min-w-0">
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (!isDragging && onClick) {
                onClick(subProject);
              }
            }}
            className="w-full h-full flex items-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-tr-sm min-w-0"
          >
            <span
              className="text-xs font-semibold truncate text-foreground"
            >
              {subProject.title}
            </span>
          </div>
        </QuickEditPopover>
      </div>

      {/* Content area - Render children or placeholder */}
      <div className="flex-1 rounded-b-sm overflow-hidden pointer-events-none">
        {children}
      </div>
    </div>
  );
});

function DraggableSubProjectBar({
  subProject,
  timelineStartDate,
  onClick,
  rowHeight,
  totalDays
}: {
  subProject: SubProject;
  timelineStartDate: Date;
  onClick: (subProject: SubProject) => void;
  rowHeight: number;
  totalDays: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: subProject.id,
    data: { type: 'subProject', item: subProject, rowHeight },
  });

  const subProjectStart = parseISO(subProject.startDate);
  const subProjectEnd = parseISO(subProject.endDate);

  const startOffsetDays = differenceInDays(subProjectStart, timelineStartDate);
  const endOffsetDays = differenceInDays(subProjectEnd, timelineStartDate);

  // Clamp to visible area (0 to totalDays)
  const visibleStartDay = Math.max(0, startOffsetDays);
  const visibleEndDay = Math.min(totalDays - 1, endOffsetDays);
  
  // Skip if entirely outside visible range
  if (visibleEndDay < 0 || visibleStartDay >= totalDays) {
    return null;
  }

  const visibleDuration = visibleEndDay - visibleStartDay + 1;

  // Use percentage-based positioning for flex layout
  const leftPercent = (visibleStartDay / totalDays) * 100;
  const widthPercent = (visibleDuration / totalDays) * 100;

  // Check if the start is clipped (bar starts before visible area)
  const isStartClipped = startOffsetDays < 0;

  return (
    <div className="absolute top-1 bottom-1" style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}>
      <SubProjectBar
        ref={setNodeRef}
        subProject={subProject}
        isDragging={isDragging}
        onClick={onClick}
        dragHandleProps={{ ...attributes, ...listeners }}
        className="h-full w-full"
        isStartClipped={isStartClipped}
      />
    </div>
  );
}

// Droppable cell for a SubProject lane - only droppable within SubProject date ranges
function SubProjectLaneDropCell({
  date,
  projectId,
  subProject,
  laneIndex,
  rowHeight
}: {
  date: Date;
  projectId: string;
  subProject: SubProject | undefined;
  laneIndex: number;
  rowHeight: number;
}) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const { active } = useDndContext();
  const isDraggingSubProject = active?.data.current?.type === 'subProject';

  // Only create a droppable if this date is within a SubProject's range
  const { setNodeRef, isOver } = useDroppable({
    id: subProject ? `subproject-lane-${laneIndex}-${subProject.id}-${dateStr}` : `subproject-lane-${laneIndex}-empty-${dateStr}`,
    data: { projectId, date: dateStr, subProjectId: subProject?.id },
    disabled: !subProject && !isDraggingSubProject, // Disable droppable when outside SubProject ranges, unless dragging a subproject
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-0 ${isOver && (subProject || isDraggingSubProject) ? 'bg-primary/10' : ''}`}
    />
  );
}

function SubProjectCell({
  date,
  projectId,
  laneIndex,
  activeSubProject,
  items,
  workspaceColor,
  onToggleItemComplete,
  onItemClick,
  height
}: {
  date: Date;
  projectId: string;
  laneIndex: number;
  activeSubProject: SubProject | undefined;
  items: TimelineItem[];
  workspaceColor: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemClick: (item: TimelineItem) => void;
  height: number;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const dateStr = format(date, 'yyyy-MM-dd');

  const handleItemClick = (e: React.MouseEvent, item: TimelineItem) => {
    e.stopPropagation();
    onItemClick(item);
  };

  const cellContent = (
    <div
      className="flex-1 min-w-0 px-1 py-1 border-r border-border/50 last:border-r-0"
      style={{ minHeight: height }}
    >
      <div className="flex flex-col gap-1 h-full">
        {items.map(item => (
          <UnifiedItem
            key={item.id}
            item={item}
            onToggleComplete={onToggleItemComplete}
            onClick={onItemClick}
            workspaceColor={workspaceColor}
          />
        ))}
      </div>
    </div>
  );

  if (activeSubProject) {
    return (
      <QuickCreatePopover
        open={isCreating}
        onOpenChange={setIsCreating}
        type="item"
        projectId={projectId}
        date={dateStr}
        subProjectId={activeSubProject.id}
        defaultColor={workspaceColor}
      >
        {cellContent}
      </QuickCreatePopover>
    );
  }

  return cellContent;
}

export const SubProjectLane = memo(function SubProjectLane({
  subProjects,
  itemsBySubProject,
  days,
  workspaceColor,
  onToggleItemComplete,
  onItemClick,
  onSubProjectClick,
  rowHeight = SUBPROJECT_MIN_HEIGHT,
  laneIndex,
  projectId
}: SubProjectLaneProps) {
  const timelineStartDate = days[0];
  const cellHeight = rowHeight - SUBPROJECT_HEADER_HEIGHT;

  return (
    <div className="relative flex flex-col overflow-hidden w-full" style={{ minHeight: rowHeight, height: rowHeight }}>
      {/* Column dividers - full height background layer */}
      <div className="absolute inset-0 flex pointer-events-none">
        {days.map((day, index) => (
          <div
            key={day.toISOString()}
            className={`flex-1 min-w-0 ${index < days.length - 1 ? 'border-r border-border/50' : ''}`}
          />
        ))}
      </div>

      {/* Droppable cells - only active within SubProject date ranges, pointer-events-none to allow items to be interactive */}
      <div className="absolute inset-0 flex z-10 pointer-events-none">
        {days.map((day) => {
          const activeSubProject = subProjects.find(sub =>
            isWithinInterval(day, {
              start: parseISO(sub.startDate),
              end: parseISO(sub.endDate)
            })
          );

          return (
            <SubProjectLaneDropCell
              key={day.toISOString()}
              date={day}
              projectId={projectId}
              subProject={activeSubProject}
              laneIndex={laneIndex}
              rowHeight={rowHeight}
            />
          );
        })}
      </div>

      {/* SubProject Bars - visual layer with drag handles */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {subProjects.map(sub => (
          <DraggableSubProjectBar
            key={sub.id}
            subProject={sub}
            timelineStartDate={timelineStartDate}
            onClick={onSubProjectClick}
            rowHeight={rowHeight}
            totalDays={days.length}
          />
        ))}
      </div>

      {/* Items layer - rendered on top with padding to account for subproject header */}
      <div className="relative flex z-30 w-full" style={{ marginTop: SUBPROJECT_HEADER_HEIGHT }}>
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');

          const activeSubProject = subProjects.find(sub =>
            isWithinInterval(day, {
              start: parseISO(sub.startDate),
              end: parseISO(sub.endDate)
            })
          );

          const items = activeSubProject
            ? itemsBySubProject.get(activeSubProject.id)?.get(dateStr) || []
            : [];

          return (
            <SubProjectCell
              key={day.toISOString()}
              date={day}
              projectId={projectId}
              laneIndex={laneIndex}
              activeSubProject={activeSubProject}
              items={items}
              workspaceColor={workspaceColor}
              onToggleItemComplete={onToggleItemComplete}
              onItemClick={onItemClick}
              height={cellHeight}
            />
          );
        })}
      </div>
    </div>
  );
});

// Helper function to calculate row height based on max items per day (same as timelineUtils)
function calculateRowHeight(maxItemCount: number, baseHeight: number = 40): number {
    if (maxItemCount <= 1) return baseHeight;
    return ROW_PADDING + (maxItemCount * ITEM_HEIGHT) + ((maxItemCount) * ITEM_GAP);
}

// Helper to get max items per day for a specific subproject
function getMaxItemsPerDayForSubProject(itemsBySubProject: Map<string, Map<string, TimelineItem[]>>, subProjectId: string): number {
    const dateMap = itemsBySubProject.get(subProjectId);
    if (!dateMap || dateMap.size === 0) return 0;
    let max = 0;
    dateMap.forEach((items) => {
        max = Math.max(max, items.length);
    });
    return max;
}

// Wrapper component for all SubProject lanes - each lane has its own droppable zones
export const SubProjectSection = memo(function SubProjectSection({
  projectId,
  subProjectLanes,
  itemsBySubProject,
  days,
  workspaceColor,
  onToggleItemComplete,
  onItemClick,
  onSubProjectClick
}: SubProjectSectionProps) {
  if (subProjectLanes.length === 0) return null;

  // Compute lane heights to match calculateProjectExpandedHeight logic
  const laneHeights = useMemo(() => {
    return subProjectLanes.map(lane => {
      let maxItems = 0;
      lane.forEach(subProject => {
        const subProjectMaxItems = getMaxItemsPerDayForSubProject(itemsBySubProject, subProject.id);
        maxItems = Math.max(maxItems, subProjectMaxItems);
      });
      // Lane height = header + items area, with a minimum total of SUBPROJECT_MIN_HEIGHT
      const calculatedHeight = SUBPROJECT_HEADER_HEIGHT + calculateRowHeight(maxItems, 40);
      return Math.max(calculatedHeight, SUBPROJECT_MIN_HEIGHT);
    });
  }, [subProjectLanes, itemsBySubProject]);

  return (
    <div className="relative">
      {/* Individual SubProject lanes with their own droppable zones */}
      {subProjectLanes.map((lane, index) => (
        <SubProjectLane
          key={index}
          subProjects={lane}
          itemsBySubProject={itemsBySubProject}
          days={days}
          workspaceColor={workspaceColor}
          onToggleItemComplete={onToggleItemComplete}
          onItemClick={onItemClick}
          onSubProjectClick={onSubProjectClick}
          laneIndex={index}
          projectId={projectId}
          rowHeight={laneHeights[index]}
        />
      ))}
    </div>
  );
});
