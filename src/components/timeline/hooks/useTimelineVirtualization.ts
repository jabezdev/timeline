import { useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Project, TimelineItem, SubProject } from '@/types/timeline';
import {
    WORKSPACE_HEADER_HEIGHT,
    PROJECT_HEADER_HEIGHT,
    EMPTY_ITEMS_ARRAY,
    EMPTY_SUBPROJECTS_ARRAY
} from '@/lib/constants';
import { calculateProjectExpandedHeight } from '@/lib/timelineUtils';
import { TimelineRow } from '@/hooks/useFlattenedRows';
import { useTimelineStore } from '@/hooks/useTimelineStore';

/**
 * Generate a content hash for cache invalidation
 * This allows us to skip expensive height calculations when content hasn't changed.
 * We include max items per day counts because that affects row heights.
 */
function generateContentHash(items: readonly TimelineItem[], subProjects: readonly SubProject[]): string {
    // Calculate max items per day for main items (not in subprojects)
    const mainItemsByDate = new Map<string, number>();
    items.forEach(item => {
        if (!item.subProjectId) {
            mainItemsByDate.set(item.date, (mainItemsByDate.get(item.date) || 0) + 1);
        }
    });
    const maxMainItems = mainItemsByDate.size > 0 ? Math.max(...mainItemsByDate.values()) : 0;
    
    // Calculate max items per subproject
    const subProjectMaxItems = new Map<string, number>();
    items.forEach(item => {
        if (item.subProjectId) {
            subProjectMaxItems.set(
                item.subProjectId, 
                Math.max(subProjectMaxItems.get(item.subProjectId) || 0, 1)
            );
        }
    });
    
    // Hash includes: total items, total subprojects, max main items, number of subprojects with items
    return `i:${items.length}-sp:${subProjects.length}-mm:${maxMainItems}-spi:${subProjectMaxItems.size}`;
}

export function useTimelineVirtualization(
    flatRows: TimelineRow[],
    workspaceProjects: Map<string, Project[]>,
    projectsItems: Map<string, TimelineItem[]>,
    projectsSubProjects: Map<string, SubProject[]>,
    openProjectIds: Set<string>,
    parentRef: React.RefObject<HTMLElement | null>
) {
    const { getCachedProjectHeight, setCachedProjectHeight } = useTimelineStore();

    // Determine the height of a specific flattened row with caching
    const getRowHeight = useCallback((index: number) => {
        const row = flatRows[index];
        if (!row) return 0;

        if (row.type === 'workspace-header') {
            return WORKSPACE_HEADER_HEIGHT;
        }

        if (row.type === 'project') {
            let height = PROJECT_HEADER_HEIGHT;

            // Add expanded content height if project is open
            if (openProjectIds.has(row.projectId)) {
                const items = projectsItems.get(row.projectId) ?? EMPTY_ITEMS_ARRAY;
                const subProjects = projectsSubProjects.get(row.projectId) ?? EMPTY_SUBPROJECTS_ARRAY;
                
                // Generate content hash for cache lookup
                const contentHash = generateContentHash(items, subProjects);
                
                // Try to get cached height first
                const cachedHeight = getCachedProjectHeight(row.projectId, contentHash);
                if (cachedHeight !== null) {
                    return PROJECT_HEADER_HEIGHT + cachedHeight;
                }
                
                // Calculate and cache the height
                const dummyProject = { id: row.projectId } as Project;
                const { totalHeight } = calculateProjectExpandedHeight(dummyProject, items as TimelineItem[], subProjects as SubProject[]);
                
                // Cache for future lookups
                setCachedProjectHeight(row.projectId, totalHeight, contentHash);
                
                height += totalHeight;
            }
            return height;
        }

        return 0;
    }, [flatRows, openProjectIds, projectsItems, projectsSubProjects, getCachedProjectHeight, setCachedProjectHeight]);

    const rowVirtualizer = useVirtualizer({
        count: flatRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: getRowHeight,
        overscan: 5
    });

    // Force re-measure when structure or expansion changes
    useEffect(() => {
        rowVirtualizer.measure();
    }, [rowVirtualizer, flatRows, openProjectIds, projectsItems, projectsSubProjects]);

    return { rowVirtualizer };
}
