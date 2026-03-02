import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { UserSettings } from '@/types/timeline';

import { useWorkspaceMutations } from '@/features/timeline/hooks/mutations/useWorkspaceMutations';
import { useProjectMutations } from '@/features/timeline/hooks/mutations/useProjectMutations';
import { useItemMutations } from '@/features/timeline/hooks/mutations/useItemMutations';
import { useMilestoneMutations } from '@/features/timeline/hooks/mutations/useMilestoneMutations';

export function useTimelineMutations() {
    const upsertSettings = useMutation(api.userSettings.upsert);

    // --- User Settings ---
    const updateUserSettings = {
        mutate: (settings: Partial<UserSettings>) => {
            upsertSettings({
                theme: settings.theme,
                systemAccent: settings.systemAccent,
                colorMode: settings.colorMode,
                blurEffectsEnabled: settings.blurEffectsEnabled,
                workspaceOrder: settings.workspaceOrder,
                openProjectIds: settings.openProjectIds,
            }).catch(err => console.error('updateUserSettings failed:', err));
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

