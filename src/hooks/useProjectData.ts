import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TimelineItem, Milestone, SubProject } from '@/types/timeline';

interface ProjectDataResult {
    items: TimelineItem[];
    milestones: Milestone[];
    subProjects: SubProject[];
}

/**
 * Hook for lazy-loading project data only when the project is open.
 * This prevents fetching all items for all projects upfront.
 * 
 * @param projectId - The project ID to fetch data for
 * @param startDate - Start date for the timeline window (YYYY-MM-DD)
 * @param endDate - End date for the timeline window (YYYY-MM-DD)
 * @param isOpen - Whether the project is currently expanded
 */
export function useProjectData(
    projectId: string,
    startDate: string,
    endDate: string,
    isOpen: boolean
) {
    return useQuery({
        queryKey: ['project-data', projectId, { startDate, endDate }],
        queryFn: async (): Promise<ProjectDataResult> => {
            // Fetch items, milestones, and subprojects for this specific project
            const [items, milestones, subProjects] = await Promise.all([
                api.fetchProjectItems(projectId, startDate, endDate),
                api.fetchProjectMilestones(projectId, startDate, endDate),
                api.fetchProjectSubProjects(projectId, startDate, endDate),
            ]);
            
            return {
                items: items ?? [],
                milestones: milestones ?? [],
                subProjects: subProjects ?? [],
            };
        },
        // Only fetch when the project is open
        enabled: isOpen && !!projectId && !!startDate && !!endDate,
        // Keep previous data while refetching to avoid flicker
        placeholderData: keepPreviousData,
        // Cache for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Don't refetch on window focus for smoother UX
        refetchOnWindowFocus: false,
    });
}

/**
 * Hook for prefetching project data when hovering or about to expand.
 * This can be called on mouseenter to preload data before the user clicks.
 */
export function usePrefetchProjectData() {
    // This would be implemented with queryClient.prefetchQuery
    // For now, this is a placeholder for future optimization
    return null;
}
