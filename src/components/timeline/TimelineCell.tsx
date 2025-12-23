import { useState } from 'react';
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
  cellWidth: number;
  rowHeight?: number;
  showBorder?: boolean;
  droppableDisabled?: boolean;
}

export function TimelineCell({
  date,
  projectId,
  subProjectId,
  laneId,
  items,
  milestones,

  workspaceColor,
  onToggleItemComplete,
  onItemClick,
  cellWidth,
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

  const handleItemClick = (e: React.MouseEvent, item: TimelineItem | Milestone) => {
    e.stopPropagation();
    onItemClick(item);
  };


  // Debug logging
  if (items.length > 0) {
    console.log(`TimelineCell [${dateStr}]: Rendering ${items.length} items`, items);
  }

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
        className={`px-1 py-1 shrink-0 ${showBorder ? 'border-r border-border last:border-r-0' : ''
          } ${isOver ? 'bg-primary/10' : ''}`}
        style={{ width: cellWidth, minWidth: cellWidth, ...(rowHeight ? { minHeight: rowHeight } : {}) }}
      >
        <div className="flex flex-col gap-1 h-full">
          {milestones.map(milestone => (
            <div key={milestone.id} onClick={(e) => handleItemClick(e, milestone)}>
              <MilestoneItem
                milestone={milestone}
                workspaceColor={workspaceColor}
              />
            </div>
          ))}

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
        </div>
      </div>
    </QuickCreatePopover>
  );
}
