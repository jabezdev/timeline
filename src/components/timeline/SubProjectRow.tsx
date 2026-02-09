import React, { useRef, useState } from 'react';
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core';
import { SubProject, TimelineItem } from '@/types/timeline';
import { format, differenceInDays, parseISO, isWithinInterval } from 'date-fns';
import { UnifiedItem } from './UnifiedItem';
import { CELL_WIDTH, SUBPROJECT_HEADER_HEIGHT, SIDEBAR_WIDTH } from '@/lib/constants';
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
  sidebarWidth: number;
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
  sidebarWidth: number;
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
  sidebarWidth?: number;
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
  sidebarWidth = SIDEBAR_WIDTH
}, ref) => {
  return (
    <div
      ref={ref}
      className={`border border-dashed flex flex-col pointer-events-none ${isDragging ? 'opacity-30' : 'z-10'} ${className || ''}`}
      style={{
        left: left !== undefined ? `${left}px` : undefined,
        width: width !== undefined ? `${width}px` : undefined,
        height: height !== undefined ? `${height}px` : undefined,
        borderColor: subProject.color
          ? (subProject.color.startsWith('#') ? `${subProject.color}30` : `hsl(var(--workspace-${subProject.color}) / 0.3)`)
          : 'hsl(var(--primary) / 0.2)',
        backgroundColor: subProject.color
          ? (subProject.color.startsWith('#') ? `${subProject.color}08` : `hsl(var(--workspace-${subProject.color}) / 0.08)`)
          : 'hsl(var(--primary) / 0.05)',
        ...style
      }}
    >
      {/* Header - full width provides the sticky constraint range */}
      <div className="h-6 shrink-0 w-full z-20 pointer-events-auto">
        {/* Sticky title container - stays visible during horizontal scroll */}
        <div
          className="sticky w-fit max-w-[250px] flex items-center h-full pl-2.5 pr-2 gap-1.5 transition-[left]"
          style={{
            left: sidebarWidth, // Stick to the sidebar edge
            backgroundColor: subProject.color
              ? (subProject.color.startsWith('#') ? `${subProject.color}20` : `hsl(var(--workspace-${subProject.color}) / 0.2)`)
              : 'hsl(var(--primary) / 0.15)',
          }}
        >
          {/* Drag Handle */}
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
              className="w-full h-full flex items-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-sm min-w-0"
            >
              <span className="text-xs font-semibold truncate text-foreground">
                {subProject.title}
              </span>
            </div>
          </QuickEditPopover>
        </div>
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
  totalVisibleDays,
  onClick,
  rowHeight,
  sidebarWidth
}: {
  subProject: SubProject;
  timelineStartDate: Date;
  totalVisibleDays: number;
  onClick: (subProject: SubProject) => void;
  rowHeight: number;
  sidebarWidth: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: subProject.id,
    data: { type: 'subProject', item: subProject, rowHeight },
  });

  const subProjectStart = parseISO(subProject.startDate);
  const subProjectEnd = parseISO(subProject.endDate);

  const startOffsetDays = differenceInDays(subProjectStart, timelineStartDate);
  const durationDays = differenceInDays(subProjectEnd, subProjectStart) + 1;

  // Clamp to visible day range
  const rawLeft = startOffsetDays * CELL_WIDTH;
  const rawRight = rawLeft + durationDays * CELL_WIDTH;
  const maxWidth = totalVisibleDays * CELL_WIDTH;
  const left = Math.max(0, rawLeft);
  const right = Math.min(maxWidth, rawRight);
  const width = Math.max(0, right - left);

  if (width <= 0) return null;

  return (
    <div className="absolute top-0 bottom-0" style={{ left: `${left}px`, width: `${width}px` }}>
      <SubProjectBar
        ref={setNodeRef}
        subProject={subProject}
        width={width}
        isDragging={isDragging}
        onClick={onClick}
        dragHandleProps={{ ...attributes, ...listeners }}
        className="h-full"
        sidebarWidth={sidebarWidth}
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
      className="shrink-0 px-0 py-0"
      style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH, minHeight: height }}
      onClick={() => activeSubProject && setIsCreating(true)}
    >
      <div className="flex flex-col gap-0 h-full pointer-events-none">
        {items.map(item => (
          <div key={item.id} className="pointer-events-auto">
            <UnifiedItem
              item={item}
              onToggleComplete={onToggleItemComplete}
              onClick={onItemClick}
              workspaceColor={workspaceColor}
            />
          </div>
        ))}
      </div>
    </div>
  );

  if (activeSubProject && isCreating) {
    return (
      <QuickCreatePopover
        open={true}
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
  projectId,
  sidebarWidth
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
            className={`shrink-0 ${index < days.length - 1 ? 'border-r border-border/50' : ''}`}
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
            totalVisibleDays={days.length}
            onClick={onSubProjectClick}
            rowHeight={rowHeight}
            sidebarWidth={sidebarWidth}
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
  onSubProjectClick,
  sidebarWidth
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
          laneIndex={index}
          projectId={projectId}
          sidebarWidth={sidebarWidth}
        />
      ))}
    </div>
  );
}
