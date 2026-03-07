import { useMemo } from 'react';
import { useStructureQuery, useTimelineDataQuery } from '@/hooks/useTimelineQueries';
import { TimelineState } from '@/types/timeline';
import { addDays } from 'date-fns';

export function useTimelineData(startDate: Date, visibleDays: number) {
    // Pass Unix ms timestamps directly — no ISO string conversion
    const startTs = startDate.getTime();
    const endTs = addDays(startDate, visibleDays).getTime();

    const structure = useStructureQuery();
    const timeline = useTimelineDataQuery({ startDate: startTs, endDate: endTs });

    const isLoading = structure.isLoading || timeline.isLoading;
    const isError = structure.isError || timeline.isError;
    const error = structure.error || timeline.error;

    // Merge data
    const data: TimelineState = useMemo(() => ({
        workspaces: structure.data?.workspaces || {},
        workspaceOrder: structure.data?.workspaceOrder || [],
        projects: structure.data?.projects || {},
        subProjects: timeline.data?.subProjects || {},
        milestones: timeline.data?.milestones || {},
        items: timeline.data?.items || {},
        userSettings: structure.data?.userSettings
            ? { ...structure.data.userSettings, theme: structure.data.userSettings.theme as 'light' | 'dark' | 'system' | undefined }
            : undefined,
        currentDate: startDate.toISOString().slice(0, 10),
        visibleDays,
        isSyncing: isLoading,
    }), [structure.data, timeline.data, startDate, visibleDays, isLoading]);

    return {
        data,
        isLoading,
        isError,
        error,
        refetch: () => {
            structure.refetch();
            timeline.refetch();
        }
    };
}
