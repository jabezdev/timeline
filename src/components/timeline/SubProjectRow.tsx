import React from 'react';
import { SubProject, TimelineItem } from '@/types/timeline';
import { format, differenceInDays, parseISO, isWithinInterval } from 'date-fns';
import { UnifiedItem } from './UnifiedItem';
import { CELL_WIDTH, SUBPROJECT_HEADER_HEIGHT, SIDEBAR_WIDTH } from '@/lib/constants';

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
  selectedIds: Set<string>;
  onItemClick: (id: string, multi: boolean) => void;
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
  selectedIds: Set<string>;
  onItemClick: (id: string, multi: boolean) => void;
}

export const SubProjectBar = React.forwardRef<HTMLDivElement, {
  subProject: SubProject;
  width?: number;
  height?: number;
  left?: number;
  onDoubleClick?: (subProject: SubProject) => void;
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
  onDoubleClick,
  style,
  className,
  children,
  sidebarWidth = SIDEBAR_WIDTH,
  onQuickEdit
}, ref) => {

  return (
    <div
      ref={ref}
      className={`group border border-dashed flex flex-col pointer-events-none z-10 ${className || ''}`}
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
      {/* Header - sticky title */}
      <div className="h-6 shrink-0 w-full z-20 pointer-events-auto">
        {/* Sticky title container - stays visible during horizontal scroll */}
        <div
          className="sticky w-fit max-w-[250px] flex items-center h-full pl-2.5 pr-2"
          style={{
            left: 'var(--sidebar-width)',
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
              if (onDoubleClick) {
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

// Static SubProject bar (no drag, just positioning and click handlers)
function StaticSubProjectBar({
  subProject,
  timelineStartDate,
  totalVisibleDays,
  onDoubleClick,
  sidebarWidth,
  onQuickEdit
}: {
  subProject: SubProject;
  timelineStartDate: Date;
  totalVisibleDays: number;
  onDoubleClick: (subProject: SubProject) => void;
  sidebarWidth: number;
  onQuickEdit: (item: SubProject, anchorElement?: HTMLElement) => void;
}) {
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
        subProject={subProject}
        width={width}
        onDoubleClick={onDoubleClick}
        onQuickEdit={onQuickEdit}
        className="h-full"
        sidebarWidth={sidebarWidth}
      />
    </div>
  );
}

function SubProjectCell({
  date,
  projectId,
  activeSubProject,
  items,
  workspaceColor,
  onToggleItemComplete,
  onItemDoubleClick,
  height,
  onQuickCreate,
  onQuickEdit,
  selectedIds,
  onItemClick
}: {
  date: Date;
  projectId: string;
  activeSubProject: SubProject | undefined;
  items: TimelineItem[];
  workspaceColor: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemDoubleClick: (item: TimelineItem) => void;
  height: number;
  onQuickCreate: (projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
  onQuickEdit: (item: TimelineItem | SubProject, anchorElement?: HTMLElement) => void;
  selectedIds: Set<string>;
  onItemClick: (id: string, multi: boolean) => void;
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
              isSelected={selectedIds.has(item.id)}
              onClick={(multi: boolean) => onItemClick(item.id, multi)}
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
  onQuickEdit,
  selectedIds,
  onItemClick
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

      {/* SubProject Bars - visual layer */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {subProjects.map(sub => (
          <StaticSubProjectBar
            key={sub.id}
            subProject={sub}
            timelineStartDate={timelineStartDate}
            totalVisibleDays={days.length}
            onDoubleClick={onSubProjectDoubleClick}
            onQuickEdit={onQuickEdit}
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
              activeSubProject={activeSubProject}
              items={items}
              workspaceColor={workspaceColor}
              onToggleItemComplete={onToggleItemComplete}
              onItemDoubleClick={onItemDoubleClick}
              height={cellHeight}
              onQuickCreate={onQuickCreate}
              onQuickEdit={onQuickEdit}
              selectedIds={selectedIds}
              onItemClick={onItemClick}
            />
          );
        })}
      </div>
    </div>
  );
}

// Wrapper component for all SubProject lanes
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
  onQuickEdit,
  selectedIds,
  onItemClick
}: SubProjectSectionProps) {
  if (subProjectLanes.length === 0) return null;

  return (
    <div className="relative">
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
          selectedIds={selectedIds}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
}
