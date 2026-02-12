import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TimelineState, Project } from '@/types/timeline';

export function useProjectMutations(
    updateTimelineDataCache: (updater: (oldData: Partial<TimelineState>) => Partial<TimelineState>) => void,
    updateStructureCache: (updater: (oldData: Partial<TimelineState>) => Partial<TimelineState>) => void
) {
    const queryClient = useQueryClient();

    const addProject = useMutation({
        mutationFn: api.createProject,
        onMutate: async (newProject) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'structure'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'structure']);
            const optimId = `temp-proj-${Date.now()}`;

            updateStructureCache((old) => {
                const projects = { ...old.projects };
                projects[optimId] = {
                    id: optimId,
                    ...newProject,
                    color: newProject.color?.toString(),
                    isHidden: false
                } as Project;
                return { ...old, projects };
            });

            return { previousState, optimId };
        },
        onError: (err, newProject, context) => {
            if (context?.previousState) {
                queryClient.setQueryData(['timeline', 'structure'], context.previousState);
            }
        },
        onSuccess: (data, variables, context) => {
            if (context?.optimId) {
                updateStructureCache((old) => {
                    const projects = { ...old.projects };
                    if (projects[context.optimId]) {
                        projects[data.id] = { ...projects[context.optimId], id: data.id };
                        delete projects[context.optimId];
                    }
                    return { ...old, projects };
                });
            }
            queryClient.invalidateQueries({ queryKey: ['timeline', 'structure'] });
        }
    });

    const updateProject = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Project> }) => api.updateProject(id, updates),
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'structure'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'structure']);

            updateStructureCache((old) => {
                const projects = { ...old.projects };
                if (projects[id]) {
                    projects[id] = { ...projects[id], ...updates };
                }
                return { ...old, projects };
            });

            return { previousState };
        },
        onError: (err, vars, context) => {
            if (context?.previousState) {
                queryClient.setQueryData(['timeline', 'structure'], context.previousState);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['timeline', 'structure'] });
        }
    });

    const deleteProject = useMutation({
        mutationFn: api.deleteProject,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'structure'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'structure']);

            updateStructureCache((old) => {
                const projects = { ...old.projects };
                delete projects[id];
                return { ...old, projects };
            });

            return { previousState };
        },
        onError: (err, id, context) => {
            if (context?.previousState) {
                queryClient.setQueryData(['timeline', 'structure'], context.previousState);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['timeline', 'structure'] });
            queryClient.invalidateQueries({ queryKey: ['timeline', 'data'] });
        }
    });

    const reorderProjects = useMutation({
        mutationFn: (projectIds: string[]) => {
            const projectsToUpdate = projectIds.map((id, index) => ({ id, position: index }));
            return api.reorderProjects(projectsToUpdate);
        },
        onMutate: async (projectIds) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'structure'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'structure']);

            // Optimistic update for reordering is complex as position is property of Project, not a separate list
            // and we might not have all projects in memory if strictly following structure optimization
            // For simplicity, we might just invalidate or try to update local store if we had order as array
            // But here structure.projects is map. Projects have 'position' field.

            updateStructureCache((old) => {
                const projects = { ...old.projects };
                projectIds.forEach((id, index) => {
                    if (projects[id]) {
                        projects[id] = { ...projects[id], position: index };
                    }
                });
                return { ...old, projects };
            });

            return { previousState };
        },
        onError: (err, vars, context) => {
            if (context?.previousState) {
                queryClient.setQueryData(['timeline', 'structure'], context.previousState);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['timeline', 'structure'] });
        }
    });

    return {
        addProject,
        updateProject,
        deleteProject,
        reorderProjects
    };
}
