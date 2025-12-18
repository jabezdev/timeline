import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Milestone } from '@/types/timeline';
import { Flag } from 'lucide-react';
import { motion } from 'framer-motion';

interface MilestoneItemProps {
  milestone: Milestone;
  workspaceColor: number;
  onClick?: (milestone: Milestone) => void;
}

export function MilestoneItem({ milestone, workspaceColor, onClick }: MilestoneItemProps) {
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
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={(e) => {
        if (!isDragging && onClick) {
          e.stopPropagation();
          onClick(milestone);
        }
      }}
      className={`group relative flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-milestone/15 border border-milestone/30 hover:border-milestone/50 transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 shadow-lg z-50' : ''
      }`}
    >
      <Flag className="w-3 h-3 text-milestone shrink-0" />
      
      <span className="text-xs font-medium text-milestone truncate">
        {milestone.title}
      </span>
    </motion.div>
  );
}
