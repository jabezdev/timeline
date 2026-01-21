import { useMemo } from 'react';
import { Project } from '@/types/timeline';

export type TimelineRow =
    | { type: 'workspace-header'; id: string; workspaceId: string }
    | { type: 'project'; id: string; projectId: string; workspaceId: string };

export function useFlattenedRows(
    sortedWorkspaceIds: string[],
    workspaceProjects: Map<string, Project[]>,
    collapsedWorkspaceIds: string[]
) {
    return useMemo(() => {
        const rows: TimelineRow[] = [];

        for (const wsId of sortedWorkspaceIds) {
            // 1. Add Workspace Header Row
            rows.push({
                type: 'workspace-header',
                id: `ws-${wsId}`,
                workspaceId: wsId
            });

            // 2. If Expanded, add Project Rows
            const isCollapsed = collapsedWorkspaceIds.includes(wsId);
            if (!isCollapsed) {
                const projects = workspaceProjects.get(wsId) || [];
                for (const project of projects) {
                    rows.push({
                        type: 'project',
                        id: `prj-${project.id}`,
                        projectId: project.id,
                        workspaceId: wsId
                    });
                }
            }
        }

        return rows;
    }, [sortedWorkspaceIds, workspaceProjects, collapsedWorkspaceIds]);
}
