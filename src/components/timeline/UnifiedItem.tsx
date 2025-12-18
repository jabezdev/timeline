import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { TimelineItem } from '@/types/timeline';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface UnifiedItemProps {
  item: TimelineItem;
  onToggleComplete: (itemId: string) => void;
  onClick: (item: TimelineItem) => void;
  workspaceColor: number;
}

export function UnifiedItem({ item, onToggleComplete, onClick, workspaceColor }: UnifiedItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { type: 'item', item: item },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    backgroundColor: item.color ? `${item.color}20` : undefined, // 20 is hex for ~12% opacity
    borderColor: item.color ? `${item.color}50` : undefined,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={(e) => {
        // Prevent click when dragging
        if (!isDragging) {
          onClick(item);
        }
      }}
      className={`group relative flex items-start gap-1.5 px-2 py-1.5 rounded-md border transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 shadow-lg z-50' : ''
      } ${item.completed ? 'opacity-60 bg-secondary/30 border-border' : 'bg-secondary/50 border-border hover:border-primary/30'}`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(item.id);
        }}
        className={`w-3 h-3 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0 ${
          item.completed 
            ? 'bg-primary border-primary' 
            : 'border-muted-foreground hover:border-primary'
        }`}
        style={{
            backgroundColor: item.completed && item.color ? item.color : undefined,
            borderColor: item.color ? item.color : undefined
        }}
      >
        {item.completed && <Check className="w-2 h-2 text-white" />}
      </button>
      
      <span className={`flex-1 min-w-0 text-xs font-medium break-words whitespace-pre-wrap ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
        {item.title || "Untitled"}
      </span>
    </motion.div>
  );
}
