import { useMemo } from 'react';
import { Project, TimelineItem, Milestone, SubProject, TimelineState } from '@/types/timeline';

export function useTimelineSelectors(
    state: TimelineState,
    openProjectIdsArray: string[]
) {
    const {
        workspaces: workspacesMap,
        projects: projectsMap,
        items: itemsMap,
        milestones: milestonesMap,
        subProjects: subProjectsMap,
        workspaceOrder,
    } = state;

    const openProjectIds = useMemo(() => new Set(openProjectIdsArray), [openProjectIdsArray]);

    // Derived State: Grouping
    const { projectsItems, projectsMilestones, projectsSubProjects, allProjects } = useMemo(() => {
        const pItems = new Map<string, TimelineItem[]>();
        const pMilestones = new Map<string, Milestone[]>();
        const pSubProjects = new Map<string, SubProject[]>();
        const allProjs: Array<Project & { workspaceName: string }> = [];

        // Initialize maps for all projects
        Object.values(projectsMap).forEach(p => {
            const ws = workspacesMap[p.workspaceId];
            // Only include project if workspace exists (filter orphans)
            if (ws) {
                pItems.set(p.id, []);
                pMilestones.set(p.id, []);
                pSubProjects.set(p.id, []);
                allProjs.push({ ...p, workspaceName: ws.name });
            }
        });

        Object.values(itemsMap).forEach(i => {
            if (pItems.has(i.projectId)) pItems.get(i.projectId)!.push(i);
        });

        Object.values(milestonesMap).forEach(m => {
            if (pMilestones.has(m.projectId)) pMilestones.get(m.projectId)!.push(m);
        });

        Object.values(subProjectsMap).forEach(sp => {
            if (pSubProjects.has(sp.projectId)) pSubProjects.get(sp.projectId)!.push(sp);
        });

        // Sort items and milestones by title
        pItems.forEach(items => items.sort((a, b) => a.title.localeCompare(b.title)));
        pMilestones.forEach(milestones => milestones.sort((a, b) => a.title.localeCompare(b.title)));

        return {
            projectsItems: pItems,
            projectsMilestones: pMilestones,
            projectsSubProjects: pSubProjects,
            allProjects: allProjs
        };
    }, [workspacesMap, projectsMap, itemsMap, milestonesMap, subProjectsMap]);

    // Derived State: Workspace -> Projects list (ordered)
    // Create a map of workspaceId -> Projects (Sorted by position)
    const workspaceProjects = useMemo(() => {
        const map = new Map<string, Project[]>();

        // Initialize buckets
        Object.keys(workspacesMap).forEach(wsId => map.set(wsId, []));

        // Distribute projects
        Object.values(projectsMap).forEach(p => {
            if (map.has(p.workspaceId) && !p.isHidden) {
                map.get(p.workspaceId)?.push(p);
            }
        });

        // Sort each bucket
        map.forEach(projs => {
            projs.sort((a, b) => (a.position || 0) - (b.position || 0));
        });

        return map;
    }, [workspacesMap, projectsMap]);

    // Derived State: SubProjects List for Dialog
    const allSubProjects = useMemo(() => Object.values(subProjectsMap).map(sp => ({
        id: sp.id,
        title: sp.title,
        projectId: sp.projectId
    })), [subProjectsMap]);

    // Sort workspaces using workspaceOrder
    const sortedWorkspaceIds = useMemo(() => {
        return workspaceOrder.filter(id => {
            const ws = workspacesMap[id];
            return ws && !ws.isHidden;
        });
    }, [workspaceOrder, workspacesMap]);

    return {
        openProjectIds,
        projectsItems,
        projectsMilestones,
        projectsSubProjects,
        allProjects,
        workspaceProjects,
        allSubProjects,
        sortedWorkspaceIds
    };
}
