import React from 'react';
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core';
import { SubProject, TimelineItem } from '@/types/timeline';
import { format, differenceInDays, parseISO, isWithinInterval } from 'date-fns';
import { UnifiedItem } from './UnifiedItem';
import { CELL_WIDTH } from './TimelineHeader';
import { GripVertical } from 'lucide-react';
import { SUBPROJECT_HEADER_HEIGHT } from '@/lib/timelineUtils';

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
  subProjectRowHeights: number[];
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
    left?: number;
    isDragging?: boolean;
    onClick?: (subProject: SubProject) => void;
    dragHandleProps?: any;
    style?: React.CSSProperties;
    className?: string;
}>(({
    subProject,
    width,
    left,
    isDragging,
    onClick,
    dragHandleProps,
    style,
    className
}, ref) => {
    return (
        <div 
            ref={ref}
            className={`rounded-md border border-dashed transition-colors flex flex-col pointer-events-none ${isDragging ? 'opacity-30' : 'z-10'} ${className || ''}`}
            style={{
                left: left !== undefined ? `${left}px` : undefined,
                width: width !== undefined ? `${width}px` : undefined,
                borderColor: subProject.color ? `${subProject.color}50` : 'hsl(var(--primary) / 0.2)',
                backgroundColor: subProject.color ? `${subProject.color}10` : 'hsl(var(--primary) / 0.05)',
                ...style
            }}
        >
            {/* Header with Drag Handle and Title */}
            <div className="h-6 shrink-0 w-full flex items-center rounded-t-md z-20 pointer-events-auto"
            >
                {/* Drag Handle - Left */}
                <div 
                    {...dragHandleProps}
                    className="h-full px-1.5 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-black/10 dark:hover:bg-white/10 rounded-tl-md transition-colors"
                >
                    <GripVertical className="w-3.5 h-3.5 opacity-50" />
                </div>

                {/* Title - Clickable to Edit */}
                <div 
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isDragging && onClick) {
                            onClick(subProject);
                        }
                    }}
                    className="flex-1 h-full flex items-center px-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-tr-md min-w-0 transition-colors"
                >
                    <span 
                        className="text-xs font-medium truncate"
                        style={{ color: subProject.color || 'hsl(var(--primary) / 0.7)' }}
                    >
                        {subProject.title}
                    </span>
                </div>
            </div>

            {/* Content area - Pass through clicks */}
            <div className="flex-1 rounded-b-md overflow-hidden pointer-events-none" />
        </div>
    );
});

function DraggableSubProjectBar({ 
    subProject, 
    timelineStartDate,
    onClick
}: { 
    subProject: SubProject; 
    timelineStartDate: Date;
    onClick: (subProject: SubProject) => void;
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: subProject.id,
        data: { type: 'subProject', item: subProject },
    });

    const subProjectStart = parseISO(subProject.startDate);
    const subProjectEnd = parseISO(subProject.endDate);
    
    const startOffsetDays = differenceInDays(subProjectStart, timelineStartDate);
    const durationDays = differenceInDays(subProjectEnd, subProjectStart) + 1;

    const left = startOffsetDays * CELL_WIDTH;
    const width = durationDays * CELL_WIDTH;

    return (
        <SubProjectBar
            ref={setNodeRef}
            subProject={subProject}
            left={left}
            width={width}
            isDragging={isDragging}
            onClick={onClick}
            dragHandleProps={{ ...attributes, ...listeners }}
            className="absolute top-1 bottom-1"
        />
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
      className={`shrink-0 transition-colors ${isOver && (subProject || isDraggingSubProject) ? 'bg-primary/10' : ''}`}
      style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH, minHeight: rowHeight }}
    />
  );
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
    <div className="relative flex flex-col" style={{ minHeight: rowHeight }}>
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
            <div
              key={day.toISOString()}
              className="shrink-0 px-1 py-1"
              style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH, minHeight: cellHeight }}
            >
              <div className="flex flex-col gap-1">
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
        })}
      </div>
    </div>
  );
}

// Wrapper component for all SubProject lanes - each lane has its own droppable zones
export function SubProjectSection({
  projectId,
  subProjectLanes,
  subProjectRowHeights,
  itemsBySubProject,
  days,
  workspaceColor,
  onToggleItemComplete,
  onItemClick,
  onSubProjectClick
}: SubProjectSectionProps) {
  if (subProjectLanes.length === 0) return null;

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
          rowHeight={subProjectRowHeights[index]}
          laneIndex={index}
          projectId={projectId}
        />
      ))}
    </div>
  );
}
