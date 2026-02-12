import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { GripVertical, ChevronDown, ChevronRight, Building2, Eye, EyeOff, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Workspace, Project } from '@/types/timeline';
import { EditWorkspaceDialog } from './dialogs/EditWorkspaceDialog';
import { SortableProjectItem } from './SortableProjectItem';

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

export function SortableWorkspaceItem({
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

    const [isAddingProject, setIsAddingProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');

    const handleAddProjectSubmit = () => {
        if (!newProjectName.trim()) return;
        onAddProject(newProjectName.trim());
        setNewProjectName('');
        setIsAddingProject(false);
    };

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

                <EditWorkspaceDialog workspace={workspace} onEdit={onEdit} />

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

                    {isAddingProject ? (
                        <div className="flex items-center gap-2 mt-2 ml-6">
                            <Input
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                placeholder="Project Name"
                                className="h-7 text-xs"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddProjectSubmit(); }}
                            />
                            <Button size="sm" className="h-7" onClick={handleAddProjectSubmit}>Add</Button>
                            <Button size="sm" variant="ghost" className="h-7" onClick={() => setIsAddingProject(false)}>Cancel</Button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAddingProject(true)}
                            className="flex items-center gap-2 mt-1 p-2 text-xs text-muted-foreground hover:bg-secondary rounded transition-colors ml-6 w-[calc(100%-24px)]"
                        >
                            <Plus className="w-3 h-3" />
                            Add Project
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
