import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { X, CheckSquare, FileText, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Project {
  id: string;
  name: string;
  workspaceName: string;
}

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (type: 'task' | 'note' | 'diary', content: string, date: string, projectId: string) => void;
  projects: Project[];
}

export function AddItemDialog({ isOpen, onClose, onAdd, projects }: AddItemDialogProps) {
  const [type, setType] = useState<'task' | 'note' | 'diary'>('task');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [projectId, setProjectId] = useState(projects[0]?.id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !projectId) return;
    onAdd(type, content, date, projectId);
    setContent('');
  };

  const types = [
    { value: 'task', label: 'Task', icon: CheckSquare },
    { value: 'note', label: 'Note', icon: FileText },
    { value: 'diary', label: 'Diary', icon: BookOpen },
  ] as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Add New Item</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Type selector */}
              <div className="flex gap-2">
                {types.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                      type === value 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-secondary/50 text-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
              
              {/* Project selector */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Project</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.workspaceName} → {project.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Date picker */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              
              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {type === 'task' ? 'Task Title' : 'Content'}
                </label>
                {type === 'task' ? (
                  <input
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                ) : (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={type === 'diary' ? "How are you feeling today?" : "Write your note..."}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                )}
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!content.trim()}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
