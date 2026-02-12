import { TimelineItem } from '@/types/timeline';
import { Check } from 'lucide-react';
import React from 'react';
import { useIsSelected } from '@/hooks/useIsSelected';

interface UnifiedItemProps {
    item: TimelineItem;
    onToggleComplete: (itemId: string) => void;
    onClick?: (multi: boolean, e: React.MouseEvent) => void;
    workspaceColor: number;
    minHeight?: number;
    isSelected?: boolean;
    colorMode?: 'full' | 'monochromatic';
    systemAccent?: string;
}

export const UnifiedItemView = React.memo(function UnifiedItemView({
    item,
    onToggleComplete,
    onClick,
    style,
    className,
    minHeight,
    isSelected,
    colorMode = 'full',
    systemAccent = '6'
}: {
    item: TimelineItem;
    onToggleComplete?: (itemId: string) => void;
    onClick?: (multi: boolean, e: React.MouseEvent) => void;
    style?: React.CSSProperties;
    className?: string;
    minHeight?: number;
    isSelected?: boolean; // Keep for internal view if needed, but we will pass it from wrapper
    colorMode?: 'full' | 'monochromatic';
    systemAccent?: string;
}) {
    // ...
    // Determine effective color
    const effectiveColor = item.color;
    const isHex = effectiveColor?.startsWith('#') || false;

    const getBgColor = (opacity: number) => {
        if (colorMode === 'monochromatic') {
            return `hsl(var(--primary) / ${opacity})`;
        }

        if (!effectiveColor) return undefined;

        // Full mode
        if (effectiveColor.startsWith('#')) return `${effectiveColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
        return `hsl(var(--workspace-${effectiveColor}) / ${opacity})`;
    };

    const getMainColor = () => {
        if (colorMode === 'monochromatic') {
            return `hsl(var(--primary))`;
        }

        if (!effectiveColor) return undefined;

        if (effectiveColor.startsWith('#')) return effectiveColor;
        return `hsl(var(--workspace-${effectiveColor}))`;
    };
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
                    backgroundColor: getBgColor(0.15),
                    borderColor: isSelected
                        ? 'hsl(var(--primary))'
                        : getBgColor(0.3),
                    borderWidth: isSelected ? '2px' : '1px',
                    minHeight: minHeight ? `${minHeight}px` : undefined,
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick?.(true, e); // Always use multi-select mode
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
                        backgroundColor: item.completed ? getMainColor() : undefined,
                        borderColor: getMainColor()
                    }}
                >
                    {item.completed && <Check className="w-3 h-3" style={{ color: colorMode === 'monochromatic' ? 'hsl(var(--primary-foreground))' : '#ffffff' }} />}
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
    colorMode,
    systemAccent,
    onContextMenu
}: UnifiedItemProps & {
    onDoubleClick?: (item: TimelineItem, e?: React.MouseEvent) => void;
    onQuickEdit?: (item: TimelineItem, anchorElement?: HTMLElement) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    onClick?: (multi: boolean, e: React.MouseEvent) => void;
}) {
    const isSelected = useIsSelected(item.id);
    return (
        <div>
            <div
                className="pointer-events-auto"
                onContextMenu={(e) => {
                    if (onContextMenu) { onContextMenu(e); return; }

                    e.preventDefault();
                    e.stopPropagation();
                    if (onQuickEdit) onQuickEdit(item, e.currentTarget);
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (onDoubleClick) onDoubleClick(item, e);
                }}
            >
                <UnifiedItemView
                    item={item}
                    onToggleComplete={onToggleComplete}
                    onClick={onClick}
                    minHeight={minHeight}
                    isSelected={isSelected}
                    colorMode={colorMode}
                    systemAccent={systemAccent}
                />
            </div>
        </div>
    );
});
