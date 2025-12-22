import React, { useRef, useLayoutEffect, useState } from 'react';
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core';
import { SubProject, TimelineItem } from '@/types/timeline';
import { format, differenceInDays, parseISO, isWithinInterval } from 'date-fns';
import { UnifiedItem } from './UnifiedItem';
import { CELL_WIDTH, SUBPROJECT_HEADER_HEIGHT } from '@/lib/constants';
import { GripVertical } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { useDropAnimation } from './DropAnimationContext';
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
  children
}, ref) => {
  return (
    <div
      ref={ref}
      className={`rounded-sm border border-dashed flex flex-col pointer-events-none ${isDragging ? 'opacity-30' : 'z-10'} ${className || ''}`}
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
          className="w-3 h-3 flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0"
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
  rowHeight
}: {
  subProject: SubProject;
  timelineStartDate: Date;
  onClick: (subProject: SubProject) => void;
  rowHeight: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: subProject.id,
    data: { type: 'subProject', item: subProject, rowHeight },
  });

  const { consumeDropInfo } = useDropAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [animateFrom, setAnimateFrom] = useState<{ x: number; y: number } | null>(null);

  const subProjectStart = parseISO(subProject.startDate);
  const subProjectEnd = parseISO(subProject.endDate);

  const startOffsetDays = differenceInDays(subProjectStart, timelineStartDate);
  const durationDays = differenceInDays(subProjectEnd, subProjectStart) + 1;

  const left = startOffsetDays * CELL_WIDTH;
  const width = durationDays * CELL_WIDTH;

  useLayoutEffect(() => {
    const dropInfo = consumeDropInfo(subProject.id);
    if (dropInfo && containerRef.current) {
      const currentRect = containerRef.current.getBoundingClientRect();
      const offsetX = dropInfo.rect.left - currentRect.left;
      const offsetY = dropInfo.rect.top - currentRect.top;
      setAnimateFrom({ x: offsetX, y: offsetY });
      // Clear the animation state after it completes
      const timer = setTimeout(() => setAnimateFrom(null), 200);
      return () => clearTimeout(timer);
    }
  }, [subProject.id, subProject.startDate, consumeDropInfo]);

  return (
    <div ref={containerRef} className="absolute top-1 bottom-1" style={{ left: `${left}px`, width: `${width}px` }}>
      <motion.div
        initial={animateFrom ? { x: animateFrom.x, y: animateFrom.y } : false}
        animate={{ x: 0, y: 0 }}
        transition={{ duration: 0 }}
        className="h-full"
      >
        <SubProjectBar
          ref={setNodeRef}
          subProject={subProject}
          width={width}
          isDragging={isDragging}
          onClick={onClick}
          dragHandleProps={{ ...attributes, ...listeners }}
          className="h-full"
        />
      </motion.div>
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
      className={`shrink-0 ${isOver && (subProject || isDraggingSubProject) ? 'bg-primary/10' : ''}`}
      style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
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
      className="shrink-0 px-1 py-1"
      style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH, minHeight: height }}
    >
      <LayoutGroup id={`sublane-${laneIndex}-${dateStr}`}>
        <motion.div
          className="flex flex-col gap-1 h-full"
          layout
          transition={{ duration: 0 }}
        >
          {items.map(item => (
            <div key={item.id} onClick={(e) => handleItemClick(e, item)}>
              <UnifiedItem
                item={item}
                onToggleComplete={onToggleItemComplete}
                onClick={() => { }} // We handle click in wrapper
                workspaceColor={workspaceColor}
              />
            </div>
          ))}
        </motion.div>
      </LayoutGroup>
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

export function SubProjectLane({
  subProjects,
  itemsBySubProject,
  days,
  workspaceColor,
  onToggleItemComplete,
  onItemClick,
  onSubProjectClick,
  rowHeight = 64,
  laneIndex,
  projectId
}: SubProjectLaneProps) {
  const timelineStartDate = days[0];
  const cellHeight = rowHeight - SUBPROJECT_HEADER_HEIGHT;

  return (
    <div className="relative flex flex-col min-h-[64px]">
      {/* Column dividers - full height background layer */}
      <div className="absolute inset-0 flex pointer-events-none">
        {days.map((day, index) => (
          <div
            key={day.toISOString()}
            className={`shrink-0 ${index < days.length - 1 ? 'border-r border-border' : ''}`}
            style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
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
          />
        ))}
      </div>

      {/* Items layer - rendered on top with padding to account for subproject header */}
      <div className="relative flex z-30" style={{ marginTop: SUBPROJECT_HEADER_HEIGHT }}>
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
}

// Wrapper component for all SubProject lanes - each lane has its own droppable zones
export function SubProjectSection({
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

  return (
    <motion.div
      className="relative"
      layout
      transition={{ duration: 0 }}
    >
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
        />
      ))}
    </motion.div>
  );
}
