import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TimelineState, TimelineItem, SubProject } from '@/types/timeline';

export function useItemMutations(
    updateTimelineDataCache: (updater: (oldData: Partial<TimelineState>) => Partial<TimelineState>) => void
) {
    const queryClient = useQueryClient();

    const addItem = useMutation({
        mutationFn: api.createItem,
        onMutate: async (newItem) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'data'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'data']);
            const optimId = `temp-item-${Date.now()}`;

            updateTimelineDataCache((old) => ({
                ...old,
                items: {
                    ...old.items,
                    [optimId]: {
                        id: optimId,
                        ...newItem,
                        completed: false
                    }
                }
            }));

            return { previousState, optimId };
        },
        onError: (err, newItem, context) => {
            if (context?.previousState) {
                queryClient.setQueryData(['timeline', 'data'], context.previousState);
            }
        },
        onSuccess: (data, variables, context) => {
            if (context?.optimId) {
                updateTimelineDataCache((old) => {
                    const items = { ...old.items };
                    if (items[context.optimId]) {
                        items[data.id] = { ...items[context.optimId], id: data.id };
                        delete items[context.optimId];
                    }
                    return { ...old, items };
                });
            }
            queryClient.invalidateQueries({ queryKey: ['timeline', 'data'] });
        }
    });

    const updateItem = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<TimelineItem> }) => api.updateItem(id, updates),
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'data'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'data']);

            updateTimelineDataCache((old) => ({
                ...old,
                items: {
                    ...old.items,
                    [id]: { ...old.items?.[id], ...updates } as TimelineItem
                }
            }));

            return { previousState };
        },
        onError: (err, vars, context) => {
            if (context?.previousState) {
                queryClient.setQueryData(['timeline', 'data'], context.previousState);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['timeline', 'data'] });
        }
    });

    const deleteItem = useMutation({
        mutationFn: api.deleteItem,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'data'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'data']);

            updateTimelineDataCache((old) => {
                const items = { ...old.items };
                delete items[id];
                return { ...old, items };
            });

            return { previousState };
        },
        onError: (err, id, context) => {
            if (context?.previousState) {
                queryClient.setQueryData(['timeline', 'data'], context.previousState);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['timeline', 'data'] });
        }
    });

    const reorderItems = useMutation({
        mutationFn: api.reorderItems,
        onMutate: async (items) => {
            // Optimistic update for reorder items inside a project/subproject container? 
            // Currently API takes list of IDs. Frontend usually just needs to invalidate or update sort orders if tracked.
            // Assuming no manual sort order field on items yet visible in this scope, or handled by backend.
            return {};
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['timeline', 'data'] });
        }
    });

    // --- SubProjects ---
    // SubProjects are like items but container-like.
    const addSubProject = useMutation({
        mutationFn: api.createSubProject,
        onMutate: async (newSP) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'data'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'data']);
            const optimId = `temp-sp-${Date.now()}`;

            updateTimelineDataCache((old) => ({
                ...old,
                subProjects: {
                    ...old.subProjects,
                    [optimId]: {
                        id: optimId,
                        ...newSP,
                        collapsed: false
                    } as SubProject
                }
            }));

            return { previousState, optimId };
        },
        onError: (err, vars, context) => {
            if (context?.previousState) {
                queryClient.setQueryData(['timeline', 'data'], context.previousState);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['timeline', 'data'] });
        }
    });

    const updateSubProject = useMutation({
        mutationFn: async ({ id, updates, childItemsToUpdate }: { id: string; updates: Partial<SubProject>; childItemsToUpdate?: Partial<TimelineItem>[] }) => {
            // 1. Update SubProject
            await api.updateSubProject(id, updates);

            // 2. Update children if any
            if (childItemsToUpdate && childItemsToUpdate.length > 0) {
                await api.batchUpdateItems(childItemsToUpdate);
            }
        },
        onMutate: async ({ id, updates, childItemsToUpdate }) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'data'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'data']);

            updateTimelineDataCache((old) => {
                const newState = {
                    ...old,
                    subProjects: {
                        ...old.subProjects,
                        [id]: { ...old.subProjects?.[id], ...updates } as SubProject
                    }
                };

                // Optimistic child updates
                if (childItemsToUpdate && childItemsToUpdate.length > 0) {
                    const newItems = { ...newState.items };
                    childItemsToUpdate.forEach(itemUpdate => {
                        if (itemUpdate.id && newItems[itemUpdate.id]) {
                            newItems[itemUpdate.id] = { ...newItems[itemUpdate.id], ...itemUpdate } as TimelineItem;
                        }
                    });
                    newState.items = newItems;
                }

                return newState;
            });

            return { previousState };
        },
        onError: (err, vars, context) => {
            if (context?.previousState) {
                queryClient.setQueryData(['timeline', 'data'], context.previousState);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['timeline', 'data'] });
        }
    });

    const deleteSubProject = useMutation({
        mutationFn: async ({ id }: { id: string; deleteItems?: boolean }) => {
            return api.deleteSubProject(id);
        },
        onMutate: async ({ id }) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'data'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'data']);

            updateTimelineDataCache((old) => {
                const subProjects = { ...old.subProjects };
                delete subProjects[id];
                return { ...old, subProjects };
            });

            return { previousState };
        },
        onError: (err, vars, context) => {
            if (context?.previousState) {
                queryClient.setQueryData(['timeline', 'data'], context.previousState);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['timeline', 'data'] });
        }
    });

    return {
        addItem,
        updateItem,
        deleteItem,
        reorderItems,
        addSubProject,
        updateSubProject,
        deleteSubProject
    };
}
