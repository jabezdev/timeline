import { useState, useMemo } from 'react';
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

import { useStructureQuery } from '@/hooks/useTimelineQueries';
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
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    arrayMove,
    SortableContext,
} from '@dnd-kit/sortable';
import { generateKeyBetween } from 'fractional-indexing';

import { AddWorkspaceDialog } from './dialogs/AddWorkspaceDialog';
import { SortableWorkspaceItem } from './SortableWorkspaceItem';

export function WorkspaceManager() {
    const { data: structure } = useStructureQuery();
    const {
        workspaces,
        workspaceOrder,
        projects
    } = structure || { workspaces: {}, workspaceOrder: [], projects: {} };

    const mutations = useTimelineMutations();

    const addWorkspace = (name: string, color: number) => {
        const lastWorkspace = sortedWorkspaces[sortedWorkspaces.length - 1];
        const position = generateKeyBetween(lastWorkspace?.position, undefined);
        mutations.addWorkspace.mutate({
            name,
            color: color.toString(),
            position,
            isHidden: false,
            id: '', // Will be ignored by backend
            isCollapsed: false
        } as Workspace);
    };

    const updateWorkspace = (id: string, updates: Partial<Workspace>) => {
        const processedUpdates = { ...updates };
        if (typeof updates.color === 'number') {
            processedUpdates.color = (updates.color as number).toString();
        }
        mutations.updateWorkspace.mutate({ id, updates: processedUpdates });
    };

    const deleteWorkspace = (id: string) => mutations.deleteWorkspace.mutate(id);

    const addProject = (workspaceId: string, name: string) => {
        const workspaceProjects = Object.values(projects)
            .filter(p => p.workspaceId === workspaceId)
            .sort((a, b) => a.position.localeCompare(b.position));

        const lastProject = workspaceProjects[workspaceProjects.length - 1];
        const position = generateKeyBetween(lastProject?.position, undefined);

        mutations.addProject.mutate({
            workspaceId,
            name,
            color: '1',
            position,
            isHidden: false,
        } as any);
    };

    const updateProject = (id: string, updates: Partial<Project>) => mutations.updateProject.mutate({ id, updates });
    const deleteProject = (id: string) => mutations.deleteProject.mutate(id);

    const reorderWorkspaces = (updates: { id: string; key: string }[]) => mutations.reorderWorkspaces.mutate(updates);
    const reorderProjects = (updates: { id: string; key: string }[]) => mutations.reorderProjects.mutate(updates);


    const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
    const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null);
    const [deletingProject, setDeletingProject] = useState<Project | null>(null);

    const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
    const keyboardSensor = useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates });
    const sensors = useSensors(pointerSensor, keyboardSensor);

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

            // Generate ONE new key for the moved item to be between its new neighbors
            const movedId = active.id as string;
            const prevId = newOrderIds[newIndex - 1];
            const nextId = newOrderIds[newIndex + 1];

            const prevKey = prevId ? workspaces[prevId]?.position : undefined;
            const nextKey = nextId ? workspaces[nextId]?.position : undefined;

            const newKey = generateKeyBetween(prevKey, nextKey);

            reorderWorkspaces([{ id: movedId, key: newKey }]);
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
        .filter((w): w is Workspace => !!w)
        .sort((a, b) => a.position.localeCompare(b.position));

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
                                    .sort((a, b) => a.position.localeCompare(b.position));

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
                                        onReorderProjects={(newOrderIds) => {
                                            // Find which project moved
                                            const oldOrderIds = workspaceProjects.map(p => p.id);

                                            // Find the first index where they differ
                                            let movedIndex = -1;
                                            for (let i = 0; i < newOrderIds.length; i++) {
                                                if (newOrderIds[i] !== oldOrderIds[i]) {
                                                    // Since it's a single move, the first difference is either the item that moved OR the item it jumped over.
                                                    // dnd-kit gives us the full new list. 
                                                    // We can just find the item that is at a different index now.
                                                    // But we need to know WHERE it moved from to be sure which one it is.

                                                    // Actually, we can just look for the item that moved.
                                                    // An item moved from oldIndex to newIndex.
                                                    // The simplest way is to see which item in newOrder has neighbors that don't match oldOrder?
                                                    // No, dnd-kit `arrayMove` is predictable.

                                                    // Let's just find the one that moved.
                                                    // we can check which element is NOT where it's supposed to be.
                                                }
                                            }

                                            // Better: find the item that was at oldIndex and is now at newIndex.
                                            // But WorkspaceManager doesn't know handleDragEnd for projects, only Workspace.
                                            // SortableWorkspaceItem handles the drag end and gives us the NEW list.

                                            // We can just iterate and find the one that changed its relative position.
                                            // Or just generate a new key for the one that is different.

                                            const firstDiff = newOrderIds.findIndex((id, idx) => id !== oldOrderIds[idx]);
                                            if (firstDiff === -1) return;

                                            const lastDiff = [...newOrderIds].reverse().findIndex((id, idx) => id !== [...oldOrderIds].reverse()[idx]);
                                            const actualLastDiff = newOrderIds.length - 1 - lastDiff;

                                            // In a single move, everything between firstDiff and lastDiff shifted.
                                            // One of them is the "moved" item.
                                            // If firstDiff moved to lastDiff, or lastDiff moved to firstDiff.

                                            let movedId: string;
                                            let targetIndex: number;

                                            // Check if the item at firstDiff in newOrder was elsewhere in oldOrder
                                            const itemAtFirstDiffInNew = newOrderIds[firstDiff];
                                            const oldIdxOfThatItem = oldOrderIds.indexOf(itemAtFirstDiffInNew);

                                            if (oldIdxOfThatItem > firstDiff) {
                                                // Item moved UP to firstDiff
                                                movedId = itemAtFirstDiffInNew;
                                                targetIndex = firstDiff;
                                            } else {
                                                // Item at lastDiff in newOrder must be the one that moved DOWN
                                                movedId = newOrderIds[actualLastDiff];
                                                targetIndex = actualLastDiff;
                                            }

                                            const prevId = newOrderIds[targetIndex - 1];
                                            const nextId = newOrderIds[targetIndex + 1];

                                            const prevKey = prevId ? projects[prevId]?.position : undefined;
                                            const nextKey = nextId ? projects[nextId]?.position : undefined;

                                            const newKey = generateKeyBetween(prevKey, nextKey);
                                            reorderProjects([{ id: movedId, key: newKey }]);
                                        }}
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
