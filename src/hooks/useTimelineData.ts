import { useMemo } from 'react';
import { useStructureQuery, useTimelineDataQuery } from '@/hooks/useTimelineQueries';
import { TimelineState } from '@/types/timeline';
import { addDays, format } from 'date-fns';

export function useTimelineData(startDate: Date, visibleDays: number) {
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(addDays(startDate, visibleDays), 'yyyy-MM-dd');

    const structure = useStructureQuery();
    const timeline = useTimelineDataQuery({ startDate: startStr, endDate: endStr });

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
        // UI State placeholders (handled elsewhere or default)
        openProjectIds: [],
        currentDate: startStr,
        visibleDays,
        isSyncing: isLoading,
    }), [structure.data, timeline.data, startStr, visibleDays, isLoading]);

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
