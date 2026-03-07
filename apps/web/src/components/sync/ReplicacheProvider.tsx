import React, { useEffect, useState, ReactNode } from "react";
import { Replicache, WriteTransaction } from "replicache";
import { useConvex, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@clerk/clerk-react";
import { ReplicacheLicenseKey } from "@timeline/shared";

const mutators = {
    // Workspaces
    createWorkspace: async (tx: WriteTransaction, args: any) => {
        await tx.put(`workspaces/${args.id}`, args);
    },
    updateWorkspace: async (tx: WriteTransaction, args: { id: string; updates: any }) => {
        const existing = await tx.get(`workspaces/${args.id}`) as any;
        if (existing) await tx.put(`workspaces/${args.id}`, { ...existing, ...args.updates });
    },
    deleteWorkspace: async (tx: WriteTransaction, args: { id: string }) => {
        await tx.del(`workspaces/${args.id}`);
    },
    reorderWorkspaces: async (tx: WriteTransaction, args: { workspaces: { id: string; key: string }[] }) => {
        for (const w of args.workspaces) {
            const existing = await tx.get(`workspaces/${w.id}`) as any;
            if (existing) await tx.put(`workspaces/${w.id}`, { ...existing, position: w.key });
        }
    },

    // Projects
    createProject: async (tx: WriteTransaction, args: any) => {
        await tx.put(`projects/${args.id}`, args);
    },
    updateProject: async (tx: WriteTransaction, args: { id: string; updates: any }) => {
        const existing = await tx.get(`projects/${args.id}`) as any;
        if (existing) await tx.put(`projects/${args.id}`, { ...existing, ...args.updates });
    },
    deleteProject: async (tx: WriteTransaction, args: { id: string }) => {
        await tx.del(`projects/${args.id}`);
    },
    reorderProjects: async (tx: WriteTransaction, args: { projects: { id: string; key: string }[] }) => {
        for (const p of args.projects) {
            const existing = await tx.get(`projects/${p.id}`) as any;
            if (existing) await tx.put(`projects/${p.id}`, { ...existing, position: p.key });
        }
    },

    // SubProjects
    createSubProject: async (tx: WriteTransaction, args: any) => {
        await tx.put(`subProjects/${args.id}`, args);
    },
    updateSubProject: async (tx: WriteTransaction, args: { id: string; updates: any }) => {
        const existing = await tx.get(`subProjects/${args.id}`) as any;
        if (existing) await tx.put(`subProjects/${args.id}`, { ...existing, ...args.updates });
    },
    deleteSubProject: async (tx: WriteTransaction, args: { id: string; deleteItems?: boolean }) => {
        await tx.del(`subProjects/${args.id}`);
        // If deleteItems is true, we could theoretically delete children here,
        // but often that's handled server-side or cascaded in queries.
    },

    // Milestones
    createMilestone: async (tx: WriteTransaction, args: any) => {
        await tx.put(`milestones/${args.id}`, args);
    },
    updateMilestone: async (tx: WriteTransaction, args: { id: string; updates: any }) => {
        const existing = await tx.get(`milestones/${args.id}`) as any;
        if (existing) await tx.put(`milestones/${args.id}`, { ...existing, ...args.updates });
    },
    deleteMilestone: async (tx: WriteTransaction, args: { id: string }) => {
        await tx.del(`milestones/${args.id}`);
    },
    reorderMilestones: async (tx: WriteTransaction, args: { milestones: { id: string; key: string }[] }) => {
        for (const m of args.milestones) {
            const existing = await tx.get(`milestones/${m.id}`) as any;
            if (existing) await tx.put(`milestones/${m.id}`, { ...existing, position: m.key });
        }
    },

    // TimelineItems
    createTimelineItem: async (tx: WriteTransaction, args: any) => {
        await tx.put(`timelineItems/${args.id}`, args);
    },
    updateTimelineItem: async (tx: WriteTransaction, args: { id: string; updates: any }) => {
        const existing = await tx.get(`timelineItems/${args.id}`) as any;
        if (existing) await tx.put(`timelineItems/${args.id}`, { ...existing, ...args.updates });
    },
    deleteTimelineItem: async (tx: WriteTransaction, args: { id: string }) => {
        await tx.del(`timelineItems/${args.id}`);
    },
    reorderTimelineItems: async (tx: WriteTransaction, args: { items: { id: string; key: string }[] }) => {
        for (const i of args.items) {
            const existing = await tx.get(`timelineItems/${i.id}`) as any;
            if (existing) await tx.put(`timelineItems/${i.id}`, { ...existing, position: i.key });
        }
    },
    batchUpdateTimelineItems: async (tx: WriteTransaction, args: { items: any[] }) => {
        for (const i of args.items) {
            const existing = await tx.get(`timelineItems/${i.id}`) as any;
            if (existing) {
                const { id, ...updates } = i;
                await tx.put(`timelineItems/${i.id}`, { ...existing, ...updates });
            }
        }
    },

    // UserSettings
    updateUserSettings: async (tx: WriteTransaction, args: { updates: any }) => {
        const existing = await tx.get('userSettings/current') as any;
        await tx.put('userSettings/current', { ...(existing || {}), ...args.updates });
    },
};

export type TimelineMutators = typeof mutators;

export interface ReplicacheContextType {
    rep: Replicache<TimelineMutators> | null;
}

export const ReplicacheContext = React.createContext<ReplicacheContextType>({
    rep: null,
});

export function ReplicacheProvider({ children }: { children: ReactNode }) {
    const [rep, setRep] = useState<Replicache<TimelineMutators> | null>(null);
    const { userId } = useAuth();
    const convex = useConvex();
    const pushMutation = useMutation(api.replicache.push);

    useEffect(() => {
        if (!userId) {
            setRep(null);
            return;
        }

        const r = new Replicache({
            name: userId,
            licenseKey: ReplicacheLicenseKey,
            // Custom puller using Convex Query
            puller: async (req) => {
                try {
                    const result = await convex.query(api.replicache.pull, {
                        clientGroupID: req.clientGroupID,
                        cookie: req.cookie as number | null,
                    });

                    return {
                        httpRequestInfo: { httpStatusCode: 200, errorMessage: "" },
                        response: result,
                    };
                } catch (e: any) {
                    console.error("Replicache pull error", e);
                    return {
                        httpRequestInfo: { httpStatusCode: 500, errorMessage: e.message },
                    };
                }
            },
            // Custom pusher using Convex Mutation
            pusher: async (req) => {
                try {
                    await pushMutation({
                        clientGroupID: req.clientGroupID,
                        mutations: req.mutations as any,
                    });
                    return {
                        httpRequestInfo: { httpStatusCode: 200, errorMessage: "" },
                    };
                } catch (e: any) {
                    console.error("Replicache push error", e);
                    return {
                        httpRequestInfo: { httpStatusCode: 500, errorMessage: e.message },
                    };
                }
            },
            mutators,
        });

        setRep(r);

        return () => {
            r.close();
        };
    }, [userId, convex, pushMutation]);

    return (
        <ReplicacheContext.Provider value={{ rep }}>
            {children}
        </ReplicacheContext.Provider>
    );
}
