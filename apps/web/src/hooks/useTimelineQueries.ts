import { useSubscribe } from 'replicache-react';
import { useReplicache } from './useReplicache';

// ---------------------------------------------------------------------------
// Thin wrappers around Replicache subscriptions that preserve the
// { data, isLoading, isError, error, refetch } shape used throughout the app.
// ---------------------------------------------------------------------------

export function useStructureQuery() {
    const rep = useReplicache();

    const data = useSubscribe(rep, async (tx) => {
        const workspaces: Record<string, any> = {};
        const workspaceOrder: string[] = [];
        const wss = await tx.scan({ prefix: 'workspaces/' }).values().toArray();
        wss.sort((a: any, b: any) => (a.position || '').localeCompare(b.position || '')).forEach((w: any) => {
            workspaces[w.id] = w;
            workspaceOrder.push(w.id);
        });

        const projects: Record<string, any> = {};
        const prjs = await tx.scan({ prefix: 'projects/' }).values().toArray();
        prjs.sort((a: any, b: any) => (a.position || '').localeCompare(b.position || '')).forEach((p: any) => {
            projects[p.id] = p;
        });

        const items: Record<string, any> = {};
        const itms = await tx.scan({ prefix: 'timelineItems/' }).values().toArray();
        itms.forEach((i: any) => { items[i.id] = i; });

        const milestones: Record<string, any> = {};
        const mstones = await tx.scan({ prefix: 'milestones/' }).values().toArray();
        mstones.forEach((m: any) => { milestones[m.id] = m; });

        const subProjects: Record<string, any> = {};
        const sprojs = await tx.scan({ prefix: 'subProjects/' }).values().toArray();
        sprojs.forEach((sp: any) => { subProjects[sp.id] = sp; });

        return {
            workspaces,
            workspaceOrder,
            projects,
            items,
            milestones,
            subProjects,
        };
    }, { dependencies: [rep] });

    return {
        data: data ?? undefined,
        isLoading: rep === null || data === undefined,
        isError: false,
        error: null,
        refetch: () => { },
    };
}

interface TimelineDateRange {
    startDate: number; // Unix ms
    endDate: number;   // Unix ms
}

export function useTimelineDataQuery({ startDate, endDate }: TimelineDateRange) {
    const rep = useReplicache();

    const data = useSubscribe(rep, async (tx) => {
        const items: Record<string, any> = {};
        const itms = await tx.scan({ prefix: 'timelineItems/' }).values().toArray();
        itms.forEach((i: any) => {
            if (i.date >= startDate && i.date <= endDate) {
                items[i.id] = i;
            }
        });

        const milestones: Record<string, any> = {};
        const mstones = await tx.scan({ prefix: 'milestones/' }).values().toArray();
        mstones.forEach((m: any) => {
            if (m.date >= startDate && m.date <= endDate) {
                milestones[m.id] = m;
            }
        });

        const subProjects: Record<string, any> = {};
        const sprojs = await tx.scan({ prefix: 'subProjects/' }).values().toArray();
        sprojs.forEach((sp: any) => {
            if (sp.startDate <= endDate && sp.endDate >= startDate) {
                subProjects[sp.id] = sp;
            }
        });

        return { items, milestones, subProjects };
    }, { dependencies: [rep, startDate, endDate] });

    return {
        data: data ?? undefined,
        isLoading: rep === null || data === undefined,
        isError: false,
        error: null,
        refetch: () => { },
    };
}
