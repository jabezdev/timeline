import { useDraggable } from '@dnd-kit/core';
import { TimelineItem } from '@/types/timeline';
import { Check } from 'lucide-react';

interface UnifiedItemProps {
  item: TimelineItem;
  onToggleComplete: (itemId: string) => void;
  onClick: (item: TimelineItem) => void;
  workspaceColor: number;
}

export function UnifiedItemView({
    item,
    onToggleComplete,
    onClick,
    isDragging,
    dragHandleProps,
    style,
    className
}: {
    item: TimelineItem;
    onToggleComplete?: (itemId: string) => void;
    onClick?: (item: TimelineItem) => void;
    isDragging?: boolean;
    dragHandleProps?: any;
    style?: React.CSSProperties;
    className?: string;
}) {
    return (
        <div
            style={{
                backgroundColor: item.color ? `${item.color}20` : undefined,
                borderColor: item.color ? `${item.color}50` : undefined,
                ...style
            }}
            {...dragHandleProps}
            onClick={(e) => {
                if (!isDragging && onClick) {
                    onClick(item);
                }
            }}
            className={`group relative flex items-start gap-1.5 px-2 py-1.5 rounded-md border transition-all cursor-grab active:cursor-grabbing ${
                isDragging ? 'opacity-30' : ''
            } ${item.completed ? 'opacity-60 bg-secondary/30 border-border' : 'bg-secondary/50 border-border hover:border-primary/30'} ${className || ''}`}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleComplete) onToggleComplete(item.id);
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
        </div>
    );
}

export function UnifiedItem({ item, onToggleComplete, onClick, workspaceColor }: UnifiedItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { type: 'item', item: item },
  });

  return (
    <div ref={setNodeRef}>
        <UnifiedItemView 
            item={item}
            onToggleComplete={onToggleComplete}
            onClick={onClick}
            isDragging={isDragging}
            dragHandleProps={{ ...attributes, ...listeners }}
        />
    </div>
  );
}
