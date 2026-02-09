import { useMemo } from 'react';
import { Project, TimelineItem, Milestone, SubProject, TimelineState } from '@/types/timeline';

export function useTimelineSelectors(state: TimelineState) {
    const {
        workspaces: workspacesMap,
        projects: projectsMap,
        items: itemsMap,
        milestones: milestonesMap,
        subProjects: subProjectsMap,
        workspaceOrder,
    } = state;

    // Derived State: Grouping
    const { projectsItems, projectsMilestones, projectsSubProjects, allProjects } = useMemo(() => {
        const pItems = new Map<string, TimelineItem[]>();
        const pMilestones = new Map<string, Milestone[]>();
        const pSubProjects = new Map<string, SubProject[]>();
        const allProjs: Array<Project & { workspaceName: string }> = [];

        Object.values(projectsMap).forEach(p => {
            const ws = workspacesMap[p.workspaceId];
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

        const naturalSort = (a: { title: string }, b: { title: string }) =>
            a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });

        pItems.forEach(items => items.sort(naturalSort));
        pMilestones.forEach(milestones => milestones.sort(naturalSort));

        return {
            projectsItems: pItems,
            projectsMilestones: pMilestones,
            projectsSubProjects: pSubProjects,
            allProjects: allProjs
        };
    }, [workspacesMap, projectsMap, itemsMap, milestonesMap, subProjectsMap]);

    // Derived State: Workspace -> Projects list (ordered)
    const workspaceProjects = useMemo(() => {
        const map = new Map<string, Project[]>();
        Object.keys(workspacesMap).forEach(wsId => map.set(wsId, []));
        Object.values(projectsMap).forEach(p => {
            if (map.has(p.workspaceId) && !p.isHidden) {
                map.get(p.workspaceId)?.push(p);
            }
        });
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
        projectsItems,
        projectsMilestones,
        projectsSubProjects,
        allProjects,
        workspaceProjects,
        allSubProjects,
        sortedWorkspaceIds
    };
}
