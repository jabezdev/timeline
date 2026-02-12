import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TimelineState, Milestone } from '@/types/timeline';

export function useMilestoneMutations(
    updateTimelineDataCache: (updater: (oldData: Partial<TimelineState>) => Partial<TimelineState>) => void
) {
    const queryClient = useQueryClient();

    const addMilestone = useMutation({
        mutationFn: api.createMilestone,
        onMutate: async (newMilestone) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'data'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'data']);
            const optimId = `temp-ms-${Date.now()}`;

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
