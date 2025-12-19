import { useState } from 'react';
import { Building2, FolderKanban, GripVertical, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { useTimelineStore } from '@/hooks/useTimelineStore';
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

const COLORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface SortableWorkspaceItemProps {
  workspace: Workspace;
  projects: Project[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onReorderProjects: (projectIds: string[]) => void;
}

function SortableWorkspaceItem({
  workspace,
  projects,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddProject,
  onEditProject,
  onDeleteProject,
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
          className="cursor-grab hover:bg-secondary rounded p-1"
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

        <span className="flex-1 text-sm font-medium truncate">{workspace.name}</span>

        <button onClick={onEdit} className="p-1 hover:bg-secondary rounded">
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
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
                  workspaceColor={workspace.color}
                  onEdit={() => onEditProject(project)}
                  onDelete={() => onDeleteProject(project)}
                />
              ))}
            </SortableContext>
          </DndContext>

          <button
            onClick={onAddProject}
            className="flex items-center gap-2 w-full mt-1 p-2 text-xs text-muted-foreground hover:bg-secondary rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Project
          </button>
        </div>
      )}
    </div>
  );
}

interface SortableProjectItemProps {
  project: Project;
  workspaceColor: number;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableProjectItem({ project, workspaceColor, onEdit, onDelete }: SortableProjectItemProps) {
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
      className="flex items-center gap-2 p-2 ml-6 rounded hover:bg-secondary/50"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab hover:bg-secondary rounded p-0.5"
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      <FolderKanban
        className="w-3.5 h-3.5 shrink-0"
        style={{ color: `hsl(var(--workspace-${workspaceColor}))` }}
      />

      <span className="flex-1 text-xs truncate">{project.name}</span>

      <button onClick={onEdit} className="p-0.5 hover:bg-secondary rounded opacity-0 group-hover:opacity-100 transition-opacity">
        <Pencil className="w-3 h-3 text-muted-foreground" />
      </button>
      <button onClick={onDelete} className="p-0.5 hover:bg-destructive/10 rounded opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 className="w-3 h-3 text-destructive" />
      </button>
    </div>
  );
}

export function WorkspaceManagerPopover() {
  const {
    workspaces,
    workspaceOrder,
    projects,
    addWorkspace,
    addProject,
    updateWorkspace,
    updateProject,
    deleteWorkspace,
    deleteProject,
    reorderWorkspaces,
    reorderProjects,
  } = useTimelineStore();

  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
  const [isAddWorkspaceOpen, setIsAddWorkspaceOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');

  // Form states
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceColor, setWorkspaceColor] = useState(1);
  const [projectName, setProjectName] = useState('');

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
      const newOrder = arrayMove(workspaceOrder, oldIndex, newIndex);
      reorderWorkspaces(newOrder);
    }
  };

  const handleAddWorkspace = () => {
    if (!workspaceName.trim()) return;
    addWorkspace(workspaceName.trim(), workspaceColor);
    setWorkspaceName('');
    setWorkspaceColor(1);
    setIsAddWorkspaceOpen(false);
  };

  const handleEditWorkspace = () => {
    if (!editingWorkspace || !workspaceName.trim()) return;
    updateWorkspace(editingWorkspace.id, { name: workspaceName.trim(), color: workspaceColor });
    setWorkspaceName('');
    setWorkspaceColor(1);
    setEditingWorkspace(null);
  };

  const handleDeleteWorkspace = () => {
    if (!deletingWorkspace) return;
    deleteWorkspace(deletingWorkspace.id);
    setDeletingWorkspace(null);
  };

  const handleAddProject = () => {
    if (!projectName.trim() || !selectedWorkspaceId) return;
    addProject(selectedWorkspaceId, projectName.trim());
    setProjectName('');
    setSelectedWorkspaceId('');
    setIsAddProjectOpen(false);
  };

  const handleEditProject = () => {
    if (!editingProject || !projectName.trim()) return;
    updateProject(editingProject.id, { name: projectName.trim() });
    setProjectName('');
    setEditingProject(null);
  };

  const handleDeleteProject = () => {
    if (!deletingProject) return;
    deleteProject(deletingProject.id);
    setDeletingProject(null);
  };

  const openEditWorkspace = (ws: Workspace) => {
    setWorkspaceName(ws.name);
    setWorkspaceColor(ws.color);
    setEditingWorkspace(ws);
  };

  const openEditProject = (proj: Project) => {
    setProjectName(proj.name);
    setEditingProject(proj);
  };

  const openAddProject = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    setProjectName('');
    setIsAddProjectOpen(true);
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
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => {
                  setWorkspaceName('');
                  setWorkspaceColor(1);
                  setIsAddWorkspaceOpen(true);
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Org
              </Button>
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
                    const workspaceProjects = (workspace.projectIds || [])
                      .map(pid => projects[pid])
                      .filter((p): p is Project => !!p);

                    return (
                      <SortableWorkspaceItem
                        key={workspace.id}
                        workspace={workspace}
                        projects={workspaceProjects}
                        isExpanded={expandedWorkspaces.has(workspace.id)}
                        onToggleExpand={() => toggleExpand(workspace.id)}
                        onEdit={() => openEditWorkspace(workspace)}
                        onDelete={() => setDeletingWorkspace(workspace)}
                        onAddProject={() => openAddProject(workspace.id)}
                        onEditProject={openEditProject}
                        onDeleteProject={(p) => setDeletingProject(p)}
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

      {/* Add Workspace Dialog */}
      <Dialog open={isAddWorkspaceOpen} onOpenChange={setIsAddWorkspaceOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Organization</DialogTitle>
            <DialogDescription>Create a new top-level workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Name</Label>
              <Input
                id="ws-name"
                placeholder="e.g. Acme Corp"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-6 gap-2 justify-items-center">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setWorkspaceColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${workspaceColor === c ? 'ring-2 ring-offset-2 ring-offset-background ring-primary' : ''
                      }`}
                    style={{ backgroundColor: `hsl(var(--workspace-${c}))` }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddWorkspaceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddWorkspace} disabled={!workspaceName.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Workspace Dialog */}
      <Dialog open={!!editingWorkspace} onOpenChange={(open) => !open && setEditingWorkspace(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>Update workspace details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-ws-name">Name</Label>
              <Input
                id="edit-ws-name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-6 gap-2 justify-items-center">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setWorkspaceColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${workspaceColor === c ? 'ring-2 ring-offset-2 ring-offset-background ring-primary' : ''
                      }`}
                    style={{ backgroundColor: `hsl(var(--workspace-${c}))` }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWorkspace(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditWorkspace} disabled={!workspaceName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Project Dialog */}
      <Dialog open={isAddProjectOpen} onOpenChange={setIsAddProjectOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Project</DialogTitle>
            <DialogDescription>Create a new project in this organization.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="proj-name">Name</Label>
              <Input
                id="proj-name"
                placeholder="e.g. Website Redesign"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddProjectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProject} disabled={!projectName.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-proj-name">Name</Label>
              <Input
                id="edit-proj-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditProject} disabled={!projectName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

