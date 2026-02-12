import { useMutation, useQueryClient } from '@tanstack/react-query';
import { flushSync } from 'react-dom';
import { api } from '@/lib/api';
import { TimelineState, Workspace } from '@/types/timeline';

export function useWorkspaceMutations(
    updateTimelineDataCache: (updater: (oldData: Partial<TimelineState>) => Partial<TimelineState>) => void,
    updateStructureCache: (updater: (oldData: Partial<TimelineState>) => Partial<TimelineState>) => void
) {
    const queryClient = useQueryClient();

    const addWorkspace = useMutation({
        mutationFn: api.createWorkspace,
        onMutate: async (newWorkspace) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'structure'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'structure']);
            const optimId = `temp-ws-${Date.now()}`;

            updateStructureCache((old) => {
                const workspaceOrder = old.workspaceOrder || [];
                return {
                    ...old,
                    workspaces: {
                        ...old.workspaces,
                        [optimId]: {
                            id: optimId,
                            name: newWorkspace.name,
                            color: newWorkspace.color.toString(),
                            isCollapsed: false,
                            position: workspaceOrder.length,
                            isHidden: false
                        }
                    },
                    workspaceOrder: [...workspaceOrder, optimId]
                };
            });

            return { previousState, optimId };
        },
        onError: (err, newWorkspace, context) => {
            if (context?.previousState) {
                queryClient.setQueryData(['timeline', 'structure'], context.previousState);
            }
        },
        onSuccess: (data, variables, context) => {
            // Replace optimistic ID
            if (context?.optimId) {
                updateStructureCache((old) => {
                    const workspaces = { ...old.workspaces };
                    const workspaceOrder = [...(old.workspaceOrder || [])];

                    if (workspaces[context.optimId]) {
                        workspaces[data.id] = { ...workspaces[context.optimId], id: data.id };
                        delete workspaces[context.optimId];
                    }

                    const idx = workspaceOrder.indexOf(context.optimId);
                    if (idx !== -1) workspaceOrder[idx] = data.id;

                    return { ...old, workspaces, workspaceOrder };
                });
            }
            queryClient.invalidateQueries({ queryKey: ['timeline', 'structure'] });
        }
    });

    const updateWorkspace = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Workspace> }) => api.updateWorkspace(id, updates),
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'structure'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'structure']);

            updateStructureCache((old) => ({
                ...old,
                workspaces: {
                    ...old.workspaces,
                    [id]: { ...old.workspaces?.[id], ...updates } as Workspace
                }
            }));

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

    const deleteWorkspace = useMutation({
        mutationFn: api.deleteWorkspace,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'structure'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'structure']);

            updateStructureCache((old) => {
                const workspaces = { ...old.workspaces };
                delete workspaces[id];
                return {
                    ...old,
                    workspaces,
                    workspaceOrder: old.workspaceOrder?.filter(pid => pid !== id)
                };
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

    const reorderWorkspaces = useMutation({
        mutationFn: api.reorderWorkspaces,
        onMutate: async (reorderedWorkspaces) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'structure'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'structure']);

            updateStructureCache((old) => ({
                ...old,
                workspaceOrder: reorderedWorkspaces.map(w => w.id as string)
            }));

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
        addWorkspace,
        updateWorkspace,
        deleteWorkspace,
        reorderWorkspaces
    };
}
