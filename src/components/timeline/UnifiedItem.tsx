import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TimelineItem } from '@/types/timeline';
import { Check } from 'lucide-react';
import { QuickEditPopover } from './QuickEditPopover';

interface UnifiedItemProps {
    item: TimelineItem;
    onToggleComplete: (itemId: string) => void;
    onClick: (item: TimelineItem) => void;
    workspaceColor: number;
}

import { motion } from 'framer-motion';

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
        <motion.div
            layout // Enable Framer Motion layout animations
            layoutId={item.id} // Unique ID for reparenting
            transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
                mass: 1 // Quick snappy spring
            }}
            initial={false} // Prevent initial mount animation
            style={{
                backgroundColor: item.color
                    ? (item.color.startsWith('#') ? `${item.color}20` : `hsl(var(--workspace-${item.color}) / 0.2)`)
                    : undefined,
                borderColor: item.color
                    ? (item.color.startsWith('#') ? `${item.color}50` : `hsl(var(--workspace-${item.color}) / 0.5)`)
                    : undefined,
                ...style
            }}
            {...dragHandleProps}
            onClick={(e) => {
                if (!isDragging && onClick) {
                    onClick(item);
                }
            }}
            className={`group relative flex items-start gap-1.5 px-2 py-1.5 rounded-sm border cursor-grab active:cursor-grabbing touch-none ${isDragging ? 'opacity-30' : ''
                } ${item.completed ? 'opacity-60 bg-secondary/30 border-border' : 'bg-secondary/50 border-border hover:border-primary/30'} ${className || ''}`}

        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleComplete) onToggleComplete(item.id);
                }}
                className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all shrink-0 ${item.completed
                    ? 'bg-primary border-primary'
                    : 'border-muted-foreground hover:border-primary'
                    }`}
                style={{
                    backgroundColor: item.completed && item.color
                        ? (item.color.startsWith('#') ? item.color : `hsl(var(--workspace-${item.color}))`)
                        : undefined,
                    borderColor: item.color
                        ? (item.color.startsWith('#') ? item.color : `hsl(var(--workspace-${item.color}))`)
                        : undefined
                }}
            >
                {item.completed && <Check className="w-3 h-3 text-white" />}
            </button>

            <span className={`flex-1 min-w-0 text-xs font-medium break-words whitespace-pre-wrap ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {item.title || "Untitled"}
            </span>
        </motion.div>
    );
}


export function UnifiedItem({ item, onToggleComplete, onClick, workspaceColor }: UnifiedItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: item.id,
        data: { type: 'item', item: item },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 999 : undefined,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <QuickEditPopover item={item} className="h-full">
                <UnifiedItemView
                    item={item}
                    onToggleComplete={onToggleComplete}
                    onClick={onClick}
                    isDragging={isDragging}
                    dragHandleProps={{ ...attributes, ...listeners }}
                />
            </QuickEditPopover>
        </div>
    );
}

