import React from 'react';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { TimelineItem, Milestone } from '@/types/timeline';
import { UnifiedItem } from './UnifiedItem';
import { MilestoneItem } from './MilestoneItem';

interface TimelineCellProps {
  date: Date;
  dateStr: string;
  projectId: string;
  subProjectId?: string;
  laneId?: string;
  items: TimelineItem[];
  milestones: Milestone[];
  workspaceColor: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemDoubleClick: (item: TimelineItem | Milestone) => void;
  cellWidth: number;
  rowHeight?: number;
  showBorder?: boolean;
  onQuickCreate: (type: 'item' | 'milestone', projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
  onQuickEdit: (item: TimelineItem | Milestone, anchorElement?: HTMLElement) => void;
  onItemClick: (id: string, multi: boolean, e: React.MouseEvent) => void;
  onItemDragSelectStart: (id: string, type: 'item' | 'milestone' | 'subproject', e: React.MouseEvent) => void;
  onItemDragSelectEnter: (id: string, type: 'item' | 'milestone' | 'subproject') => void;
  onItemContextMenu: (id: string, type: 'item' | 'milestone' | 'subproject', e: React.MouseEvent) => void;
  colorMode?: 'full' | 'monochromatic';
  systemAccent?: string;
}

export const TimelineCell = React.memo(function TimelineCell({
  date,
  dateStr,
  projectId,
  subProjectId,
  items,
  milestones,
  workspaceColor,
  onToggleItemComplete,
  onItemDoubleClick,
  cellWidth,
  rowHeight = 40,
  showBorder = true,
  onQuickCreate,
  onQuickEdit,
  onItemClick,
  onItemDragSelectStart,
  onItemDragSelectEnter,
  onItemContextMenu,
  colorMode,
  systemAccent
}: TimelineCellProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const content = (
    <div className="flex flex-col gap-0 h-full pointer-events-none">
      {milestones.map(milestone => (
        <div key={milestone.id} className="pointer-events-auto">
          <MilestoneItem
            milestone={milestone}
            workspaceColor={workspaceColor}
            onDoubleClick={onItemDoubleClick}
            onQuickEdit={onQuickEdit}
            minHeight={rowHeight}
            onClick={(multi, e) => onItemClick(milestone.id, multi, e)}
            onDragSelectStart={(e) => onItemDragSelectStart(milestone.id, 'milestone', e)}
            onDragSelectEnter={() => onItemDragSelectEnter(milestone.id, 'milestone')}
            onContextMenu={(e) => onItemContextMenu(milestone.id, 'milestone', e)}
            colorMode={colorMode}
            systemAccent={systemAccent}
          />
        </div>
      ))}

      {items.map(item => (
        <div key={item.id} className="pointer-events-auto">
          <UnifiedItem
            item={item}
            onToggleComplete={onToggleItemComplete}
            onDoubleClick={onItemDoubleClick}
            onQuickEdit={onQuickEdit}
            workspaceColor={workspaceColor}
            minHeight={rowHeight}
            onClick={(multi, e) => onItemClick(item.id, multi, e)}
            onDragSelectStart={(e) => onItemDragSelectStart(item.id, 'item', e)}
            onDragSelectEnter={() => onItemDragSelectEnter(item.id, 'item')}
            onContextMenu={(e) => onItemContextMenu(item.id, 'item', e)}
            colorMode={colorMode}
            systemAccent={systemAccent}
          />
        </div>
      ))}
    </div>
  );

  const containerClass = `relative px-0 py-0 shrink-0 group ${showBorder ? 'border-r border-border/50 last:border-r-0' : ''}`;
  const containerStyle = { width: cellWidth, minWidth: cellWidth, ...(rowHeight ? { minHeight: rowHeight } : {}) };

  return (
    <div
      ref={containerRef}
      className={containerClass}
      style={containerStyle}
    >
      {content}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onQuickCreate('item', projectId, dateStr, subProjectId, workspaceColor, containerRef.current || e.currentTarget);
        }}
        className="absolute top-1 right-1 w-5 h-5 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 hover:bg-primary/20 flex items-center justify-center z-10"
        title="Add task"
      >
        <Plus className="w-3 h-3 text-primary" />
      </button>
    </div>
  );
});
