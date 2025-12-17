import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Note } from '@/types/timeline';
import { BookOpen, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface NoteItemProps {
  note: Note;
  workspaceColor: number;
}

export function NoteItem({ note, workspaceColor }: NoteItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: note.id,
    data: { type: 'note', item: note },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const Icon = note.type === 'diary' ? BookOpen : FileText;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group relative flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-note/10 border border-note/20 hover:border-note/40 transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 shadow-lg z-50' : ''
      }`}
    >
      <Icon className="w-3 h-3 text-note shrink-0 mt-0.5" />
      
      <p className="text-xs text-foreground/90 line-clamp-2">
        {note.content}
      </p>
    </motion.div>
  );
}
