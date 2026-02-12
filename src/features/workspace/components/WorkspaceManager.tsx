import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
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
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { AddWorkspaceDialog } from './dialogs/AddWorkspaceDialog';
import { SortableWorkspaceItem } from './SortableWorkspaceItem';

export function WorkspaceManager() {
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
            <div className="flex flex-col h-full space-y-3">
                <div className="flex items-center justify-between shrink-0">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workspaces & Projects</h4>
                    <AddWorkspaceDialog onAdd={addWorkspace} />
                </div>

                <div className="flex-1 overflow-y-auto pr-1 -mr-2 scrollbar-hide">
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

                    {sortedWorkspaces.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground/50 border-2 border-dashed border-border/50 rounded-lg h-32">
                            <span className="text-xs">No workspaces yet.</span>
                            <span className="text-[10px]">Add one to get started.</span>
                        </div>
                    )}
                </div>
            </div>

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

export function WorkspaceManagerPopover() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon" title="Manage Workspaces">
                    <Building2 className="h-[1.2rem] w-[1.2rem]" />
                    <span className="sr-only">Manage Workspaces</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
                <WorkspaceManager />
            </PopoverContent>
        </Popover>
    )
}
