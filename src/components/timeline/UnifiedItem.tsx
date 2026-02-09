import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TimelineItem } from '@/types/timeline';
import { Check } from 'lucide-react';
import { QuickEditPopover } from './QuickEditPopover';
import React, { useState } from 'react';

interface UnifiedItemProps {
    item: TimelineItem;
    onToggleComplete: (itemId: string) => void;
    onClick?: (item: TimelineItem) => void;
    workspaceColor: number;
    minHeight?: number;
}


export const UnifiedItemView = React.memo(function UnifiedItemView({
    item,
    onToggleComplete,
    onClick,
    isDragging,
    dragHandleProps,
    style,
    className,
    minHeight
}: {
    item: TimelineItem;
    onToggleComplete?: (itemId: string) => void;
    onClick?: (item: TimelineItem) => void;
    isDragging?: boolean;
    dragHandleProps?: any;
    style?: React.CSSProperties;
    className?: string;
    minHeight?: number;
}) {
    return (
        <div
            className={`group/item relative ${isDragging ? 'opacity-30' : ''} ${className || ''}`}
            style={{
                minHeight: minHeight ? `${minHeight}px` : undefined,
                ...style
            }}
        >
            {/* Left drag handle - overlays on top, hidden unless hover */}
            <div
                {...dragHandleProps}
                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-auto z-10 rounded-l"
                style={{
                    backgroundColor: item.color
                        ? (item.color.startsWith('#') ? `${item.color}` : `hsl(var(--workspace-${item.color}))`)
                        : 'hsl(var(--primary))'
                }}
            />

            {/* Item content - full width */}
            <div
                className={`flex items-center gap-1.5 px-2 py-1.5 border ${item.completed
                    ? 'opacity-60 bg-secondary/20 border-border'
                    : 'bg-secondary/30 border-border hover:border-primary/30'
                    }`}
                style={{
                    backgroundColor: item.color
                        ? (item.color.startsWith('#') ? `${item.color}15` : `hsl(var(--workspace-${item.color}) / 0.15)`)
                        : undefined,
                    borderColor: item.color
                        ? (item.color.startsWith('#') ? `${item.color}30` : `hsl(var(--workspace-${item.color}) / 0.3)`)
                        : undefined,
                    minHeight: minHeight ? `${minHeight}px` : undefined,
                }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleComplete) onToggleComplete(item.id);
                    }}
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${item.completed
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

                <span className={`flex-1 min-w-0 text-xs font-medium whitespace-normal break-words ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {item.title || "Untitled"}
                </span>
            </div>
        </div>
    );
});


export const UnifiedItem = React.memo(function UnifiedItem({ item, onToggleComplete, onClick, workspaceColor, onDoubleClick, minHeight, onQuickEdit }: UnifiedItemProps & { onDoubleClick?: (item: TimelineItem) => void; onQuickEdit?: (item: TimelineItem, anchorElement?: HTMLElement) => void }) {
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
            <div
                className="pointer-events-auto"
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onQuickEdit) onQuickEdit(item, e.currentTarget);
                }}
                onClick={(e) => {
                    e.stopPropagation(); // CRITICAL: prevent cell Quick Create
                    if (onDoubleClick) onDoubleClick(item);
                }}
            >
                <UnifiedItemView
                    item={item}
                    onToggleComplete={onToggleComplete}
                    onClick={onClick}
                    isDragging={isDragging}
                    minHeight={minHeight}
                    dragHandleProps={{ ...attributes, ...listeners }}
                />
            </div>
        </div>
    );
});

