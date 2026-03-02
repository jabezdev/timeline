import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';

// ---------------------------------------------------------------------------
// Thin wrappers around Convex reactive queries that preserve the
// { data, isLoading, isError, error, refetch } shape used throughout the app.
// Convex queries auto-update in real-time; refetch is a no-op.
// ---------------------------------------------------------------------------

export function useStructureQuery() {
    const data = useQuery(api.workspaces.getStructure);
    return {
        data: data ?? undefined,
        isLoading: data === undefined,
        isError: false,
        error: null,
        refetch: () => {},
    };
}

interface TimelineDateRange {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
}

export function useTimelineDataQuery({ startDate, endDate }: TimelineDateRange) {
    const data = useQuery(api.timelineItems.getByDateRange, { startDate, endDate });
    return {
        data: data ?? undefined,
        isLoading: data === undefined,
        isError: false,
        error: null,
        refetch: () => {},
    };
}
