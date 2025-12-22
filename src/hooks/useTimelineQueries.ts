import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TimelineState } from '@/types/timeline';

export function useStructureQuery() {
    return useQuery({
        queryKey: ['timeline', 'structure'],
        queryFn: () => api.fetchStructure(),
        staleTime: Infinity, // Structure changes rarely
    });
}

interface TimelineDateRange {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
}

export function useTimelineDataQuery({ startDate, endDate }: TimelineDateRange) {
    return useQuery({
        queryKey: ['timeline', 'data', { startDate, endDate }],
        queryFn: () => api.fetchTimelineData(startDate, endDate),
        // Make remote DB the priority. Always refetch on focus.
        staleTime: 0,
        enabled: !!startDate && !!endDate,
    });
}
