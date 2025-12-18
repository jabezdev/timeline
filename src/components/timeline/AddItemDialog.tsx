import { useState } from 'react';
import { format } from 'date-fns';
import { X, CheckSquare, Building2, FolderKanban } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Workspace } from '@/types/timeline';

interface Project {
  id: string;
  name: string;
  workspaceName: string;
}

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (title: string, date: string, projectId: string) => void;
  onAddWorkspace: (name: string, color: number) => void;
  onAddProject: (workspaceId: string, name: string) => void;
  projects: Project[];
  workspaces: Workspace[];
}

type ItemType = 'workspace' | 'project' | 'item';

export function AddItemDialog({ isOpen, onClose, onAddItem, onAddWorkspace, onAddProject, projects, workspaces }: AddItemDialogProps) {
  const [type, setType] = useState<ItemType>('item');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id || '');
  const [workspaceColor, setWorkspaceColor] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    if (type === 'workspace') {
      onAddWorkspace(content, workspaceColor);
    } else if (type === 'project') {
      if (!workspaceId) return;
      onAddProject(workspaceId, content);
    } else {
      if (!projectId) return;
      onAddItem(content, date, projectId);
    }
    setContent('');
    onClose();
  };

  const types = [
    { value: 'item', label: 'Item', icon: CheckSquare },
    { value: 'project', label: 'Project', icon: FolderKanban },
    { value: 'workspace', label: 'Org', icon: Building2 },
  ] as const;

  const colors = [1, 2, 3, 4, 5];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Add New</h2>
              <button onClick={onClose} className="p-1 rounded hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Type selector */}
              <div className="flex gap-1 flex-wrap">
                {types.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-all ${
                      type === value 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary/50 text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>
              
              {/* Workspace color picker */}
              {type === 'workspace' && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Color</label>
                  <div className="flex gap-2">
                    {colors.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setWorkspaceColor(c)}
                        className={`w-6 h-6 rounded-full transition-all ${workspaceColor === c ? 'ring-2 ring-offset-2 ring-offset-card ring-primary' : ''}`}
                        style={{ backgroundColor: `hsl(var(--workspace-${c}))` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Workspace selector for project */}
              {type === 'project' && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Organization</label>
                  <select
                    value={workspaceId}
                    onChange={(e) => setWorkspaceId(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-secondary border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    {workspaces.map(ws => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Project selector for task/note/diary */}
              {(type === 'task' || type === 'note' || type === 'diary') && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Project</label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-secondary border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.workspaceName} → {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-secondary border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                </>
              )}
              
              {/* Content */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  {type === 'workspace' ? 'Organization Name' : type === 'project' ? 'Project Name' : type === 'task' ? 'Task Title' : 'Content'}
                </label>
                {type === 'task' || type === 'workspace' || type === 'project' ? (
                  <input
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={type === 'workspace' ? 'e.g. Acme Corp' : type === 'project' ? 'e.g. Website Redesign' : 'What needs to be done?'}
                    className="w-full px-3 py-2 rounded bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                ) : (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={type === 'diary' ? "How are you feeling today?" : "Write your note..."}
                    rows={2}
                    className="w-full px-3 py-2 rounded bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                  />
                )}
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-3 py-2 rounded bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!content.trim()}
                  className="flex-1 px-3 py-2 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
