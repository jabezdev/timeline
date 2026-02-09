import React, { useRef, useState } from 'react';
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core';
import { SubProject, TimelineItem } from '@/types/timeline';
import { format, differenceInDays, parseISO, isWithinInterval } from 'date-fns';
import { UnifiedItem } from './UnifiedItem';
import { CELL_WIDTH, SUBPROJECT_HEADER_HEIGHT, SIDEBAR_WIDTH } from '@/lib/constants';
import { GripVertical } from 'lucide-react';

interface SubProjectLaneProps {
  subProjects: SubProject[];
  itemsBySubProject: Map<string, Map<string, TimelineItem[]>>;
  days: Date[];
  workspaceColor: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemDoubleClick: (item: TimelineItem) => void;
  onSubProjectDoubleClick: (subProject: SubProject) => void;
  rowHeight?: number;
  laneIndex: number;
  projectId: string;
  sidebarWidth: number;
  onQuickCreate: (projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
  onQuickEdit: (item: TimelineItem | SubProject, anchorElement?: HTMLElement) => void;
}

interface SubProjectSectionProps {
  projectId: string;
  subProjectLanes: SubProject[][];
  itemsBySubProject: Map<string, Map<string, TimelineItem[]>>;
  days: Date[];
  workspaceColor: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemDoubleClick: (item: TimelineItem) => void;
  onSubProjectDoubleClick: (subProject: SubProject) => void;
  sidebarWidth: number;
  onQuickCreate: (projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
  onQuickEdit: (item: TimelineItem | SubProject, anchorElement?: HTMLElement) => void;
}

// Drop `QuickEditPopover` and `QuickCreatePopover` imports if not used elsewhere in this file.
// Wait, they are used? No, I am replacing them.
// So I should remove imports at the top. But I can't do that in this block easily if it's far away. The tool allows multi-replace but I am using single replace for the whole bottom section.

export const SubProjectBar = React.forwardRef<HTMLDivElement, {
  subProject: SubProject;
  width?: number;
  height?: number;
  left?: number;
  isDragging?: boolean;
  onDoubleClick?: (subProject: SubProject) => void;
  dragHandleProps?: any;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  sidebarWidth?: number;
  onQuickEdit?: (item: SubProject, anchorElement?: HTMLElement) => void;
}>(({
  subProject,
  width,
  height,
  left,
  isDragging,
  onDoubleClick,
  dragHandleProps,
  style,
  className,
  children,
  sidebarWidth = SIDEBAR_WIDTH,
  onQuickEdit
}, ref) => {

  return (
    <div
      ref={ref}
      className={`group border border-dashed flex flex-col pointer-events-none ${isDragging ? 'opacity-30' : 'z-10'} ${className || ''}`}
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
      {/* Left drag handle - full height, absolute positioned */}
      <div
        {...dragHandleProps}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto z-30"
        style={{
          backgroundColor: subProject.color
            ? (subProject.color.startsWith('#') ? `${subProject.color}80` : `hsl(var(--workspace-${subProject.color}) / 0.8)`)
            : 'hsl(var(--primary) / 0.8)',
        }}
      />

      {/* Header - sticky title */}
      <div className="h-6 shrink-0 w-full z-20 pointer-events-auto">
        {/* Sticky title container - stays visible during horizontal scroll */}
        <div
          className="sticky w-fit max-w-[250px] flex items-center h-full pl-2.5 pr-2"
          style={{
            left: 'var(--sidebar-width)', // Stick to the sidebar edge
            backgroundColor: subProject.color
              ? (subProject.color.startsWith('#') ? `${subProject.color}20` : `hsl(var(--workspace-${subProject.color}) / 0.2)`)
              : 'hsl(var(--primary) / 0.15)',
          }}
        >
          {/* Title - Clickable to Edit */}
          <div
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onQuickEdit) onQuickEdit(subProject, e.currentTarget);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isDragging && onDoubleClick) {
                onDoubleClick(subProject);
              }
            }}
            className="flex-1 min-w-0 flex items-center h-full cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-sm px-1.5"
          >
            <span className="text-xs font-semibold truncate text-foreground">
              {subProject.title}
            </span>
          </div>
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
  onDoubleClick,
  rowHeight,
  sidebarWidth,
  onQuickEdit
}: {
  subProject: SubProject;
  timelineStartDate: Date;
  totalVisibleDays: number;
  onDoubleClick: (subProject: SubProject) => void;
  rowHeight: number;
  sidebarWidth: number;
  onQuickEdit: (item: SubProject, anchorElement?: HTMLElement) => void;
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
        onDoubleClick={onDoubleClick}
        onQuickEdit={onQuickEdit}
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
  onItemDoubleClick,
  height,
  onQuickCreate,
  onQuickEdit
}: {
  date: Date;
  projectId: string;
  laneIndex: number;
  activeSubProject: SubProject | undefined;
  items: TimelineItem[];
  workspaceColor: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemDoubleClick: (item: TimelineItem) => void;
  height: number;
  onQuickCreate: (projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
  onQuickEdit: (item: TimelineItem | SubProject, anchorElement?: HTMLElement) => void;
}) {
  const dateStr = format(date, 'yyyy-MM-dd');

  return (
    <div
      className="shrink-0 px-0 py-0"
      style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH, minHeight: height }}
      onClick={(e) => activeSubProject && onQuickCreate(projectId, dateStr, activeSubProject.id, workspaceColor, e.currentTarget)}
    >
      <div className="flex flex-col gap-0 h-full pointer-events-none">
        {items.map(item => (
          <div key={item.id} className="pointer-events-auto">
            <UnifiedItem
              item={item}
              onToggleComplete={onToggleItemComplete}
              onDoubleClick={onItemDoubleClick}
              onQuickEdit={onQuickEdit}
              workspaceColor={workspaceColor}
              minHeight={height}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SubProjectLane({
  subProjects,
  itemsBySubProject,
  days,
  workspaceColor,
  onToggleItemComplete,
  onItemDoubleClick,
  onSubProjectDoubleClick,
  rowHeight = 64,
  laneIndex,
  projectId,
  sidebarWidth,
  onQuickCreate,
  onQuickEdit
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
            onDoubleClick={onSubProjectDoubleClick}
            onQuickEdit={onQuickEdit}
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
              onItemDoubleClick={onItemDoubleClick}
              height={cellHeight}
              onQuickCreate={onQuickCreate}
              onQuickEdit={onQuickEdit}
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
  onItemDoubleClick,
  onSubProjectDoubleClick,
  sidebarWidth,
  onQuickCreate,
  onQuickEdit
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
          onItemDoubleClick={onItemDoubleClick}
          onSubProjectDoubleClick={onSubProjectDoubleClick}
          laneIndex={index}
          projectId={projectId}
          sidebarWidth={sidebarWidth}
          onQuickCreate={onQuickCreate}
          onQuickEdit={onQuickEdit}
        />
      ))}
    </div>
  );
}
