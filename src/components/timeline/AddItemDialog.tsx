import { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { CheckSquare, Flag, FolderGit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const COLORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface ProjectOption {
  id: string;
  name: string;
  workspaceName: string;
}

interface SubProjectOption {
  id: string;
  title: string;
  projectId: string;
}

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (title: string, date: string, projectId: string, subProjectId?: string, color?: number) => void;
  onAddMilestone: (projectId: string, title: string, date: string, color?: number) => void;
  onAddSubProject: (projectId: string, title: string, startDate: string, endDate: string, color?: number) => void;
  projects: ProjectOption[];
  subProjects: SubProjectOption[];
  activeProjectId?: string;
}

type ItemType = 'task' | 'milestone' | 'sub-project';

export function AddItemDialog({
  isOpen,
  onClose,
  onAddItem,
  onAddMilestone,
  onAddSubProject,
  projects,
  subProjects,
  activeProjectId
}: AddItemDialogProps) {
  const [type, setType] = useState<ItemType>('task');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 5), 'yyyy-MM-dd'));
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [subProjectId, setSubProjectId] = useState<string>('');
  const [color, setColor] = useState<number>(3);

  // Get sub-projects for the selected project
  const availableSubProjects = subProjects.filter(sp => sp.projectId === projectId);

  // Reset form when dialog opens, pre-select active project
  useEffect(() => {
    if (isOpen) {
      setType('task');
      setTitle('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setEndDate(format(addDays(new Date(), 5), 'yyyy-MM-dd'));
      // Pre-select active project if available, otherwise first project
      const defaultProjectId = activeProjectId && projects.some(p => p.id === activeProjectId)
        ? activeProjectId
        : projects[0]?.id || '';
      setProjectId(defaultProjectId);
      setSubProjectId('');
      setColor(3);
    }
  }, [isOpen, projects, activeProjectId]);

  // Reset sub-project when project changes
  useEffect(() => {
    setSubProjectId('');
  }, [projectId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    if (type === 'task') {
      onAddItem(title.trim(), date, projectId, subProjectId || undefined, color);
    } else if (type === 'milestone') {
      onAddMilestone(projectId, title.trim(), date, color);
    } else if (type === 'sub-project') {
      onAddSubProject(projectId, title.trim(), date, endDate, color);
    }

    setTitle('');
    onClose();
  };

  const types = [
    { value: 'task', label: 'Task', icon: CheckSquare, description: 'A single actionable item' },
    { value: 'milestone', label: 'Milestone', icon: Flag, description: 'A key date or deadline' },
    { value: 'sub-project', label: 'Sub-Project', icon: FolderGit2, description: 'A date range grouping' },
  ] as const;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Timeline</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {types.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg border transition-all ${type === value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary/30 text-foreground hover:bg-secondary border-transparent'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>

          {/* Title - always first for quick entry */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs">
              {type === 'task' ? 'Task' : type === 'milestone' ? 'Milestone' : 'Sub-Project'} Name
            </Label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === 'task'
                  ? 'What needs to be done?'
                  : type === 'milestone'
                    ? 'e.g. Launch Day'
                    : 'e.g. Design Phase'
              }
              autoFocus
              className="w-full px-2.5 py-1.5 rounded-md bg-secondary border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>

          {/* Project selector */}
          <div className="space-y-1.5">
            <Label htmlFor="project" className="text-xs">Project</Label>
            <div className="relative">
              <select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-2.5 py-1.5 pr-7 rounded-md bg-secondary border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
              >
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.workspaceName} • {project.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Sub-project selector (only for tasks if sub-projects exist) */}
          {type === 'task' && availableSubProjects.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="subproject" className="text-xs">Sub-Project (optional)</Label>
              <div className="relative">
                <select
                  id="subproject"
                  value={subProjectId}
                  onChange={(e) => setSubProjectId(e.target.value)}
                  className="w-full px-2.5 py-1.5 pr-7 rounded-md bg-secondary border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                >
                  <option value="">No sub-project</option>
                  {availableSubProjects.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.title}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                  <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Date fields */}
          <div className={`grid gap-3 ${type === 'sub-project' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-xs">
                {type === 'sub-project' ? 'Start Date' : 'Date'}
              </Label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-secondary border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {type === 'sub-project' && (
              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs">End Date</Label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-secondary border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
          </div>

          {/* Color picker */}
          <div className="space-y-1.5">
            <Label className="text-xs">Color</Label>
            <div className="grid grid-cols-6 gap-2 justify-items-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-primary' : ''
                    }`}
                  style={{ backgroundColor: `hsl(var(--workspace-${c}))` }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" className="flex-1 text-xs" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="flex-1 text-xs" disabled={!title.trim() || !projectId}>
              Add {type === 'task' ? 'Task' : type === 'milestone' ? 'Milestone' : 'Sub-Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
