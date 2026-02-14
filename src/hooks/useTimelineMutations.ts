import { useMutation, useQueryClient } from '@tanstack/react-query';
import { flushSync } from 'react-dom';
import { api } from '@/lib/api';
import { TimelineState } from '@/types/timeline';

import { useWorkspaceMutations } from '@/features/timeline/hooks/mutations/useWorkspaceMutations';
import { useProjectMutations } from '@/features/timeline/hooks/mutations/useProjectMutations';
import { useItemMutations } from '@/features/timeline/hooks/mutations/useItemMutations';
import { useMilestoneMutations } from '@/features/timeline/hooks/mutations/useMilestoneMutations';

export function useTimelineMutations() {
    const queryClient = useQueryClient();

    // Helper to optimistically update Timeline Data (Items, Milestones, SubProjects)
    const updateTimelineDataCache = (updater: (oldData: Partial<TimelineState>) => Partial<TimelineState>) => {
        flushSync(() => {
            queryClient.setQueriesData({ queryKey: ['timeline', 'data'] }, (oldData: Partial<TimelineState> | undefined) => {
                if (!oldData) return oldData;
                return updater(oldData);
            });
        });
    };

    // Helper to optimistically update Structure Data (Workspaces, Projects)
    const updateStructureCache = (updater: (oldData: Partial<TimelineState>) => Partial<TimelineState>) => {
        flushSync(() => {
            queryClient.setQueryData(['timeline', 'structure'], (oldData: Partial<TimelineState> | undefined) => {
                if (!oldData) return { workspaces: {}, projects: {}, subProjects: {}, milestones: {}, items: {} };
                return updater(oldData);
            });
        });
    };

    // --- User Settings ---
    // Kept here as it's global
    const updateUserSettings = useMutation({
        mutationFn: api.updateUserSettings,
        onMutate: async (newSettings) => {
            await queryClient.cancelQueries({ queryKey: ['timeline', 'structure'] });
            const previousState = queryClient.getQueryData<Partial<TimelineState>>(['timeline', 'structure']);

            updateStructureCache((old) => ({
                ...old,
                userSettings: { ...old.userSettings, ...newSettings }
            }));

            return { previousState };
        },
        onSuccess: (_data, newSettings) => {
            // Re-apply settings to cache after DB write confirms.
            // This guards against stale refetches (e.g. from workspace/project
            // mutations that invalidate ['timeline', 'structure']) overwriting
            // the optimistic update with old DB data.
            updateStructureCache((old) => ({
                ...old,
                userSettings: { ...old.userSettings, ...newSettings }
            }));
        },
        onError: (err, newSettings, context) => {
            console.error('Failed to save user settings:', err);
            if (context?.previousState) {
                queryClient.setQueryData(['timeline', 'structure'], context.previousState);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['timeline', 'structure'] });
        }
    });

    const workspaceMutations = useWorkspaceMutations(updateTimelineDataCache, updateStructureCache);
    const projectMutations = useProjectMutations(updateTimelineDataCache, updateStructureCache);
    const itemMutations = useItemMutations(updateTimelineDataCache);
    const milestoneMutations = useMilestoneMutations(updateTimelineDataCache);

    return {
        ...workspaceMutations,
        ...projectMutations,
        ...itemMutations,
        ...milestoneMutations,
        updateUserSettings
    };
}
