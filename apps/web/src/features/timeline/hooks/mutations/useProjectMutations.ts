import { useSyncTracker } from '@/hooks/useSyncTracker';
import { Project } from '@/types/timeline';
import { toast } from 'sonner';
import { useReplicache } from '@/hooks/useReplicache';

export function useProjectMutations() {
    const track = useSyncTracker();
    const rep = useReplicache();

    const addProject = {
        mutate: (p: Omit<Project, 'id' | 'isCollapsed'> & { workspaceId: string }) => {
            const description = `Adding project "${p.name}"`;
            if (!rep) return;

            const tempId = `temp-${Math.random().toString(36).substring(2, 9)}`;
            track(
                rep.mutate.createProject({
                    id: tempId,
                    name: p.name,
                    workspaceId: p.workspaceId,
                    color: p.color,
                    position: p.position,
                    isHidden: p.isHidden ?? false,
                }),
                description
            ).catch(err => toast.error('Failed to add project', { description: err?.message }));
        },
    };

    const updateProject = {
        mutate: ({ id, updates }: { id: string; updates: Partial<Project> }) => {
            const description = `Updating project "${updates.name || 'settings'}"`;
            if (!rep) return;

            track(
                rep.mutate.updateProject({ id, updates }),
                description
            ).catch(err => toast.error('Failed to update project', { description: err?.message }));
        },
    };

    const deleteProject = {
        mutate: (id: string) => {
            const description = 'Deleting project';
            if (!rep) return;

            track(
                rep.mutate.deleteProject({ id }),
                description
            ).catch(err => toast.error('Failed to delete project', { description: err?.message }));
        },
    };

    const reorderProjects = {
        mutate: (projects: Array<{ id: string; key: string }>) => {
            const description = 'Reordering projects';
            if (!rep) return;

            track(
                rep.mutate.reorderProjects({ projects }),
                description
            ).catch(err => toast.error('Failed to reorder projects', { description: err?.message }));
        },
    };

    return { addProject, updateProject, deleteProject, reorderProjects };
}
