import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { Workspace } from '@/types/timeline';

export function useWorkspaceMutations() {
    const createFn = useMutation(api.workspaces.create);
    const updateFn = useMutation(api.workspaces.update);
    const removeFn = useMutation(api.workspaces.remove);
    const reorderFn = useMutation(api.workspaces.reorder);

    const addWorkspace = {
        mutate: (w: Workspace) => {
            createFn({
                name: w.name,
                color: w.color,
                position: w.position ?? 0,
                isHidden: w.isHidden ?? false,
            }).catch(err => console.error('addWorkspace failed:', err));
        },
    };

    const updateWorkspace = {
        mutate: ({ id, updates }: { id: string; updates: Partial<Workspace> }) => {
            updateFn({
                id: id as Id<'workspaces'>,
                name: updates.name,
                color: updates.color,
                isHidden: updates.isHidden,
                position: updates.position,
            }).catch(err => console.error('updateWorkspace failed:', err));
        },
    };

    const deleteWorkspace = {
        mutate: (id: string) => {
            removeFn({ id: id as Id<'workspaces'> })
                .catch(err => console.error('deleteWorkspace failed:', err));
        },
    };

    const reorderWorkspaces = {
        mutate: (orderedWorkspaces: Partial<Workspace>[]) => {
            reorderFn({
                workspaces: orderedWorkspaces.map(w => ({
                    id: w.id as string,
                    position: w.position ?? 0,
                })),
            }).catch(err => console.error('reorderWorkspaces failed:', err));
        },
    };

    return { addWorkspace, updateWorkspace, deleteWorkspace, reorderWorkspaces };
}
