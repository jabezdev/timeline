import { useDraggable } from '@dnd-kit/core';
import { TimelineItem } from '@/types/timeline';
import { Check } from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { useRef, useLayoutEffect, useState } from 'react';
import { useDropAnimation } from './DropAnimationContext';

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
            className={`group relative flex items-start gap-1.5 px-2 py-1.5 rounded-sm border cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30' : ''
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
        </div>
    );
}
import { QuickEditPopover } from './QuickEditPopover';

// ... (imports)

// ... (UnifiedItemView component)

export function UnifiedItem({ item, onToggleComplete, onClick, workspaceColor }: UnifiedItemProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: item.id,
        data: { type: 'item', item: item },
    });

    const { consumeDropInfo } = useDropAnimation();
    const containerRef = useRef<HTMLDivElement>(null);
    const [animateFrom, setAnimateFrom] = useState<{ x: number; y: number } | null>(null);

    useLayoutEffect(() => {
        const dropInfo = consumeDropInfo(item.id);
        if (dropInfo && containerRef.current) {
            const currentRect = containerRef.current.getBoundingClientRect();
            const offsetX = dropInfo.rect.left - currentRect.left;
            const offsetY = dropInfo.rect.top - currentRect.top;
            setAnimateFrom({ x: offsetX, y: offsetY });
            // Clear the animation state after it completes
            const timer = setTimeout(() => setAnimateFrom(null), 250);
            return () => clearTimeout(timer);
        }
    }, [item.id, item.date, consumeDropInfo]);

    return (
        <motion.div
            ref={containerRef}
            layout
            layoutId={`item-${item.id}`}
            initial={animateFrom ? { x: animateFrom.x, y: animateFrom.y, opacity: 0.8 } : false}
            animate={{ x: 0, y: 0, opacity: isDragging ? 0.3 : 1 }}
            transition={{
                layout: { duration: 0 },
                x: { duration: 0 },
                y: { duration: 0 },
                opacity: { duration: 0 }
            }}
        >
            <div ref={setNodeRef}>
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
        </motion.div>
    );
}

