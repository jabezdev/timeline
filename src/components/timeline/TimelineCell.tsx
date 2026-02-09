import React from 'react';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { TimelineItem, Milestone } from '@/types/timeline';
import { UnifiedItem } from './UnifiedItem';
import { MilestoneItem } from './MilestoneItem';

interface TimelineCellProps {
  date: Date;
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
  onQuickCreate: (projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
  onQuickEdit: (item: TimelineItem | Milestone, anchorElement?: HTMLElement) => void;
  selectedIds: Set<string>;
  onItemClick: (id: string, multi: boolean) => void;
}

export const TimelineCell = React.memo(function TimelineCell({
  date,
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
  selectedIds,
  onItemClick
}: TimelineCellProps) {
  const dateStr = format(date, 'yyyy-MM-dd');

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
            isSelected={selectedIds.has(milestone.id)}
            onClick={(multi: boolean) => onItemClick(milestone.id, multi)}
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
            isSelected={selectedIds.has(item.id)}
            onClick={(item) => onItemClick(item.id, false)} // UnifiedItem uses a different signature for onClick? Need to check
          />
        </div>
      ))}
    </div>
  );

  const containerClass = `relative px-0 py-0 shrink-0 group ${showBorder ? 'border-r border-border/50 last:border-r-0' : ''}`;
  const containerStyle = { width: cellWidth, minWidth: cellWidth, ...(rowHeight ? { minHeight: rowHeight } : {}) };

  return (
    <div
      className={containerClass}
      style={containerStyle}
    >
      {content}

      {/* Floating Quick Create Button - always available on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onQuickCreate(projectId, dateStr, subProjectId, workspaceColor, e.currentTarget);
        }}
        className="absolute top-1 right-1 w-5 h-5 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 hover:bg-primary/20 flex items-center justify-center z-10"
        title="Add task"
      >
        <Plus className="w-3 h-3 text-primary" />
      </button>
    </div>
  );
});
