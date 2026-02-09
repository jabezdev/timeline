import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
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
  droppableDisabled?: boolean;
  onQuickCreate: (projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
  onQuickEdit: (item: TimelineItem | Milestone, anchorElement?: HTMLElement) => void;
}

export const TimelineCell = React.memo(function TimelineCell({
  date,
  projectId,
  subProjectId,
  laneId,
  items,
  milestones,

  workspaceColor,
  onToggleItemComplete,
  onItemDoubleClick,
  cellWidth,
  rowHeight = 40,
  showBorder = true,
  droppableDisabled = false,
  onQuickCreate,
  onQuickEdit
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

  const content = (
    <div className="flex flex-col gap-0 h-full pointer-events-none">
      <SortableContext items={milestones.map(m => m.id)} strategy={verticalListSortingStrategy}>
        {milestones.map(milestone => (
          <div key={milestone.id} className="pointer-events-auto">
            <MilestoneItem
              milestone={milestone}
              workspaceColor={workspaceColor}
              onDoubleClick={onItemDoubleClick}
              onQuickEdit={onQuickEdit}
              minHeight={rowHeight}
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
              onDoubleClick={onItemDoubleClick}
              onQuickEdit={onQuickEdit}
              workspaceColor={workspaceColor}
              minHeight={rowHeight}
            />
          </div>
        ))}
      </SortableContext>
    </div>
  );

  const containerClass = `relative px-0 py-0 shrink-0 group ${showBorder ? 'border-r border-border/50 last:border-r-0' : ''} ${isOver ? 'bg-primary/10' : ''}`;
  const containerStyle = { width: cellWidth, minWidth: cellWidth, ...(rowHeight ? { minHeight: rowHeight } : {}) };

  return (
    <div
      ref={setNodeRef}
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
