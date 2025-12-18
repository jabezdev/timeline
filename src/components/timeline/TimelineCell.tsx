import { useDroppable } from '@dnd-kit/core';
import { format } from 'date-fns';
import { TimelineItem, Milestone } from '@/types/timeline';
import { UnifiedItem } from './UnifiedItem';
import { MilestoneItem } from './MilestoneItem';

interface TimelineCellProps {
  date: Date;
  projectId: string;
  subProjectId?: string;
  items: TimelineItem[];
  milestones: Milestone[];
  workspaceColor: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemClick: (item: TimelineItem | Milestone) => void;
  cellWidth: number;
}

export function TimelineCell({ 
  date, 
  projectId,
  subProjectId,
  items,
  milestones,
  workspaceColor, 
  onToggleItemComplete,
  onItemClick,
  cellWidth 
}: TimelineCellProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  const { setNodeRef, isOver } = useDroppable({
    id: `${projectId}-${subProjectId || 'main'}-${dateStr}`,
    data: { projectId: projectId, date: dateStr, subProjectId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[40px] px-1 py-1 border-r border-border last:border-r-0 transition-colors shrink-0 ${
        isOver ? 'bg-primary/10' : ''
      }`}
      style={{ width: cellWidth, minWidth: cellWidth }}
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
