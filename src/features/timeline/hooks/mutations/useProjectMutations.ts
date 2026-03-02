import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { Project } from '@/types/timeline';

export function useProjectMutations() {
    const createFn = useMutation(api.projects.create);
    const updateFn = useMutation(api.projects.update);
    const removeFn = useMutation(api.projects.remove);
    const reorderFn = useMutation(api.projects.reorder);

    const addProject = {
        mutate: (p: Omit<Project, 'id' | 'isCollapsed'> & { workspaceId: string }) => {
            createFn({
                workspaceId: p.workspaceId as Id<'workspaces'>,
                name: p.name,
                color: p.color,
                position: p.position ?? 0,
                isHidden: p.isHidden ?? false,
            }).catch(err => console.error('addProject failed:', err));
        },
    };

    const updateProject = {
        mutate: ({ id, updates }: { id: string; updates: Partial<Project> }) => {
            updateFn({
                id: id as Id<'projects'>,
                name: updates.name,
                color: updates.color,
                position: updates.position,
                workspaceId: updates.workspaceId as Id<'workspaces'> | undefined,
                isHidden: updates.isHidden,
            }).catch(err => console.error('updateProject failed:', err));
        },
    };

    const deleteProject = {
        mutate: (id: string) => {
            removeFn({ id: id as Id<'projects'> })
                .catch(err => console.error('deleteProject failed:', err));
        },
    };

    const reorderProjects = {
        mutate: ({ projectIds }: { workspaceId: string; projectIds: string[] }) => {
            reorderFn({ projectIds })
                .catch(err => console.error('reorderProjects failed:', err));
        },
    };

    return { addProject, updateProject, deleteProject, reorderProjects };
}
