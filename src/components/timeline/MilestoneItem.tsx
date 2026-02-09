import { Milestone } from '@/types/timeline';
import { Flag } from 'lucide-react';
import React from 'react';

interface MilestoneItemProps {
  milestone: Milestone;
  workspaceColor: number;
  onClick?: (multi: boolean) => void;
  className?: string;
  minHeight?: number;
  isSelected?: boolean;
  colorMode?: 'full' | 'monochromatic';
  systemAccent?: string;
}

export const MilestoneItemView = React.memo(function MilestoneItemView({
  milestone,
  onClick,
  style,
  className,
  minHeight,
  isSelected,
  colorMode = 'full',
  systemAccent = '6'
}: {
  milestone: Milestone;
  onClick?: (multi: boolean) => void;
  style?: React.CSSProperties;
  className?: string;
  minHeight?: number;
  isSelected?: boolean;
  colorMode?: 'full' | 'monochromatic';
  systemAccent?: string;
}) {
  /* effectiveColor extraction removed as it's no longer needed for monochromatic check */

  const getBgColor = () => {
    if (colorMode === 'monochromatic') {
      return 'hsl(var(--primary))';
    }

    if (milestone.color?.startsWith('#')) return milestone.color;
    return milestone.color ? `hsl(var(--workspace-${milestone.color}))` : 'hsl(var(--primary))';
  };

  const bgColor = getBgColor();

  const borderColor = 'hsl(var(--background))';
  const textColor = '#ffffff';

  return (
    <div
      className={`group/milestone relative ${className || ''}`}
      style={{
        minHeight: minHeight ? `${minHeight}px` : undefined,
        ...style,
      }}
    >
      {/* Milestone content - full width */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 border cursor-pointer hover:opacity-90 transition-opacity"
        style={{
          backgroundColor: bgColor,
          borderColor: isSelected ? 'hsl(var(--primary))' : borderColor,
          borderWidth: isSelected ? '2px' : '1px',
          color: textColor,
          minHeight: minHeight ? `${minHeight}px` : undefined,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e.ctrlKey || e.metaKey);
        }}
      >
        <Flag className="w-3 h-3 shrink-0" style={{ color: textColor }} />
        <span className="text-xs font-medium whitespace-normal break-words" style={{ color: textColor }}>
          {milestone.title}
        </span>
      </div>
    </div>
  );
});

export const MilestoneItem = React.memo(function MilestoneItem({
  milestone,
  workspaceColor,
  onClick,
  className,
  onDoubleClick,
  minHeight,
  isSelected,
  onQuickEdit,
  colorMode,
  systemAccent
}: MilestoneItemProps & {
  onDoubleClick?: (milestone: Milestone) => void;
  onQuickEdit?: (item: Milestone, anchorElement?: HTMLElement) => void;
  colorMode?: 'full' | 'monochromatic';
  systemAccent?: string;
}) {
  return (
    <div className={className}>
      <div
        className="pointer-events-auto"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onQuickEdit) onQuickEdit(milestone, e.currentTarget);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (onDoubleClick) onDoubleClick(milestone);
        }}
      >
        <MilestoneItemView
          milestone={milestone}
          onClick={onClick}
          isSelected={isSelected}
          minHeight={minHeight}
          className="h-full"
          colorMode={colorMode}
          systemAccent={systemAccent}
        />
      </div>
    </div>
  );
});
