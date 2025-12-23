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

    <div
      ref={setNodeRef}
      className={`shrink-0 relative ${showBorder ? 'border-r border-border last:border-r-0' : ''
        } ${isOver ? 'bg-primary/10' : ''}`}
      style={{ width: cellWidth, minWidth: cellWidth, ...(rowHeight ? { minHeight: rowHeight } : {}) }}

    >
      {/* Background Trigger Layer */}
      <div className="absolute inset-0 z-0">
        <QuickCreatePopover
          open={isCreating}
          onOpenChange={setIsCreating}
          type="item"
          projectId={projectId}
          date={dateStr}
          subProjectId={subProjectId}
          defaultColor={workspaceColor}
        >
          <div className="w-full h-full cursor-cell" />
        </QuickCreatePopover>
      </div>

      {/* Content Layer - sits on top, pointer-events-none ensures clicks pass through gaps to trigger */}
      <div className="relative z-10 flex flex-col gap-1 px-1 py-1 pointer-events-none min-h-full">
        {milestones.map(milestone => (
          <div
            key={milestone.id}
            onClick={(e) => handleItemClick(e, milestone)}
            className="pointer-events-auto"
          >
            <MilestoneItem
              milestone={milestone}
              workspaceColor={workspaceColor}
            />
          </div>
        ))}

        {items.map(item => (
          <div
            key={item.id}
            onClick={(e) => handleItemClick(e, item)}
            className="pointer-events-auto"
          >
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

  );
}

