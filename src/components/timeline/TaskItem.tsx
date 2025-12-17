import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types/timeline';
import { Check, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';

interface TaskItemProps {
  task: Task;
  onToggleComplete: (taskId: string) => void;
  workspaceColor: number;
}

export function TaskItem({ task, onToggleComplete, workspaceColor }: TaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { type: 'task', item: task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border hover:border-primary/30 transition-all cursor-pointer ${
        isDragging ? 'opacity-50 shadow-lg z-50' : ''
      } ${task.completed ? 'opacity-60' : ''}`}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="drag-handle opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(task.id);
        }}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
          task.completed 
            ? 'bg-primary border-primary' 
            : 'border-muted-foreground hover:border-primary'
        }`}
      >
        {task.completed && <Check className="w-3 h-3 text-primary-foreground" />}
      </button>
      
      <span className={`text-sm truncate ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
        {task.title}
      </span>
      
      <div 
        className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg workspace-accent-${workspaceColor}`}
        style={{ backgroundColor: `hsl(var(--workspace-${workspaceColor}))` }}
      />
    </motion.div>
  );
}
