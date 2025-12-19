import { useDraggable } from '@dnd-kit/core';
import { Milestone } from '@/types/timeline';
import { Flag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRef, useLayoutEffect, useState } from 'react';
import { useDropAnimation } from './DropAnimationContext';

interface MilestoneItemProps {
  milestone: Milestone;
  workspaceColor: number;
  onClick?: (milestone: Milestone) => void;
}

export function MilestoneItemView({
    milestone,
    onClick,
    isDragging,
    dragHandleProps,
    style,
    className
}: {
    milestone: Milestone;
    onClick?: (milestone: Milestone) => void;
    isDragging?: boolean;
    dragHandleProps?: any;
    style?: React.CSSProperties;
    className?: string;
}) {
    return (
        <div
            style={style}
            {...dragHandleProps}
            onClick={(e) => {
                if (!isDragging && onClick) {
                    e.stopPropagation();
                    onClick(milestone);
                }
            }}
            className={`group relative flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-milestone/15 border border-milestone/30 hover:border-milestone/50 transition-all cursor-grab active:cursor-grabbing ${
                isDragging ? 'opacity-30' : ''
            } ${className || ''}`}
        >
            <Flag className="w-3 h-3 text-milestone shrink-0" />
            
            <span className="text-xs font-medium text-milestone truncate">
                {milestone.title}
            </span>
        </div>
    );
}

export function MilestoneItem({ milestone, workspaceColor, onClick }: MilestoneItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: milestone.id,
    data: { type: 'milestone', item: milestone },
  });

  const { consumeDropInfo } = useDropAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [animateFrom, setAnimateFrom] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const dropInfo = consumeDropInfo(milestone.id);
    if (dropInfo && containerRef.current) {
      const currentRect = containerRef.current.getBoundingClientRect();
      const offsetX = dropInfo.rect.left - currentRect.left;
      const offsetY = dropInfo.rect.top - currentRect.top;
      setAnimateFrom({ x: offsetX, y: offsetY });
      // Clear the animation state after it completes
      const timer = setTimeout(() => setAnimateFrom(null), 200);
      return () => clearTimeout(timer);
    }
  }, [milestone.id, milestone.date, consumeDropInfo]);

  return (
    <div ref={containerRef}>
      <motion.div 
          ref={setNodeRef}
          initial={animateFrom ? { x: animateFrom.x, y: animateFrom.y } : false}
          animate={{ x: 0, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
      >
          <MilestoneItemView
              milestone={milestone}
              onClick={onClick}
              isDragging={isDragging}
              dragHandleProps={{ ...attributes, ...listeners }}
          />
      </motion.div>
    </div>
  );
}

