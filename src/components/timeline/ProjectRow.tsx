import { addDays } from 'date-fns';
import { Project } from '@/types/timeline';
import { TimelineCell } from './TimelineCell';
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
  onToggleTaskComplete: (taskId: string) => void;
}


export function ProjectRow({ 
  project, 
  isOpen, 
  onToggle, 
  startDate, 
  visibleDays, 
  workspaceColor,
  onToggleTaskComplete 
}: ProjectRowProps) {
  const days = Array.from({ length: visibleDays }, (_, i) => addDays(startDate, i));
  const taskCount = project.tasks.length;
  const completedCount = project.tasks.filter(t => t.completed).length;

  return (
    <div className="border-b border-border/50">
      {/* Project header row */}
      <div className="flex">
        {/* Sticky project title */}
        <div 
          className="flex items-center gap-1.5 px-2 py-1 border-r border-border cursor-pointer hover:bg-secondary/30 transition-colors sticky left-0 bg-background z-10"
          style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
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
            <span className="text-xs font-medium text-foreground truncate">
              {project.name}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {completedCount}/{taskCount}
          </span>
        </div>
        
        {/* Date cells - collapsed shows dots */}
        {!isOpen && (
          <div className="flex">
            {days.map((day) => {
              const dateStr = day.toISOString().split('T')[0];
              const hasMilestone = project.milestones.some(ms => ms.date === dateStr);
              const hasTask = project.tasks.some(t => t.date === dateStr);
              const hasNote = project.notes.some(n => n.date === dateStr);
              
              return (
                <div 
                  key={day.toISOString()} 
                  className="flex items-center justify-center gap-0.5 border-r border-border/30 last:border-r-0"
                  style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
                >
                  {hasMilestone && <div className="w-1.5 h-1.5 rounded-full bg-milestone" />}
                  {hasTask && <div className="w-1.5 h-1.5 rounded-full bg-task" />}
                  {hasNote && <div className="w-1.5 h-1.5 rounded-full bg-note" />}
                </div>
              );
            })}
          </div>
        )}
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
              {/* Sticky spacer */}
              <div 
                className="border-r border-border sticky left-0 bg-background z-10 shrink-0" 
                style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
              />
              {/* Timeline cells */}
              <div className="flex">
                {days.map((day) => (
                  <TimelineCell
                    key={day.toISOString()}
                    date={day}
                    project={project}
                    workspaceColor={workspaceColor}
                    onToggleTaskComplete={onToggleTaskComplete}
                    cellWidth={CELL_WIDTH}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
