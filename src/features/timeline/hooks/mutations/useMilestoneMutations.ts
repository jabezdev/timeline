import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { Milestone } from '@/types/timeline';

export function useMilestoneMutations() {
    const createFn = useMutation(api.milestones.create);
    const updateFn = useMutation(api.milestones.update);
    const removeFn = useMutation(api.milestones.remove);
    const reorderFn = useMutation(api.milestones.reorder);

    const addMilestone = {
        mutate: (m: Omit<Milestone, 'id'>) => {
            createFn({
                projectId: m.projectId as Id<'projects'>,
                title: m.title,
                date: m.date,
                content: m.content,
                color: m.color,
                position: m.position,
            }).catch(err => console.error('addMilestone failed:', err));
        },
    };

    const updateMilestone = {
        mutate: ({ id, updates }: { id: string; updates: Partial<Milestone> }) => {
            updateFn({
                id: id as Id<'milestones'>,
                title: updates.title,
                date: updates.date,
                content: updates.content,
                color: updates.color,
                position: updates.position,
            }).catch(err => console.error('updateMilestone failed:', err));
        },
    };

    const deleteMilestone = {
        mutate: (id: string) => {
            removeFn({ id: id as Id<'milestones'> })
                .catch(err => console.error('deleteMilestone failed:', err));
        },
    };

    const reorderMilestones = {
        mutate: (milestones: Partial<Milestone>[]) => {
            reorderFn({
                milestones: milestones.map(m => ({ id: m.id as string, position: m.position ?? 0 })),
            }).catch(err => console.error('reorderMilestones failed:', err));
        },
    };

    return { addMilestone, updateMilestone, deleteMilestone, reorderMilestones };
}


            updateTimelineDataCache((old) => ({
                ...old,
                milestones: {
                    ...old.milestones,
                    [optimId]: {
                        id: optimId,
                        ...newMilestone,
                        completed: false
                    }
                }
            }));

            return { previousState, optimId };
        },
        onError: (err, newMilestone, context) => {
            console.error('addMilestone failed:', err, newMilestone);
            if (context?.previousState) {
                queryClient.setQueryData(['timeline', 'data'], context.previousState);
            }
        },
        onSuccess: (data, variables, context) => {
            if (context?.optimId) {
                updateTimelineDataCache((old) => {
                    const milestones = { ...old.milestones };
                    if (milestones[context.optimId]) {
                        milestones[data.id] = { ...milestones[context.optimId], id: data.id };
                        delete milestones[context.optimId];
                    }
                    return { ...old, milestones };
                });
            }
            queryClient.invalidateQueries({ queryKey: ['timeline', 'data'] });
        }
    });

    const updateMilestone = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Milestone> }) => api.updateMilestone(id, updates),
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'data'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'data']);

            updateTimelineDataCache((old) => ({
                ...old,
                milestones: {
                    ...old.milestones,
                    [id]: { ...old.milestones?.[id], ...updates } as Milestone
                }
            }));

            return { previousState };
        },
        onError: (err, vars, context) => {
            console.error('updateMilestone failed:', err, vars);
            if (context?.previousState) {
                queryClient.setQueryData(['timeline', 'data'], context.previousState);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['timeline', 'data'] });
        }
    });

    const deleteMilestone = useMutation({
        mutationFn: api.deleteMilestone,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'data'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'data']);

            updateTimelineDataCache((old) => {
                const milestones = { ...old.milestones };
                delete milestones[id];
                return { ...old, milestones };
            });

            return { previousState };
        },
        onError: (err, id, context) => {
            console.error('deleteMilestone failed:', err, id);
            if (context?.previousState) {
                queryClient.setQueryData(['timeline', 'data'], context.previousState);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['timeline', 'data'] });
        }
    });

    const reorderMilestones = useMutation({
        mutationFn: api.reorderMilestones,
        onMutate: async () => {
            // Optimistic update logic if needed
            return {};
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['timeline', 'data'] });
        }
    });

    return {
        addMilestone,
        updateMilestone,
        deleteMilestone,
        reorderMilestones
    };
}
