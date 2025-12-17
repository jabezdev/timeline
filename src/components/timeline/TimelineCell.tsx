import { useDroppable } from '@dnd-kit/core';
import { format } from 'date-fns';
import { Project } from '@/types/timeline';
import { TaskItem } from './TaskItem';
import { NoteItem } from './NoteItem';
import { MilestoneItem } from './MilestoneItem';

interface TimelineCellProps {
  date: Date;
  project: Project;
  workspaceColor: number;
  onToggleTaskComplete: (taskId: string) => void;
  cellWidth: number;
}

export function TimelineCell({ date, project, workspaceColor, onToggleTaskComplete, cellWidth }: TimelineCellProps) {
  const dateStr = format(date, 'yyyy-MM-dd');
  
  const { setNodeRef, isOver } = useDroppable({
    id: `${project.id}-${dateStr}`,
    data: { projectId: project.id, date: dateStr },
  });

  const dayMilestones = project.milestones.filter(ms => ms.date === dateStr);
  const dayTasks = project.tasks.filter(task => task.date === dateStr);
  const dayNotes = project.notes.filter(note => note.date === dateStr);

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[40px] px-1 py-1 border-r border-border last:border-r-0 transition-colors shrink-0 ${
        isOver ? 'bg-primary/10' : ''
      }`}
      style={{ width: cellWidth, minWidth: cellWidth }}
    >
      <div className="flex flex-col gap-1">
        {dayMilestones.map(milestone => (
          <MilestoneItem
            key={milestone.id} 
            milestone={milestone}
            workspaceColor={workspaceColor}
          />
        ))}
        
        {dayTasks.map(task => (
          <TaskItem 
            key={task.id} 
            task={task} 
            onToggleComplete={onToggleTaskComplete}
            workspaceColor={workspaceColor}
          />
        ))}
        
        {dayNotes.map(note => (
          <NoteItem 
            key={note.id} 
            note={note}
            workspaceColor={workspaceColor}
          />
        ))}
      </div>
    </div>
  );
}
