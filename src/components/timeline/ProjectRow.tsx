import { addDays } from 'date-fns';
import { Project } from '@/types/timeline';
import { TimelineCell } from './TimelineCell';
import { ChevronDown, ChevronRight, FolderKanban } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        <div 
          className="w-72 shrink-0 flex items-center gap-1.5 px-2 py-1 border-r border-border cursor-pointer hover:bg-secondary/30 transition-colors sticky left-0 bg-background z-10"
          onClick={onToggle}
        >
          <div className="pl-3 flex items-center gap-1.5 flex-1">
            {isOpen ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
            <FolderKanban 
              className="w-3 h-3" 
              style={{ color: `hsl(var(--workspace-${workspaceColor}))` }}
            />
            <span className="text-xs font-medium text-foreground truncate">
              {project.name}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {completedCount}/{taskCount}
          </span>
        </div>
        
        {/* Collapsed state - show summary dots */}
        {!isOpen && (
          <div className="flex flex-1 overflow-hidden">
            {days.map((day) => {
              const dateStr = day.toISOString().split('T')[0];
              const hasMilestone = project.milestones.some(ms => ms.date === dateStr);
              const hasTask = project.tasks.some(t => t.date === dateStr);
              const hasNote = project.notes.some(n => n.date === dateStr);
              
              return (
                <div key={day.toISOString()} className="flex-1 min-w-[80px] flex items-center justify-center gap-0.5 border-r border-border/30 last:border-r-0">
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
              <div className="w-72 shrink-0 border-r border-border sticky left-0 bg-background z-10" />
              <div className="flex flex-1 overflow-hidden">
                {days.map((day) => (
                  <TimelineCell
                    key={day.toISOString()}
                    date={day}
                    project={project}
                    workspaceColor={workspaceColor}
                    onToggleTaskComplete={onToggleTaskComplete}
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
