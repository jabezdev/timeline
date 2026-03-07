import { useMutation } from 'convex/react';
import { useSyncTracker } from '@/hooks/useSyncTracker';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { UserSettings } from '@/types/timeline';

import { useWorkspaceMutations } from '@/features/timeline/hooks/mutations/useWorkspaceMutations';
import { useProjectMutations } from '@/features/timeline/hooks/mutations/useProjectMutations';
import { useItemMutations } from '@/features/timeline/hooks/mutations/useItemMutations';
import { useMilestoneMutations } from '@/features/timeline/hooks/mutations/useMilestoneMutations';

export function useTimelineMutations() {
    const track = useSyncTracker();
    const upsertSettingsMutation = useMutation(api.userSettings.upsert);

    // --- User Settings ---
    const updateUserSettings = {
        mutate: (settings: {
            theme?: string;
            systemAccent?: string;
            colorMode?: "full" | "monochromatic";
            blurEffectsEnabled?: boolean;
            workspaceOrder?: string[];
            openProjectIds?: string[];
        }) => {
            const description = 'Updating user settings';

            const mutationWithOptimism = upsertSettingsMutation.withOptimisticUpdate((localStore, args) => {
                const existing = localStore.getQuery(api.workspaces.getStructure, {});
                if (!existing || !existing.userSettings) return;

                const updatedSettings = {
                    ...existing.userSettings,
                    theme: args.theme ?? existing.userSettings.theme,
                    systemAccent: args.systemAccent ?? existing.userSettings.systemAccent,
                    colorMode: (args.colorMode as any) ?? existing.userSettings.colorMode,
                    blurEffectsEnabled: args.blurEffectsEnabled ?? existing.userSettings.blurEffectsEnabled,
                    workspaceOrder: (args.workspaceOrder as any) ?? existing.userSettings.workspaceOrder,
                    openProjectIds: (args.openProjectIds as any) ?? existing.userSettings.openProjectIds,
                };

                localStore.setQuery(api.workspaces.getStructure, {}, {
                    ...existing,
                    userSettings: updatedSettings,
                });
            });

            track(mutationWithOptimism({
                theme: settings.theme,
                systemAccent: settings.systemAccent,
                colorMode: settings.colorMode,
                blurEffectsEnabled: settings.blurEffectsEnabled,
                workspaceOrder: settings.workspaceOrder as Id<'workspaces'>[] | undefined,
                openProjectIds: settings.openProjectIds as Id<'projects'>[] | undefined,
            }), description).catch(err => console.error('updateUserSettings failed:', err));
        },
        isPending: false,
    };

    const workspaceMutations = useWorkspaceMutations();
    const projectMutations = useProjectMutations();
    const itemMutations = useItemMutations();
    const milestoneMutations = useMilestoneMutations();

    return {
        ...workspaceMutations,
        ...projectMutations,
        ...itemMutations,
        ...milestoneMutations,
        updateUserSettings,
    };
}

