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

  const content = (
    <div className="flex flex-col gap-0 h-full pointer-events-none">
      <SortableContext items={milestones.map(m => m.id)} strategy={verticalListSortingStrategy}>
        {milestones.map(milestone => (
          <div key={milestone.id} className="pointer-events-auto">
            <MilestoneItem
              milestone={milestone}
              workspaceColor={workspaceColor}
              onClick={onItemClick}
            />
          </div>
        ))}
      </SortableContext>

      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        {items.map(item => (
          <div key={item.id} className="pointer-events-auto">
            <UnifiedItem
              item={item}
              onToggleComplete={onToggleItemComplete}
              onClick={onItemClick}
              workspaceColor={workspaceColor}
            />
          </div>
        ))}
      </SortableContext>
    </div>
  );

  const containerClass = `px-0 py-0 shrink-0 ${showBorder ? 'border-r border-border/50 last:border-r-0' : ''} ${isOver ? 'bg-primary/10' : ''}`;
  const containerStyle = { width: cellWidth, minWidth: cellWidth, ...(rowHeight ? { minHeight: rowHeight } : {}) };

  if (isCreating) {
    return (
      <QuickCreatePopover
        open={true}
        onOpenChange={setIsCreating}
        type="item"
        projectId={projectId}
        date={dateStr}
        subProjectId={subProjectId}
        defaultColor={workspaceColor}
      >
        <div ref={setNodeRef} className={containerClass} style={containerStyle}>
          {content}
        </div>
      </QuickCreatePopover>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={containerClass}
      style={containerStyle}
      onClick={() => setIsCreating(true)}
    >
      {content}
    </div>
  );
}
