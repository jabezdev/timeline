import { useSyncTracker } from '@/hooks/useSyncTracker';
import { Workspace } from '@/types/timeline';
import { toast } from 'sonner';
import { useReplicache } from '@/hooks/useReplicache';

export function useWorkspaceMutations() {
    const track = useSyncTracker();
    const rep = useReplicache();

    const addWorkspace = {
        mutate: (w: Omit<Workspace, 'id' | 'isCollapsed'>) => {
            const description = `Adding workspace "${w.name}"`;
            if (!rep) return;

            const tempId = `temp-${Math.random().toString(36).substring(2, 9)}`;
            track(
                rep.mutate.createWorkspace({
                    id: tempId,
                    name: w.name,
                    color: w.color,
                    position: w.position,
                    isHidden: w.isHidden ?? false,
                }),
                description
            ).catch(err => toast.error('Failed to add workspace', { description: err?.message }));
        },
    };

    const updateWorkspace = {
        mutate: ({ id, updates }: { id: string; updates: Partial<Workspace> }) => {
            const description = `Updating workspace "${updates.name || 'settings'}"`;
            if (!rep) return;

            track(
                rep.mutate.updateWorkspace({ id, updates }),
                description
            ).catch(err => toast.error('Failed to update workspace', { description: err?.message }));
        },
    };

    const deleteWorkspace = {
        mutate: (id: string) => {
            const description = 'Deleting workspace';
            if (!rep) return;

            track(
                rep.mutate.deleteWorkspace({ id }),
                description
            ).catch(err => toast.error('Failed to delete workspace', { description: err?.message }));
        },
    };

    const reorderWorkspaces = {
        mutate: (workspaces: Array<{ id: string; key: string }>) => {
            const description = 'Reordering workspaces';
            if (!rep) return;

            track(
                rep.mutate.reorderWorkspaces({ workspaces }),
                description
            ).catch(err => toast.error('Failed to reorder workspaces', { description: err?.message }));
        },
    };

    return { addWorkspace, updateWorkspace, deleteWorkspace, reorderWorkspaces };
}
