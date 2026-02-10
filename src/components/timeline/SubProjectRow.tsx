import React from 'react';
import { SubProject, TimelineItem } from '@/types/timeline';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { format, differenceInDays, parseISO, isWithinInterval } from 'date-fns';
import { Plus } from 'lucide-react';
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
  onQuickCreate: (projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
  onQuickEdit: (item: TimelineItem | SubProject, anchorElement?: HTMLElement) => void;
  onItemClick: (id: string, multi: boolean, e: React.MouseEvent) => void;
  onItemContextMenu: (id: string, type: 'item' | 'milestone' | 'subproject', e: React.MouseEvent) => void;
  colorMode?: 'full' | 'monochromatic';
  systemAccent?: string;
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
  onQuickCreate: (projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
  onQuickEdit: (item: TimelineItem | SubProject, anchorElement?: HTMLElement) => void;
  onItemClick: (id: string, multi: boolean, e: React.MouseEvent) => void;
  onItemContextMenu: (id: string, type: 'item' | 'milestone' | 'subproject', e: React.MouseEvent) => void;
  colorMode?: 'full' | 'monochromatic';
  systemAccent?: string;
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
  onQuickEdit?: (item: SubProject, anchorElement?: HTMLElement) => void;
  onItemClick?: (id: string, multi: boolean, e: React.MouseEvent) => void;
  onItemContextMenu?: (id: string, type: 'item' | 'milestone' | 'subproject', e: React.MouseEvent) => void;
  colorMode?: 'full' | 'monochromatic';
  systemAccent?: string;
}>(({
  subProject,
  width,
  height,
  left,
  onDoubleClick,
  style,
  className,
  children,
  onQuickEdit,
  onItemClick,
  onItemContextMenu,
  colorMode,
  systemAccent
}, ref) => {
  const isSelected = useTimelineStore(state => state.selectedIds.has(subProject.id));

  const effectiveVar = colorMode === 'monochromatic'
    ? 'var(--primary)'
    : (subProject.color ? (subProject.color.startsWith('#') ? undefined : `var(--workspace-${subProject.color})`) : 'var(--primary)'); // Default fallback

  let borderColor, bgColor, headerBg;

  if (colorMode === 'monochromatic') {
    // Monochromatic overrides everything
    borderColor = `hsl(${effectiveVar} / 0.3)`;
    bgColor = `hsl(${effectiveVar} / 0.08)`;
    headerBg = `hsl(${effectiveVar} / 0.2)`;
  } else {
    // Normal mode
    if (subProject.color && subProject.color.startsWith('#')) {
      borderColor = `${subProject.color}30`;
      bgColor = `${subProject.color}08`;
      headerBg = `${subProject.color}20`;
    } else if (subProject.color) { // Workspace color index
      borderColor = `hsl(var(--workspace-${subProject.color}) / 0.3)`;
      bgColor = `hsl(var(--workspace-${subProject.color}) / 0.08)`;
      headerBg = `hsl(var(--workspace-${subProject.color}) / 0.2)`;
    } else { // Default
      borderColor = 'hsl(var(--primary) / 0.2)';
      bgColor = 'hsl(var(--primary) / 0.05)';
      headerBg = 'hsl(var(--primary) / 0.15)';
    }
  }

  // Selected Style Override
  if (isSelected) {
    borderColor = 'hsl(var(--primary))';
    headerBg = 'hsl(var(--primary) / 0.4)';
    bgColor = 'hsl(var(--primary) / 0.15)';
  }

  return (
    <div
      ref={ref}
      className={`group border border-dashed flex flex-col pointer-events-none z-10 ${className || ''}`}
      style={{
        left: left !== undefined ? `${left}px` : undefined,
        width: width !== undefined ? `${width}px` : undefined,
        height: height !== undefined ? `${height}px` : undefined,
        borderColor,
        backgroundColor: bgColor,
        ...style
      }}
    >
      {/* Header - sticky title */}
      <div className="h-6 shrink-0 w-full z-20 pointer-events-auto">
        <div
          className="sticky w-fit max-w-[250px] flex items-center h-full pl-2.5 pr-2"
          style={{
            left: 'var(--sidebar-width)',
            backgroundColor: headerBg,
          }}
        >
          {/* Title - Clickable to Edit */}
          <div
            onContextMenu={(e) => {
              if (onItemContextMenu) onItemContextMenu(subProject.id, 'subproject', e);
              else {
                e.preventDefault();
                e.stopPropagation();
                if (onQuickEdit) onQuickEdit(subProject, e.currentTarget);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onItemClick) onItemClick(subProject.id, e.ctrlKey || e.metaKey, e);
              else if (onDoubleClick) onDoubleClick(subProject);
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
  onQuickEdit,
  colorMode,
  systemAccent,
  onItemClick,
  onItemContextMenu
}: {
  subProject: SubProject;
  timelineStartDate: Date;
  totalVisibleDays: number;
  onDoubleClick: (subProject: SubProject) => void;
  onItemClick: (id: string, multi: boolean, e: React.MouseEvent) => void;
  onItemContextMenu: (id: string, type: 'item' | 'milestone' | 'subproject', e: React.MouseEvent) => void;
  colorMode?: 'full' | 'monochromatic';
  systemAccent?: string;
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
        onItemClick={onItemClick}
        onItemContextMenu={onItemContextMenu}
        className="h-full"
        colorMode={colorMode}
        systemAccent={systemAccent}
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
  onItemClick,
  onItemContextMenu,
  colorMode,
  systemAccent
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
  onItemClick: (id: string, multi: boolean, e: React.MouseEvent) => void;
  onItemContextMenu: (id: string, type: 'item' | 'milestone' | 'subproject', e: React.MouseEvent) => void;
  colorMode?: 'full' | 'monochromatic';
  systemAccent?: string;
}) {
  const dateStr = format(date, 'yyyy-MM-dd');

  return (
    <div
      className="shrink-0 px-0 py-0"
      style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH, minHeight: height }}
      onClick={(e) => activeSubProject && onQuickCreate(projectId, dateStr, activeSubProject.id, workspaceColor, e.currentTarget)}
    >
      <div className="relative w-full h-full group/cell">
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
                onClick={(multi, e) => onItemClick(item.id, multi, e)}
                onContextMenu={(e) => onItemContextMenu(item.id, 'item', e)}
                colorMode={colorMode}
                systemAccent={systemAccent}
              />
            </div>
          ))}
        </div>

        {/* Quick Add Button for SubProject */}
        {activeSubProject && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickCreate(projectId, dateStr, activeSubProject.id, workspaceColor, e.currentTarget);
            }}
            className="absolute top-1 right-1 w-5 h-5 rounded-md opacity-0 group-hover/cell:opacity-100 transition-all bg-primary/20 hover:bg-primary/40 flex items-center justify-center z-10 pointer-events-auto"
            title="Add task to subproject"
          >
            <Plus className="w-3 h-3 text-primary" strokeWidth={2.5} />
          </button>
        )}
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
  onQuickCreate,
  onQuickEdit,
  onItemClick,
  onItemContextMenu,
  colorMode,
  systemAccent
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
            onItemClick={onItemClick}
            onItemContextMenu={onItemContextMenu}
            colorMode={colorMode}
            systemAccent={systemAccent}
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
              onItemClick={onItemClick}
              onItemContextMenu={onItemContextMenu}
              colorMode={colorMode}
              systemAccent={systemAccent}
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
  onQuickCreate,
  onQuickEdit,
  onItemClick,
  onItemContextMenu,
  colorMode,
  systemAccent
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
          onQuickCreate={onQuickCreate}
          onQuickEdit={onQuickEdit}
          onItemClick={onItemClick}
          onItemContextMenu={onItemContextMenu}
          colorMode={colorMode}
          systemAccent={systemAccent}
        />
      ))}
    </div>
  );
}
