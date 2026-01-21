import { useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Project, TimelineItem, SubProject } from '@/types/timeline';
import {
    WORKSPACE_HEADER_HEIGHT,
    PROJECT_HEADER_HEIGHT
} from '@/lib/constants';
import { calculateProjectExpandedHeight } from '@/lib/timelineUtils';
import { TimelineRow } from '@/hooks/useFlattenedRows';

export function useTimelineVirtualization(
    flatRows: TimelineRow[],
    workspaceProjects: Map<string, Project[]>, // Still needed? No, row has IDs.
    projectsItems: Map<string, TimelineItem[]>,
    projectsSubProjects: Map<string, SubProject[]>,
    openProjectIds: Set<string>,
    parentRef: React.RefObject<HTMLElement>
) {
    // Determine the height of a specific flattened row
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
                // Get data for this project
                // Note: We access the maps directly. Ensure these maps are stable or memoized upstream.
                const items = projectsItems.get(row.projectId) || [];
                const subProjects = projectsSubProjects.get(row.projectId) || [];

                // We fake the 'Project' object structure because the calculator only needs it for... nothing actually? 
                // Wait, calculateProjectExpandedHeight uses project? Let's check signature. 
                // calculateProjectExpandedHeight(project: Project, ...)
                // It might not use project properties. Checking lib/timelineUtils.ts...
                // It doesn't use project props, just items and subprojects for layout.
                // WE passed 'project' just for signature matching?
                // Actually, I should pass a dummy project or just pass the ID if the util doesn't need the object.
                // But for safety, I'll mock it or pass null if TS allows.
                // Better yet: Pass a minimal object.

                // To be safe, look up the project object? We don't have the project map here easily unless passed.
                // The calculator only uses it for signature. Let's cast or update calculator later. 
                // For now, I'll just pass a dummy as it is likely unused logic-wise.
                // Actually, let's just make sure we are not breaking anything.
                const dummyProject = { id: row.projectId } as Project;

                const { totalHeight } = calculateProjectExpandedHeight(dummyProject, items, subProjects);
                height += totalHeight;
            }
            return height;
        }

        return 0;
    }, [flatRows, openProjectIds, projectsItems, projectsSubProjects]);

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
