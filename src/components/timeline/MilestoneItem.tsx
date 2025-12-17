import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Milestone } from '@/types/timeline';
import { Flag, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';

interface MilestoneItemProps {
  milestone: Milestone;
  workspaceColor: number;
}

export function MilestoneItem({ milestone, workspaceColor }: MilestoneItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: milestone.id,
    data: { type: 'milestone', item: milestone },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg bg-milestone/15 border border-milestone/30 hover:border-milestone/50 transition-all ${
        isDragging ? 'opacity-50 shadow-lg z-50' : ''
      }`}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="drag-handle opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      
      <Flag className="w-4 h-4 text-milestone shrink-0" />
      
      <span className="text-sm font-medium text-milestone truncate">
        {milestone.title}
      </span>
    </motion.div>
  );
}
