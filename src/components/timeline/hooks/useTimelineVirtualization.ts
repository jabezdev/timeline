import { useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { Project, TimelineItem, SubProject, Milestone } from '@/types/timeline';
import {
    HEADER_HEIGHT,
    WORKSPACE_HEADER_HEIGHT,
    PROJECT_HEADER_HEIGHT,
    ROW_BORDER_HEIGHT
} from '@/lib/constants';
import { calculateProjectExpandedHeight } from '@/lib/timelineUtils';

export function useTimelineVirtualization(
    sortedWorkspaceIds: string[],
    workspacesMap: Record<string, any>,
    workspaceProjects: Map<string, Project[]>,
    projectsItems: Map<string, TimelineItem[]>,
    projectsSubProjects: Map<string, SubProject[]>,
    openProjectIds: Set<string>,
    parentRef: React.RefObject<HTMLElement>
) {
    const { projectHeights } = useTimelineStore();

    const getWorkspaceHeight = useCallback((index: number) => {
        const wsId = sortedWorkspaceIds[index];
        const ws = workspacesMap[wsId];
        if (!ws) return 0;

        let height = WORKSPACE_HEADER_HEIGHT;

        if (ws.isCollapsed) return height;

        const projects = workspaceProjects.get(wsId) || [];

        for (const project of projects) {
            // Project Header always visible if workspace is expanded
            height += PROJECT_HEADER_HEIGHT;

            if (openProjectIds.has(project.id)) {
                // Check if we have a measured height from the store (for accurate animations/dynamic content)
                const storedHeight = projectHeights.get(project.id);

                if (storedHeight !== undefined && storedHeight > 0) {
                    height += storedHeight;
                } else {
                    // Fallback to calculation
                    const items = projectsItems.get(project.id) || [];
                    const subProjects = projectsSubProjects.get(project.id) || [];

                    // Note: We don't need milestones for height calculation as they are in the same row as items usually 
                    // (Wait, milestones are separate? No, typically on the timeline they might share space or be in the project row logic)
                    // timelineUtils 'calculateProjectExpandedHeight' takes items and subProjects.

                    const { totalHeight } = calculateProjectExpandedHeight(project, items, subProjects);
                    height += totalHeight;
                }
            }
        }

        return height;
    }, [
        sortedWorkspaceIds,
        workspacesMap,
        workspaceProjects,
        openProjectIds,
        projectHeights,
        projectsItems,
        projectsSubProjects
    ]);

    const rowVirtualizer = useVirtualizer({
        count: sortedWorkspaceIds.length,
        getScrollElement: () => parentRef.current,
        estimateSize: getWorkspaceHeight,
        overscan: 5,
        onChange: () => {
            // Optional: handle change
        }
    });

    // Force re-measurement when structure changes
    // This solves the issue where expanding a project doesn't push siblings down
    // because the virtualizer cache wasn't invalidating
    // Force re-measurement when structure changes
    // This solves the issue where expanding a project doesn't push siblings down
    // because the virtualizer cache wasn't invalidating
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            rowVirtualizer.measure();
        }, 0);
        return () => clearTimeout(timeoutId);
    }, [rowVirtualizer, openProjectIds, workspacesMap, workspaceProjects, projectsItems]);

    return { rowVirtualizer };
}
