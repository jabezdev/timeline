import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
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
        className={`px-1 py-1 shrink-0 ${showBorder ? 'border-r border-border/50 last:border-r-0' : ''
          } ${isOver ? 'bg-primary/10' : ''}`}
        style={{ width: cellWidth, minWidth: cellWidth, ...(rowHeight ? { minHeight: rowHeight } : {}) }}
      >
        <div className="flex flex-col gap-1 h-full">
          <SortableContext items={milestones.map(m => m.id)} strategy={verticalListSortingStrategy}>
            {milestones.map(milestone => (
              <MilestoneItem
                key={milestone.id}
                milestone={milestone}
                workspaceColor={workspaceColor}
                onClick={onItemClick}
              />
            ))}
          </SortableContext>

          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {items.map(item => (
              <UnifiedItem
                key={item.id}
                item={item}
                onToggleComplete={onToggleItemComplete}
                onClick={onItemClick}
                workspaceColor={workspaceColor}
              />
            ))}
          </SortableContext>
        </div>
      </div>
    </QuickCreatePopover>

  );
}
