import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Milestone } from '@/types/timeline';
import { Flag } from 'lucide-react';
import { QuickEditPopover } from './QuickEditPopover';

interface MilestoneItemProps {
  milestone: Milestone;
  workspaceColor: number;
  onClick?: (milestone: Milestone) => void;
  className?: string; // Added className
}

export function MilestoneItemView({
  milestone,
  onClick,
  isDragging,
  dragHandleProps,
  style,
  className,
}: {
  milestone: Milestone;
  onClick?: (milestone: Milestone) => void;
  isDragging?: boolean;
  dragHandleProps?: any;
  style?: React.CSSProperties;
  className?: string;
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
      {...dragHandleProps}
      onClick={(e) => {
        if (!isDragging && onClick) {
          e.stopPropagation();
          onClick(milestone);
        }
      }}
      className={`group relative flex items-center gap-1.5 px-2 py-1.5 border cursor-grab active:cursor-grabbing touch-none min-h-[28px] ${isDragging ? 'opacity-30' : ''} ${className || ''}`}
      style={{
        ...style,
        backgroundColor: bgColor,
        borderColor: borderColor,
        color: textColor
      }}
    >
      <Flag className="w-3 h-3 shrink-0" style={{ color: textColor }} />
      <span className="text-xs font-medium whitespace-normal break-words" style={{ color: textColor }}>
        {milestone.title}
      </span>
    </div>
  );
}

export function MilestoneItem({ milestone, workspaceColor, onClick, className }: MilestoneItemProps) {
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
      <QuickEditPopover item={milestone} className="h-full">
        <MilestoneItemView
          milestone={milestone}
          onClick={onClick}
          isDragging={isDragging}
          dragHandleProps={{ ...attributes, ...listeners }}
          className="h-full"
        />
      </QuickEditPopover>
    </div>
  );
}

