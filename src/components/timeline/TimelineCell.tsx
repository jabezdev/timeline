import { useDroppable } from '@dnd-kit/core';
import { format } from 'date-fns';
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
    <div
      ref={setNodeRef}
      className={`px-1 py-1 transition-colors shrink-0 ${
        showBorder ? 'border-r border-border last:border-r-0' : ''
      } ${isOver ? 'bg-primary/10' : ''}`}
      style={{ width: cellWidth, minWidth: cellWidth, minHeight: rowHeight }}
    >
      <div className="flex flex-col gap-1">
        {milestones.map(milestone => (
          <MilestoneItem
            key={milestone.id} 
            milestone={milestone}
            workspaceColor={workspaceColor}
          />
        ))}
        
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
}
