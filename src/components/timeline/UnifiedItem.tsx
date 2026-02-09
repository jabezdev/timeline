import { TimelineItem } from '@/types/timeline';
import { Check } from 'lucide-react';
import React from 'react';

interface UnifiedItemProps {
    item: TimelineItem;
    onToggleComplete: (itemId: string) => void;
    onClick?: (multi: boolean) => void;
    workspaceColor: number;
    minHeight?: number;
    isSelected?: boolean;
}

export const UnifiedItemView = React.memo(function UnifiedItemView({
    item,
    onToggleComplete,
    onClick,
    style,
    className,
    minHeight,
    isSelected
}: {
    item: TimelineItem;
    onToggleComplete?: (itemId: string) => void;
    onClick?: (multi: boolean) => void;
    style?: React.CSSProperties;
    className?: string;
    minHeight?: number;
    isSelected?: boolean;
}) {
    return (
        <div
            className={`group/item relative ${className || ''}`}
            style={{
                minHeight: minHeight ? `${minHeight}px` : undefined,
                ...style
            }}
        >
            {/* Item content - full width */}
            <div
                className={`flex items-center gap-1.5 px-2 py-1.5 border cursor-pointer ${item.completed
                    ? 'opacity-60 bg-secondary/20 border-border'
                    : 'bg-secondary/30 border-border hover:border-primary/30'
                    }`}
                style={{
                    backgroundColor: item.color
                        ? (item.color.startsWith('#') ? `${item.color}15` : `hsl(var(--workspace-${item.color}) / 0.15)`)
                        : undefined,
                    borderColor: isSelected
                        ? 'hsl(var(--primary))'
                        : (item.color
                            ? (item.color.startsWith('#') ? `${item.color}30` : `hsl(var(--workspace-${item.color}) / 0.3)`)
                            : undefined),
                    borderWidth: isSelected ? '2px' : '1px',
                    minHeight: minHeight ? `${minHeight}px` : undefined,
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick?.(e.ctrlKey || e.metaKey);
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

export const UnifiedItem = React.memo(function UnifiedItem({
    item,
    onToggleComplete,
    onClick,
    workspaceColor,
    onDoubleClick,
    minHeight,
    onQuickEdit,
    isSelected
}: UnifiedItemProps & {
    onDoubleClick?: (item: TimelineItem) => void;
    onQuickEdit?: (item: TimelineItem, anchorElement?: HTMLElement) => void;
}) {
    return (
        <div>
            <div
                className="pointer-events-auto"
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onQuickEdit) onQuickEdit(item, e.currentTarget);
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (onDoubleClick) onDoubleClick(item);
                }}
            >
                <UnifiedItemView
                    item={item}
                    onToggleComplete={onToggleComplete}
                    onClick={onClick}
                    minHeight={minHeight}
                    isSelected={isSelected}
                />
            </div>
        </div>
    );
});
