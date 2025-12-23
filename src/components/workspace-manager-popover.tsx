import { useState } from 'react';
import { Building2, FolderKanban, GripVertical, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {

} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTimelineStore } from '@/hooks/useTimelineStore'; // Likely still used for UI state? No, we removed everything from it. Check if we need it.
// We removed reorder/etc from store.
// We might still need it for some UI state? WorkspaceManagerPopover doesn't seem to use UI state from store (like sidebar collapsed).
// It uses local state for expanded.
import { useTimelineData } from '@/hooks/useTimelineData';
import { useTimelineMutations } from '@/hooks/useTimelineMutations';
import { Workspace, Project } from '@/types/timeline';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

const COLORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface SortableWorkspaceItemProps {
  workspace: Workspace;
  projects: Project[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (updates: Partial<Workspace>) => void;
  onDelete: () => void;
  onToggleHidden: () => void;
  onAddProject: (name: string) => void;
  onEditProject: (project: Project, updates: Partial<Project>) => void;
  onDeleteProject: (project: Project) => void;
  onToggleProjectHidden: (project: Project) => void;
  onReorderProjects: (projectIds: string[]) => void;
}

function SortableWorkspaceItem({
  workspace,
  projects,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggleHidden,
  onAddProject,
  onEditProject,
  onDeleteProject,
  onToggleProjectHidden,
  onReorderProjects,
}: SortableWorkspaceItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workspace.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleProjectDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = projects.findIndex((p) => p.id === active.id);
      const newIndex = projects.findIndex((p) => p.id === over.id);
      const newOrderIds = arrayMove(projects.map(p => p.id), oldIndex, newIndex);
      onReorderProjects(newOrderIds);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="border border-border rounded-lg mb-2 bg-card">
      <div className="flex items-center gap-2 p-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab hover:bg-secondary rounded p-1 touch-none"

        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>

        <button onClick={onToggleExpand} className="p-1 hover:bg-secondary rounded">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        <div
          className="w-5 h-5 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: `hsl(var(--workspace-${workspace.color}) / 0.2)` }}
        >
          <Building2
            className="w-3 h-3"
            style={{ color: `hsl(var(--workspace-${workspace.color}))` }}
          />
        </div>

        <span className={cn("flex-1 text-sm font-medium truncate", workspace.isHidden && "text-muted-foreground/50 italic")}>{workspace.name}</span>

        <EditWorkspacePopover workspace={workspace} onEdit={onEdit} />

        <button onClick={onToggleHidden} className="p-1 hover:bg-secondary rounded" title={workspace.isHidden ? "Show Workspace" : "Hide Workspace"}>
          {workspace.isHidden ? (
            <EyeOff className="w-3.5 h-3.5 text-muted-foreground/70" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
        <button onClick={onDelete} className="p-1 hover:bg-destructive/10 rounded">
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </button>
      </div>

      {isExpanded && (
        <div className="px-2 pb-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleProjectDragEnd}
          >
            <SortableContext
              items={projects.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {projects.map((project) => (
                <SortableProjectItem
                  key={project.id}
                  project={project}
                  workspaceColor={Number(workspace.color)}
                  onEdit={(updates) => onEditProject(project, updates)}
                  onDelete={() => onDeleteProject(project)}
                  onToggleHidden={() => onToggleProjectHidden(project)}
                />
              ))}
            </SortableContext>
          </DndContext>

          <AddProjectPopover workspaceId={workspace.id} onAdd={onAddProject} />
        </div>
      )}
    </div>
  );
}

function EditWorkspacePopover({ workspace, onEdit }: { workspace: Workspace; onEdit: (updates: Partial<Workspace>) => void }) {
  const [name, setName] = useState(workspace.name);
  const [color, setColor] = useState(Number(workspace.color));
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onEdit({ name: name.trim(), color: String(color) });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="p-1 hover:bg-secondary rounded">
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start" side="right" onInteractOutside={(e) => e.preventDefault()}>
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Edit Organization</h4>
          <div className="space-y-2">
            <Label htmlFor={`edit-ws-name-${workspace.id}`}>Name</Label>
            <Input
              id={`edit-ws-name-${workspace.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-6 gap-2 justify-items-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-primary' : ''
                    }`}
                  style={{ backgroundColor: `hsl(var(--workspace-${c}))` }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={!name.trim()}>Save</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AddProjectPopover({ workspaceId, onAdd }: { workspaceId: string; onAdd: (name: string) => void }) {
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 w-full mt-1 p-2 text-xs text-muted-foreground hover:bg-secondary rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Project
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start" side="right" onInteractOutside={(e) => e.preventDefault()}>
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Add Project</h4>
          <div className="space-y-2">
            <Label htmlFor={`add-proj-name-${workspaceId}`}>Name</Label>
            <Input
              id={`add-proj-name-${workspaceId}`}
              placeholder="e.g. Website Redesign"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={!name.trim()}>Add</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface SortableProjectItemProps {
  project: Project;
  workspaceColor: number;
  onEdit: (updates: Partial<Project>) => void;
  onDelete: () => void;
  onToggleHidden: () => void;
}

function SortableProjectItem({ project, workspaceColor, onEdit, onDelete, onToggleHidden }: SortableProjectItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 p-2 ml-6 rounded hover:bg-secondary/50"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab hover:bg-secondary rounded p-0.5 touch-none"

      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      <FolderKanban
        className="w-3.5 h-3.5 shrink-0"
        style={{ color: `hsl(var(--workspace-${workspaceColor}))` }}
      />

      <span className={cn("flex-1 text-xs truncate", project.isHidden && "text-muted-foreground/50 italic")}>{project.name}</span>

      <EditProjectPopover project={project} onEdit={onEdit} />

      <button onClick={onToggleHidden} className="p-0.5 hover:bg-secondary rounded opacity-0 group-hover:opacity-100 transition-opacity" title={project.isHidden ? "Show Project" : "Hide Project"}>
        {project.isHidden ? (
          <EyeOff className="w-3 h-3 text-muted-foreground/70" />
        ) : (
          <Eye className="w-3 h-3 text-muted-foreground" />
        )}
      </button>
      <button onClick={onDelete} className="p-0.5 hover:bg-destructive/10 rounded opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 className="w-3 h-3 text-destructive" />
      </button>
    </div>
  );
}

function EditProjectPopover({ project, onEdit }: { project: Project; onEdit: (updates: Partial<Project>) => void }) {
  const [name, setName] = useState(project.name);
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onEdit({ name: name.trim() });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="p-0.5 hover:bg-secondary rounded opacity-0 group-hover:opacity-100 transition-opacity">
          <Pencil className="w-3 h-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start" side="right" onInteractOutside={(e) => e.preventDefault()}>
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Edit Project</h4>
          <div className="space-y-2">
            <Label htmlFor={`edit-proj-name-${project.id}`}>Name</Label>
            <Input
              id={`edit-proj-name-${project.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={!name.trim()}>Save</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AddWorkspacePopover({ onAdd }: { onAdd: (name: string, color: number) => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(1);
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), color);
    setName('');
    setColor(1);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Org
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start" side="right" onInteractOutside={(e) => e.preventDefault()}>
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Add Organization</h4>
          <div className="space-y-2">
            <Label htmlFor="add-ws-name">Name</Label>
            <Input
              id="add-ws-name"
              placeholder="e.g. Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-6 gap-2 justify-items-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-primary' : ''
                    }`}
                  style={{ backgroundColor: `hsl(var(--workspace-${c}))` }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={!name.trim()}>Add</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function WorkspaceManagerPopover() {
  const { data: timelineState } = useTimelineData(new Date(), 14);
  const {
    workspaces,
    workspaceOrder,
    projects
  } = timelineState || { workspaces: {}, workspaceOrder: [], projects: {} };

  const mutations = useTimelineMutations();

  const addWorkspace = (name: string, color: number) => mutations.addWorkspace.mutate({ name, color });
  const updateWorkspace = (id: string, updates: Partial<Workspace>) => mutations.updateWorkspace.mutate({ id, updates });
  const deleteWorkspace = (id: string) => mutations.deleteWorkspace.mutate(id);

  const addProject = (workspaceId: string, name: string) => mutations.addProject.mutate({ workspaceId, name, color: 1, position: 0 }); // Default color/pos
  const updateProject = (id: string, updates: Partial<Project>) => mutations.updateProject.mutate({ id, updates });
  const deleteProject = (id: string) => mutations.deleteProject.mutate(id);

  const reorderWorkspaces = (orderedWorkspaces: Partial<Workspace>[]) => mutations.reorderWorkspaces.mutate(orderedWorkspaces);
  const reorderProjects = (workspaceId: string, ids: string[]) => mutations.reorderProjects.mutate({ workspaceId, projectIds: ids });


  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleExpand = (id: string) => {
    setExpandedWorkspaces((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleWorkspaceDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = workspaceOrder.indexOf(active.id as string);
      const newIndex = workspaceOrder.indexOf(over.id as string);
      const newOrderIds = arrayMove(workspaceOrder, oldIndex, newIndex);
      // Map to objects with new positions
      const updates = newOrderIds.map((id, index) => ({
        id,
        position: index
      }));
      reorderWorkspaces(updates);
    }
  };


  const handleDeleteWorkspace = () => {
    if (!deletingWorkspace) return;
    deleteWorkspace(deletingWorkspace.id);
    setDeletingWorkspace(null);
  };

  const handleDeleteProject = () => {
    if (!deletingProject) return;
    deleteProject(deletingProject.id);
    setDeletingProject(null);
  };

  const sortedWorkspaces = workspaceOrder
    .map(id => workspaces[id])
    .filter((w): w is Workspace => !!w);

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" title="Manage Workspaces">
            <Building2 className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">Manage Workspaces</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Workspaces & Projects</h4>
              <AddWorkspacePopover onAdd={addWorkspace} />
            </div>

            <p className="text-xs text-muted-foreground">
              Drag to reorder workspaces and projects.
            </p>

            <div className="max-h-[400px] overflow-y-auto pr-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleWorkspaceDragEnd}
              >
                <SortableContext
                  items={workspaceOrder}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedWorkspaces.map((workspace) => {
                    const workspaceProjects = Object.values(projects)
                      .filter(p => p.workspaceId === workspace.id)
                      .sort((a, b) => (a.position || 0) - (b.position || 0));

                    return (
                      <SortableWorkspaceItem
                        key={workspace.id}
                        workspace={workspace}
                        projects={workspaceProjects}
                        isExpanded={expandedWorkspaces.has(workspace.id)}
                        onToggleExpand={() => toggleExpand(workspace.id)}
                        onEdit={(updates) => updateWorkspace(workspace.id, updates)}
                        onDelete={() => setDeletingWorkspace(workspace)}
                        onToggleHidden={() => updateWorkspace(workspace.id, { isHidden: !workspace.isHidden })}
                        onAddProject={(name) => addProject(workspace.id, name)}
                        onEditProject={(p, updates) => updateProject(p.id, updates)}
                        onDeleteProject={(p) => setDeletingProject(p)}
                        onToggleProjectHidden={(p) => updateProject(p.id, { isHidden: !p.isHidden })}
                        onReorderProjects={(ids) => reorderProjects(workspace.id, ids)}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </PopoverContent>
      </Popover>



      {/* Delete Workspace Confirmation */}
      <AlertDialog open={!!deletingWorkspace} onOpenChange={(open) => !open && setDeletingWorkspace(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingWorkspace?.name}" and all its projects, sub-projects, tasks, and milestones. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteWorkspace} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Project Confirmation */}
      <AlertDialog open={!!deletingProject} onOpenChange={(open) => !open && setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingProject?.name}" and all its sub-projects, tasks, and milestones. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

