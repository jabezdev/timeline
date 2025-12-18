import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { SubProject, TimelineItem } from '@/types/timeline';
import { format, differenceInDays, parseISO, isWithinInterval } from 'date-fns';
import { TimelineCell } from './TimelineCell';
import { CELL_WIDTH } from './TimelineHeader';
import { GripHorizontal } from 'lucide-react';

interface SubProjectLaneProps {
  subProjects: SubProject[];
  itemsBySubProject: Map<string, Map<string, TimelineItem[]>>;
  days: Date[];
  workspaceColor: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemClick: (item: TimelineItem) => void;
  onSubProjectClick: (subProject: SubProject) => void;
}

export const SubProjectBar = React.forwardRef<HTMLDivElement, {
    subProject: SubProject;
    width?: number;
    left?: number;
    isDragging?: boolean;
    onClick?: (subProject: SubProject) => void;
    dragHandleProps?: any;
    style?: React.CSSProperties;
    className?: string;
}>(({
    subProject,
    width,
    left,
    isDragging,
    onClick,
    dragHandleProps,
    style,
    className
}, ref) => {
    return (
        <div 
            ref={ref}
            className={`rounded-md border-2 border-dashed transition-colors flex flex-col pointer-events-auto ${isDragging ? 'opacity-30' : 'z-10'} ${className || ''}`}
            style={{
                left: left !== undefined ? `${left}px` : undefined,
                width: width !== undefined ? `${width}px` : undefined,
                borderColor: subProject.color ? `${subProject.color}50` : 'hsl(var(--primary) / 0.2)',
                backgroundColor: subProject.color ? `${subProject.color}10` : 'hsl(var(--primary) / 0.05)',
                ...style
            }}
        >
            {/* Drag Handle with Title */}
            <div 
                {...dragHandleProps}
                className="h-6 shrink-0 w-full cursor-grab active:cursor-grabbing flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 rounded-t-md z-20 group/handle px-2"
            >
                <span 
                    className="text-xs font-medium truncate flex-1"
                    style={{ color: subProject.color || 'hsl(var(--primary) / 0.7)' }}
                >
                    {subProject.title}
                </span>
                <GripHorizontal className="w-4 h-4 opacity-0 group-hover/handle:opacity-50 transition-opacity shrink-0" />
            </div>

            {/* Content area - clickable to open dialog */}
            <div 
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isDragging && onClick) {
                        onClick(subProject);
                    }
                }}
                className="flex-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-b-md overflow-hidden" 
            />
        </div>
    );
});

function DraggableSubProjectBar({ 
    subProject, 
    timelineStartDate,
    onClick
}: { 
    subProject: SubProject; 
    timelineStartDate: Date;
    onClick: (subProject: SubProject) => void;
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: subProject.id,
        data: { type: 'subProject', item: subProject },
    });

    const subProjectStart = parseISO(subProject.startDate);
    const subProjectEnd = parseISO(subProject.endDate);
    
    const startOffsetDays = differenceInDays(subProjectStart, timelineStartDate);
    const durationDays = differenceInDays(subProjectEnd, subProjectStart) + 1;

    const left = startOffsetDays * CELL_WIDTH;
    const width = durationDays * CELL_WIDTH;

    return (
        <SubProjectBar
            ref={setNodeRef}
            subProject={subProject}
            left={left}
            width={width}
            isDragging={isDragging}
            onClick={onClick}
            dragHandleProps={{ ...attributes, ...listeners }}
            className="absolute top-1 bottom-1"
        />
    );
}

export function SubProjectLane({
  subProjects,
  itemsBySubProject,
  days,
  workspaceColor,
  onToggleItemComplete,
  onItemClick,
  onSubProjectClick
}: SubProjectLaneProps) {
  const timelineStartDate = days[0];

  return (
    <div className="border-b border-border/30 relative min-h-[60px]">
      {/* SubProject Bars - rendered first as background layer, pointer-events-none except for drag handle */}
      <div className="absolute inset-0 pointer-events-none">
        {subProjects.map(sub => (
          <DraggableSubProjectBar 
            key={sub.id} 
            subProject={sub} 
            timelineStartDate={timelineStartDate}
            onClick={onSubProjectClick}
          />
        ))}
      </div>

      {/* Cells - rendered with padding to account for subproject bars */}
      <div className="flex relative pt-6"> 
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          
          // Find which subproject this day belongs to (if any)
          // Since we packed them, there should be at most one.
          const activeSubProject = subProjects.find(sub => 
            isWithinInterval(day, {
              start: parseISO(sub.startDate),
              end: parseISO(sub.endDate)
            })
          );

          const items = activeSubProject 
            ? itemsBySubProject.get(activeSubProject.id)?.get(dateStr) || []
            : [];

          return (
            <TimelineCell
              key={day.toISOString()}
              date={day}
              projectId={subProjects[0]?.projectId} // All subprojects in this lane belong to same project
              subProjectId={activeSubProject?.id}
              items={items}
              milestones={[]}
              workspaceColor={workspaceColor}
              onToggleItemComplete={onToggleItemComplete}
              onItemClick={onItemClick}
              cellWidth={CELL_WIDTH}
            />
          );
        })}
      </div>
    </div>
  );
}
