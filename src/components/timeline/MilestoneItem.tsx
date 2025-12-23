import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Milestone } from '@/types/timeline';
import { Flag } from 'lucide-react';
import { QuickEditPopover } from './QuickEditPopover';

interface MilestoneItemProps {
  milestone: Milestone;
  workspaceColor: number;
  onClick?: (milestone: Milestone) => void;
  isCompact?: boolean;
}

export function MilestoneItemView({
  milestone,
  onClick,
  isDragging,
  dragHandleProps,
  style,
  className,
  isCompact
}: {
  milestone: Milestone;
  onClick?: (milestone: Milestone) => void;
  isDragging?: boolean;
  dragHandleProps?: any;
  style?: React.CSSProperties;
  className?: string;
  isCompact?: boolean;
}) {
  const isHex = milestone.color?.startsWith('#');
  const bgColor = isHex
    ? `${milestone.color}26` // 15% opacity
    : milestone.color
      ? `hsl(var(--workspace-${milestone.color}) / 0.15)`
      : 'hsl(var(--primary) / 0.1)';

  const borderColor = isHex
    ? `${milestone.color}4D` // 30% opacity
    : milestone.color
      ? `hsl(var(--workspace-${milestone.color}) / 0.3)`
      : 'hsl(var(--border))';

  const textColor = isHex
    ? milestone.color
    : milestone.color
      ? `hsl(var(--workspace-${milestone.color}))`
      : 'hsl(var(--foreground))';

  return (
    <div

      {...dragHandleProps}
      onClick={(e) => {
        if (!isDragging && onClick) {
          e.stopPropagation();
          onClick(milestone);
        }
      }}
      className={`group relative flex items-center gap-1.5 px-2 ${isCompact ? 'py-0.5 text-[10px]' : 'py-1.5'} rounded-sm border cursor-grab active:cursor-grabbing touch-none ${isDragging ? 'opacity-30' : ''
        } ${className || ''}`}

      style={{
        ...style,
        backgroundColor: bgColor,
        borderColor: borderColor,
      }}
    >
      <Flag
        className={`${isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'} shrink-0`}
        style={{ color: textColor }}
      />

      <span
        className={`${isCompact ? 'text-[10px]' : 'text-xs'} font-medium truncate`}
        style={{ color: textColor }}
      >
        {milestone.title}
      </span>
    </div>
  );
}



// ...

export function MilestoneItem({ milestone, workspaceColor, onClick, isCompact }: MilestoneItemProps) {
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
    <div ref={setNodeRef} style={style}>
      <QuickEditPopover item={milestone}>
        <MilestoneItemView
          milestone={milestone}
          onClick={onClick}
          isDragging={isDragging}
          dragHandleProps={{ ...attributes, ...listeners }}
          isCompact={isCompact}
        />
      </QuickEditPopover>
    </div>
  );
}

