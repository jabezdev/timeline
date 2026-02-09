import { useMemo, useRef } from 'react';
import { Project, TimelineItem, Milestone, SubProject, TimelineState } from '@/types/timeline';

// Helper for shallow array equality check
function areArraysEqual(arr1: any[], arr2: any[]) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

export function useTimelineSelectors(state: TimelineState) {
    const {
        workspaces: workspacesMap,
        projects: projectsMap,
        items: itemsMap,
        milestones: milestonesMap,
        subProjects: subProjectsMap,
        workspaceOrder,
    } = state;

    // Cache Refs to store the previous version of arrays
    const cache = useRef({
        projectsItems: new Map<string, TimelineItem[]>(),
        projectsMilestones: new Map<string, Milestone[]>(),
        projectsSubProjects: new Map<string, SubProject[]>(),
    });

    // Derived State: All Projects List (Stable, depends only on structure)
    const allProjects = useMemo(() => {
        const projs: Array<Project & { workspaceName: string }> = [];
        Object.values(projectsMap).forEach(p => {
            const ws = workspacesMap[p.workspaceId];
            if (ws) {
                projs.push({ ...p, workspaceName: ws.name });
            }
        });
        return projs;
    }, [workspacesMap, projectsMap]);

    // Derived State: Grouping and Stabilization
    const { projectsItems, projectsMilestones, projectsSubProjects } = useMemo(() => {
        // 1. Compute fresh groupings
        const tempItems = new Map<string, TimelineItem[]>();
        const tempMilestones = new Map<string, Milestone[]>();
        const tempSubProjects = new Map<string, SubProject[]>();

        // Initialize maps for all projects to ensure every project has an entry
        Object.keys(projectsMap).forEach(pid => {
            tempItems.set(pid, []);
            tempMilestones.set(pid, []);
            tempSubProjects.set(pid, []);
        });

        // Fill data
        Object.values(itemsMap).forEach(i => {
            if (projectsMap[i.projectId]) { // Only add if project exists
                if (!tempItems.has(i.projectId)) tempItems.set(i.projectId, []);
                tempItems.get(i.projectId)!.push(i);
            }
        });
        Object.values(milestonesMap).forEach(m => {
            if (projectsMap[m.projectId]) {
                if (!tempMilestones.has(m.projectId)) tempMilestones.set(m.projectId, []);
                tempMilestones.get(m.projectId)!.push(m);
            }
        });
        Object.values(subProjectsMap).forEach(sp => {
            if (projectsMap[sp.projectId]) {
                if (!tempSubProjects.has(sp.projectId)) tempSubProjects.set(sp.projectId, []);
                tempSubProjects.get(sp.projectId)!.push(sp);
            }
        });

        const naturalSort = (a: { title: string }, b: { title: string }) =>
            a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });

        // Sort
        tempItems.forEach(items => items.sort(naturalSort));
        tempMilestones.forEach(milestones => milestones.sort(naturalSort));

        // 2. Stabilization: Compare with cache and reuse arrays if unchanged
        const stableItems = new Map<string, TimelineItem[]>();
        const stableMilestones = new Map<string, Milestone[]>();
        const stableSubProjects = new Map<string, SubProject[]>();

        // Process Items
        tempItems.forEach((newArr, pid) => {
            const cachedArr = cache.current.projectsItems.get(pid);
            if (cachedArr && areArraysEqual(newArr, cachedArr)) {
                stableItems.set(pid, cachedArr);
            } else {
                stableItems.set(pid, newArr);
                cache.current.projectsItems.set(pid, newArr);
            }
        });

        // Process Milestones
        tempMilestones.forEach((newArr, pid) => {
            const cachedArr = cache.current.projectsMilestones.get(pid);
            if (cachedArr && areArraysEqual(newArr, cachedArr)) {
                stableMilestones.set(pid, cachedArr);
            } else {
                stableMilestones.set(pid, newArr);
                cache.current.projectsMilestones.set(pid, newArr);
            }
        });

        // Process SubProjects
        tempSubProjects.forEach((newArr, pid) => {
            const cachedArr = cache.current.projectsSubProjects.get(pid);
            if (cachedArr && areArraysEqual(newArr, cachedArr)) {
                stableSubProjects.set(pid, cachedArr);
            } else {
                stableSubProjects.set(pid, newArr);
                cache.current.projectsSubProjects.set(pid, newArr);
            }
        });

        return {
            projectsItems: stableItems,
            projectsMilestones: stableMilestones,
            projectsSubProjects: stableSubProjects
        };
    }, [projectsMap, itemsMap, milestonesMap, subProjectsMap]);

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
