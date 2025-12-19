import { useMemo, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { addDays, format } from 'date-fns';
import { Project, TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { TimelineCell } from './TimelineCell';
import { MilestoneItem } from './MilestoneItem';
import { SubProjectSection } from './SubProjectRow';
import { motion, AnimatePresence } from 'framer-motion';
import { CELL_WIDTH } from './TimelineHeader';
import { PROJECT_HEADER_HEIGHT, calculateProjectExpandedHeight, packSubProjects } from '@/lib/timelineUtils';

// Droppable cell for milestones in the header row
function MilestoneDropCell({ 
  date, 
  projectId, 
  milestones, 
  workspaceColor, 
  onItemClick,
  items,
  isOpen
}: { 
  date: Date; 
  projectId: string; 
  milestones: Milestone[]; 
  workspaceColor: number;
  onItemClick: (item: Milestone) => void;
  items: TimelineItem[];
  isOpen: boolean;
}) {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  const { setNodeRef, isOver } = useDroppable({
    id: `milestone-${projectId}-${dateStr}`,
    data: { projectId, date: dateStr, type: 'milestone' },
  });

  // Filter out completed items for collapsed view
  const uncompletedItems = items.filter(item => !item.completed);

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col justify-center px-1 border-r border-border/30 last:border-r-0 transition-colors ${
        isOver ? 'bg-milestone/10' : ''
      }`}
      style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
    >
      {/* Render Milestones */}
      <div className="flex flex-col gap-1">
        {milestones.map(milestone => (
          <MilestoneItem
            key={milestone.id} 
            milestone={milestone}
            workspaceColor={workspaceColor}
            onClick={onItemClick}
          />
        ))}
      </div>

      {/* If collapsed and has uncompleted items, show dots for each */}
      {!isOpen && uncompletedItems.length > 0 && milestones.length === 0 && (
        <div className="flex justify-center gap-0.5 flex-wrap">
          {uncompletedItems.map(item => (
            <div 
              key={item.id}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: item.color || 'hsl(var(--task))' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProjectRowProps {
  project: Project;
  isOpen: boolean;
  startDate: Date;
  visibleDays: number;
  workspaceColor: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemClick: (item: TimelineItem | Milestone) => void;
  onSubProjectClick: (subProject: SubProject) => void;
}

export function ProjectRow({ 
  project, 
  isOpen, 
  startDate, 
  visibleDays, 
  workspaceColor,
  onToggleItemComplete,
  onItemClick,
  onSubProjectClick
}: ProjectRowProps) {
  const days = Array.from({ length: visibleDays }, (_, i) => addDays(startDate, i));

  // Pre-calculate items by date for O(1) lookup
  const { items, milestones, subProjectItems, allItems } = useMemo(() => {
    const items = new Map<string, TimelineItem[]>();
    const milestones = new Map<string, Milestone[]>();
    const subProjectItems = new Map<string, Map<string, TimelineItem[]>>();
    const allItems = new Map<string, TimelineItem[]>();

    project.items.forEach(t => {
      // Add to allItems for collapsed view
      if (!allItems.has(t.date)) allItems.set(t.date, []);
      allItems.get(t.date)!.push(t);

      if (t.subProjectId) {
          if (!subProjectItems.has(t.subProjectId)) {
              subProjectItems.set(t.subProjectId, new Map());
          }
          const spMap = subProjectItems.get(t.subProjectId)!;
          if (!spMap.has(t.date)) spMap.set(t.date, []);
          spMap.get(t.date)!.push(t);
      } else {
          if (!items.has(t.date)) items.set(t.date, []);
          items.get(t.date)!.push(t);
      }
    });

    project.milestones.forEach(m => {
      if (!milestones.has(m.date)) milestones.set(m.date, []);
      milestones.get(m.date)!.push(m);
    });

    return { items, milestones, subProjectItems, allItems };
  }, [project]);

  const subProjectLanes = useMemo(() => {
      return packSubProjects(project.subProjects || []);
  }, [project.subProjects]);

  // Use shared height calculation for consistency with sidebar
  const { mainRowHeight, subProjectRowHeights, totalHeight } = useMemo(() => 
    calculateProjectExpandedHeight(project),
    [project]
  );

  // Ref for the expanded content
  const expandedContentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col border-b border-border/50">
      {/* HEADER ROW - Milestones */}
      <div className="flex" style={{ height: PROJECT_HEADER_HEIGHT }}>
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayMilestones = milestones.get(dateStr) || [];
          const dayItems = allItems.get(dateStr) || [];
          
          return (
            <MilestoneDropCell
              key={day.toISOString()}
              date={day}
              projectId={project.id}
              milestones={dayMilestones}
              workspaceColor={workspaceColor}
              onItemClick={onItemClick}
              items={dayItems}
              isOpen={isOpen}
            />
          );
        })}
      </div>

      {/* EXPANDED CONTENT */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            ref={expandedContentRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: totalHeight, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden flex flex-col"
          >
            {/* Main Items Row */}
            <div 
              className="flex border-b border-border/30"
              style={{ minHeight: mainRowHeight }}
            >
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                return (
                  <TimelineCell
                    key={day.toISOString()}
                    date={day}
                    projectId={project.id}
                    items={items.get(dateStr) || []}
                    milestones={[]}
                    workspaceColor={workspaceColor}
                    onToggleItemComplete={onToggleItemComplete}
                    onItemClick={onItemClick}
                    cellWidth={CELL_WIDTH}
                    rowHeight={mainRowHeight}
                  />
                );
              })}
            </div>

            {/* SubProjects Section - unified droppable zone spanning all lanes */}
            <SubProjectSection
              projectId={project.id}
              subProjectLanes={subProjectLanes}
              subProjectRowHeights={subProjectRowHeights}
              itemsBySubProject={subProjectItems}
              days={days}
              workspaceColor={workspaceColor}
              onToggleItemComplete={onToggleItemComplete}
              onItemClick={onItemClick}
              onSubProjectClick={onSubProjectClick}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
// End ProjectRow
