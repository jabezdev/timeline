import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Milestone } from '@/types/timeline';
import { Flag } from 'lucide-react';
import { QuickEditPopover } from './QuickEditPopover';
import React, { useState } from 'react';

interface MilestoneItemProps {
  milestone: Milestone;
  workspaceColor: number;
  onClick?: (milestone: Milestone) => void;
  className?: string; // Added className
  minHeight?: number;
}

export const MilestoneItemView = React.memo(function MilestoneItemView({
  milestone,
  onClick,
  isDragging,
  dragHandleProps,
  style,
  className,
  minHeight,
}: {
  milestone: Milestone;
  onClick?: (milestone: Milestone) => void;
  isDragging?: boolean;
  dragHandleProps?: any;
  style?: React.CSSProperties;
  className?: string;
  minHeight?: number;
}) {
  const isHex = milestone.color?.startsWith('#');
  // Full color (solid)
  const bgColor = isHex
    ? milestone.color
    : milestone.color
      ? `hsl(var(--workspace-${milestone.color}))`
      : 'hsl(var(--primary))';

  const borderColor = 'hsl(var(--background))';

  const textColor = '#ffffff';

  return (
    <div
      className={`group/milestone relative ${isDragging ? 'opacity-30' : ''} ${className || ''}`}
      style={{
        minHeight: minHeight ? `${minHeight}px` : undefined,
        ...style,
      }}
    >
      {/* Left drag handle - overlays on top, hidden unless hover */}
      <div
        {...dragHandleProps}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover/milestone:opacity-100 transition-opacity pointer-events-auto z-10 rounded-l"
        style={{
          backgroundColor: isHex
            ? milestone.color
            : milestone.color
              ? `hsl(var(--workspace-${milestone.color}))`
              : 'hsl(var(--primary))',
        }}
      />

      {/* Milestone content - full width */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 border"
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
          color: textColor,
          minHeight: minHeight ? `${minHeight}px` : undefined,
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

export const MilestoneItem = React.memo(function MilestoneItem({ milestone, workspaceColor, onClick, className, onDoubleClick, minHeight, onQuickEdit }: MilestoneItemProps & { onDoubleClick?: (milestone: Milestone) => void; onQuickEdit?: (item: Milestone, anchorElement?: HTMLElement) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: milestone.id,
    data: { type: 'milestone', item: milestone },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={className}>
      <div
        className="pointer-events-auto"
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onQuickEdit) onQuickEdit(milestone, e.currentTarget);
        }}
        onClick={(e) => {
          e.stopPropagation(); // CRITICAL: prevent cell Quick Create
          if (onDoubleClick) onDoubleClick(milestone);
        }}
      >
        <MilestoneItemView
          milestone={milestone}
          onClick={onClick}
          isDragging={isDragging}
          minHeight={minHeight}
          dragHandleProps={{ ...attributes, ...listeners }}
          className="h-full"
        />
      </div>
    </div>
  );
});

