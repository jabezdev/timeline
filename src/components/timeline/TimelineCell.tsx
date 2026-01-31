import { useState, memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { format } from 'date-fns';
import { TimelineItem, Milestone } from '@/types/timeline';
import { UnifiedItem } from './UnifiedItem';
import { MilestoneItem } from './MilestoneItem';
import { QuickCreatePopover } from './QuickCreatePopover';

interface TimelineCellProps {
  date: Date;
  projectId: string;
  subProjectId?: string;
  laneId?: string;
  items: TimelineItem[];
  milestones: Milestone[];
  workspaceColor: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemClick: (item: TimelineItem | Milestone) => void;
  rowHeight?: number;
  showBorder?: boolean;
  droppableDisabled?: boolean;
}

// Memoized TimelineCell - SortableContext is now at ProjectRow level for better performance
export const TimelineCell = memo(function TimelineCell({
  date,
  projectId,
  subProjectId,
  laneId,
  items,
  milestones,

  workspaceColor,
  onToggleItemComplete,
  onItemClick,
  rowHeight = 40,
  showBorder = true,
  droppableDisabled = false
}: TimelineCellProps) {
  const [isCreating, setIsCreating] = useState(false);
  const dateStr = format(date, 'yyyy-MM-dd');
  // Use laneId for unique droppable ID, but only pass subProjectId in data for drop handling
  const droppableId = laneId
    ? `${projectId}-${laneId}-${dateStr}`
    : `${projectId}-${subProjectId || 'main'}-${dateStr}`;

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { projectId: projectId, date: dateStr, subProjectId },
    disabled: droppableDisabled,
  });

  return (
    <QuickCreatePopover
      open={isCreating}
      onOpenChange={setIsCreating}
      type="item"
      projectId={projectId}
      date={dateStr}
      subProjectId={subProjectId}
      defaultColor={workspaceColor}
    >
      <div
        ref={setNodeRef}
        className={`flex-1 min-w-0 px-1 py-1 ${showBorder ? 'border-r border-border/50 last:border-r-0' : ''
          } ${isOver ? 'bg-primary/10' : ''}`}
        style={rowHeight ? { minHeight: rowHeight } : {}}
      >
        <div className="flex flex-col gap-1 h-full">
          {/* Milestones - no individual SortableContext needed */}
          {milestones.map(milestone => (
            <MilestoneItem
              key={milestone.id}
              milestone={milestone}
              workspaceColor={workspaceColor}
              onClick={onItemClick}
            />
          ))}

          {/* Items - no individual SortableContext needed */}
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
    </QuickCreatePopover>
  );
});
