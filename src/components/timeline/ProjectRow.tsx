import { useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { Project, TimelineItem, Milestone } from '@/types/timeline';
import { TimelineCell } from './TimelineCell';
import { MilestoneItem } from './MilestoneItem';
import { ChevronDown, ChevronRight, FolderKanban } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SIDEBAR_WIDTH, CELL_WIDTH } from './TimelineHeader';

interface ProjectRowProps {
  project: Project;
  isOpen: boolean;
  onToggle: () => void;
  startDate: Date;
  visibleDays: number;
  workspaceColor: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemClick: (item: TimelineItem | Milestone) => void;
}

export function ProjectRow({ 
  project, 
  isOpen, 
  onToggle, 
  startDate, 
  visibleDays, 
  workspaceColor,
  onToggleItemComplete,
  onItemClick
}: ProjectRowProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const days = Array.from({ length: visibleDays }, (_, i) => addDays(startDate, i));
  const itemCount = project.items.length;
  const completedCount = project.items.filter(t => t.completed).length;
  const completionPercent = itemCount > 0 ? (completedCount / itemCount) * 100 : 0;

  // Pre-calculate items by date for O(1) lookup
  const itemsByDate = useMemo(() => {
    const items = new Map();
    const milestones = new Map();

    project.items.forEach(t => {
      if (!items.has(t.date)) items.set(t.date, []);
      items.get(t.date).push(t);
    });

    project.milestones.forEach(m => {
      if (!milestones.has(m.date)) milestones.set(m.date, []);
      milestones.get(m.date).push(m);
    });

    return { items, milestones };
  }, [project]);

  return (
    <div className="flex border-b border-border/50">
      {/* LEFT COLUMN - STICKY */}
      <div 
        className="sticky left-0 z-10 flex flex-col shrink-0 bg-background border-r border-border"
        style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
      >
        {/* Project Header (Left) */}
        <div 
          className="flex items-center gap-1.5 px-2 py-1 min-h-[40px] cursor-pointer hover:bg-secondary/30 transition-colors"
          onClick={onToggle}
        >
          <div className="pl-3 flex items-center gap-1.5 flex-1 min-w-0">
            {isOpen ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
            <FolderKanban 
              className="w-3 h-3 shrink-0" 
              style={{ color: `hsl(var(--workspace-${workspaceColor}))` }}
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-medium text-foreground truncate">
                {project.name}
              </span>
              {/* Progress bar */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-12 h-1 bg-secondary rounded-full overflow-hidden shrink-0">
                  <div 
                    className="h-full bg-task rounded-full transition-all" 
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground shrink-0">
                  {completedCount}/{itemCount}
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* The rest of this column is empty space that stretches with the row height (acting as the spacer) */}
      </div>

      {/* RIGHT COLUMN - SCROLLABLE */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Date cells Header (Dots) - Only visible when collapsed, but we need the height placeholder when expanded */}
        <div className="flex min-h-[40px]">
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const milestones = itemsByDate.milestones.get(dateStr) || [];
            const hasItem = itemsByDate.items.has(dateStr);
            
            return (
              <div 
                key={day.toISOString()} 
                className="flex flex-col justify-center px-1 border-r border-border/30 last:border-r-0"
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

                {/* If collapsed and has items, show dot */}
                {!isOpen && hasItem && milestones.length === 0 && (
                  <div className="flex justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-task" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      
        {/* Expanded content */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex">
                {/* Timeline cells */}
                {days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  return (
                    <TimelineCell
                      key={day.toISOString()}
                      date={day}
                      projectId={project.id}
                      items={itemsByDate.items.get(dateStr) || []}
                      milestones={[]} // Milestones are now in the header
                      workspaceColor={workspaceColor}
                      onToggleItemComplete={onToggleItemComplete}
                      onItemClick={onItemClick}
                      cellWidth={CELL_WIDTH}
                    />
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
