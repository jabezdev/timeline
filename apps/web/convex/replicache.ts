import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Helper to format documents for Replicache
function toPatch(tableName: string, doc: any) {
    if (doc.deleted) {
        return { op: "del", key: `${tableName}/${doc._id}` };
    }
    return {
        op: "put",
        key: `${tableName}/${doc._id}`,
        value: { ...doc, id: doc._id }, // Replicache clients often expect an 'id' field
    };
}

export const pull = query({
    args: {
        clientGroupID: v.string(),
        cookie: v.union(v.number(), v.null()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const userId = identity.subject;
        const { cookie, clientGroupID } = args;

        const fromVersion = cookie ?? 0;

        // Fetch updated/deleted entities for this user
        // We only fetch things that belong to this userId and have version > fromVersion

        // For workspaces
        const workspaces = await ctx.db
            .query("workspaces")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.gt(q.field("version"), fromVersion))
            .collect();

        // For projects
        const projects = await ctx.db
            .query("projects")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.gt(q.field("version"), fromVersion))
            .collect();

        const subProjects = await ctx.db
            .query("subProjects")
            .withIndex("by_user_version", (q) => q.eq("userId", userId).gt("version", fromVersion))
            .collect();

        const milestones = await ctx.db
            .query("milestones")
            .withIndex("by_user_version", (q) => q.eq("userId", userId).gt("version", fromVersion))
            .collect();

        const timelineItems = await ctx.db
            .query("timelineItems")
            .withIndex("by_user_version", (q) => q.eq("userId", userId).gt("version", fromVersion))
            .collect();

        const userSettings = await ctx.db
            .query("userSettings")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.gt(q.field("version"), fromVersion))
            .collect();

        // Format all to Replicache patches
        const patch: any[] = [
            ...workspaces.map((d) => toPatch("workspaces", d)),
            ...projects.map((d) => toPatch("projects", d)),
            ...subProjects.map((d) => toPatch("subProjects", d)),
            ...milestones.map((d) => toPatch("milestones", d)),
            ...timelineItems.map((d) => toPatch("timelineItems", d)),
        ];

        // Custom patch for userSettings to use a static key client-side
        if (userSettings.length > 0) {
            const latest = userSettings.sort((a, b) => (b.version || 0) - (a.version || 0))[0];
            patch.push({
                op: "put",
                key: "userSettings/current",
                value: { ...latest, id: "current" }
            });
        }

        // Get current version server-side
        const serverVersionDoc = await ctx.db.query("replicacheServer").first();
        const currentVersion = serverVersionDoc?.version ?? 0;

        // Fetch last mutation IDs for this client group
        // Replicache client stores it by client ID, pull expects a map of { clientID: lastMutationID }
        // A clientGroupID can have many clientIDs (browser tabs). Replicache handles this internally.
        // Wait, the standard protocol dictates we return lastMutationIDChanges for the requested client IDs.
        // We will just return all known clients recently updated, or all clients since we don't have clientGroupID tracking yet.
        // Let's just fetch all locally known replicacheClients.
        const lastMutationIDChanges: Record<string, number> = {};
        const clients = await ctx.db
            .query("replicacheClients")
            .withIndex("by_client_group", (q) => q.eq("clientGroupID", clientGroupID))
            .collect();
        for (const client of clients) {
            lastMutationIDChanges[client.id] = client.lastMutationId;
        }

        return {
            cookie: currentVersion,
            lastMutationIDChanges,
            patch,
        };
    },
});

export const push = mutation({
    args: {
        clientGroupID: v.string(),
        mutations: v.array(
            v.object({
                id: v.number(),
                clientID: v.string(),
                name: v.string(),
                args: v.any(),
            })
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const userId = identity.subject;

        let serverVersionDoc = await ctx.db.query("replicacheServer").first();
        let version = serverVersionDoc?.version ?? 0;

        for (const mut of args.mutations) {
            const { id, clientID, name, args: mutArgs } = mut;

            const clientDoc = await ctx.db
                .query("replicacheClients")
                .withIndex("by_client_id", (q) => q.eq("id", clientID))
                .unique();

            const nextMutationId = (clientDoc?.lastMutationId ?? 0) + 1;

            if (id < nextMutationId) {
                console.log(`Mutation ${id} from client ${clientID} already processed`);
                continue;
            }
            if (id > nextMutationId) {
                console.error(`Mutation ${id} from client ${clientID} is from the future`);
                throw new Error("Future mutation received");
            }

            version++;

            console.log(`Executing ${name} with`, mutArgs);

            // ID Resolution Helpers
            const resolveId = async (tableName: any, idOrClientId: string) => {
                if (!idOrClientId) return idOrClientId;
                const doc = await ctx.db.query(tableName).withIndex("by_client_id", (q: any) => q.eq("clientId", idOrClientId)).first();
                if (doc) return doc._id;
                return idOrClientId as Id<any>;
            };

            const softDelete = async (tableName: any, id: Id<any>) => {
                const existing = await ctx.db.get(id);
                if (existing) {
                    await ctx.db.patch(id, { deleted: true, version });
                }
            };

            try {
                switch (name) {
                    // Workspaces
                    case 'createWorkspace':
                        await ctx.db.insert("workspaces", {
                            userId,
                            name: mutArgs.name,
                            color: mutArgs.color,
                            position: mutArgs.position,
                            isHidden: mutArgs.isHidden ?? false,
                            clientId: mutArgs.id,
                            version,
                        });
                        break;
                    case 'updateWorkspace': {
                        const wId = await resolveId("workspaces", mutArgs.id);
                        await ctx.db.patch(wId, {
                            name: mutArgs.name,
                            color: mutArgs.color,
                            position: mutArgs.position,
                            isHidden: mutArgs.isHidden,
                            version,
                        });
                        break;
                    }
                    case 'deleteWorkspace': {
                        const wId = await resolveId("workspaces", mutArgs.id);
                        await softDelete("workspaces", wId);
                        break;
                    }
                    case 'reorderWorkspaces': {
                        for (const w of mutArgs.workspaces) {
                            const wId = await resolveId("workspaces", w.id);
                            await ctx.db.patch(wId, { position: w.key, version });
                        }
                        break;
                    }

                    // Projects
                    case 'createProject': {
                        const pWorkspaceId = await resolveId("workspaces", mutArgs.workspaceId);
                        await ctx.db.insert("projects", {
                            userId,
                            workspaceId: pWorkspaceId,
                            name: mutArgs.name,
                            color: mutArgs.color,
                            position: mutArgs.position,
                            isHidden: mutArgs.isHidden ?? false,
                            clientId: mutArgs.id,
                            version,
                        });
                        break;
                    }
                    case 'updateProject': {
                        const pId = await resolveId("projects", mutArgs.id);
                        const updates: any = {
                            name: mutArgs.name,
                            color: mutArgs.color,
                            position: mutArgs.position,
                            isHidden: mutArgs.isHidden,
                            version,
                        };
                        if (mutArgs.workspaceId) updates.workspaceId = await resolveId("workspaces", mutArgs.workspaceId);
                        await ctx.db.patch(pId, updates);
                        break;
                    }
                    case 'deleteProject': {
                        const pId = await resolveId("projects", mutArgs.id);
                        await softDelete("projects", pId);
                        break;
                    }
                    case 'reorderProjects': {
                        for (const p of mutArgs.projects) {
                            const pId = await resolveId("projects", p.id);
                            await ctx.db.patch(pId, { position: p.key, version });
                        }
                        break;
                    }

                    // SubProjects
                    case 'createSubProject': {
                        const spProjectId = await resolveId("projects", mutArgs.projectId);
                        await ctx.db.insert("subProjects", {
                            userId,
                            projectId: spProjectId,
                            title: mutArgs.title,
                            description: mutArgs.description,
                            startDate: mutArgs.startDate,
                            endDate: mutArgs.endDate,
                            color: mutArgs.color,
                            clientId: mutArgs.id,
                            version,
                        });
                        break;
                    }
                    case 'updateSubProject': {
                        const spId = await resolveId("subProjects", mutArgs.id);
                        await ctx.db.patch(spId, {
                            title: mutArgs.title,
                            description: mutArgs.description,
                            startDate: mutArgs.startDate,
                            endDate: mutArgs.endDate,
                            color: mutArgs.color,
                            version,
                        });
                        break;
                    }
                    case 'deleteSubProject': {
                        const spId = await resolveId("subProjects", mutArgs.id);
                        await softDelete("subProjects", spId);
                        break;
                    }

                    // Milestones
                    case 'createMilestone': {
                        const mProjectId = await resolveId("projects", mutArgs.projectId);
                        await ctx.db.insert("milestones", {
                            userId,
                            projectId: mProjectId,
                            title: mutArgs.title,
                            content: mutArgs.content,
                            date: mutArgs.date,
                            color: mutArgs.color,
                            position: mutArgs.position,
                            clientId: mutArgs.id,
                            version,
                        });
                        break;
                    }
                    case 'updateMilestone': {
                        const mId = await resolveId("milestones", mutArgs.id);
                        await ctx.db.patch(mId, {
                            title: mutArgs.title,
                            content: mutArgs.content,
                            date: mutArgs.date,
                            color: mutArgs.color,
                            position: mutArgs.position,
                            version,
                        });
                        break;
                    }
                    case 'deleteMilestone': {
                        const mId = await resolveId("milestones", mutArgs.id);
                        await softDelete("milestones", mId);
                        break;
                    }
                    case 'reorderMilestones': {
                        for (const m of mutArgs.milestones) {
                            const mId = await resolveId("milestones", m.id);
                            await ctx.db.patch(mId, { position: m.key, version });
                        }
                        break;
                    }

                    // TimelineItems
                    case 'createTimelineItem': {
                        const iProjectId = await resolveId("projects", mutArgs.projectId);
                        const iSubProjectId = mutArgs.subProjectId ? await resolveId("subProjects", mutArgs.subProjectId) : undefined;
                        await ctx.db.insert("timelineItems", {
                            userId,
                            projectId: iProjectId,
                            subProjectId: iSubProjectId,
                            title: mutArgs.title,
                            content: mutArgs.content,
                            date: mutArgs.date,
                            completed: mutArgs.completed ?? false,
                            completedAt: mutArgs.completedAt,
                            color: mutArgs.color,
                            position: mutArgs.position,
                            clientId: mutArgs.id,
                            version,
                        });
                        break;
                    }
                    case 'updateTimelineItem': {
                        const iId = await resolveId("timelineItems", mutArgs.id);
                        const updates: any = {
                            title: mutArgs.title,
                            content: mutArgs.content,
                            date: mutArgs.date,
                            completed: mutArgs.completed,
                            completedAt: mutArgs.completedAt,
                            color: mutArgs.color,
                            position: mutArgs.position,
                            version,
                        };
                        if (mutArgs.subProjectId !== undefined) {
                            updates.subProjectId = mutArgs.subProjectId ? await resolveId("subProjects", mutArgs.subProjectId) : undefined;
                        }
                        await ctx.db.patch(iId, updates);
                        break;
                    }
                    case 'deleteTimelineItem': {
                        const iId = await resolveId("timelineItems", mutArgs.id);
                        await softDelete("timelineItems", iId);
                        break;
                    }
                    case 'reorderTimelineItems': {
                        for (const i of mutArgs.items) {
                            const iId = await resolveId("timelineItems", i.id);
                            await ctx.db.patch(iId, { position: i.key, version });
                        }
                        break;
                    }
                    case 'batchUpdateTimelineItems': {
                        for (const i of mutArgs.items) {
                            const iId = await resolveId("timelineItems", i.id);
                            const updates: any = { version };
                            if (i.title !== undefined) updates.title = i.title;
                            if (i.content !== undefined) updates.content = i.content;
                            if (i.date !== undefined) updates.date = i.date;
                            if (i.completed !== undefined) updates.completed = i.completed;
                            if (i.completedAt !== undefined) updates.completedAt = i.completedAt;
                            if (i.color !== undefined) updates.color = i.color;
                            if (i.position !== undefined) updates.position = i.position;
                            await ctx.db.patch(iId, updates);
                        }
                        break;
                    }
                    case 'updateUserSettings': {
                        const existing = await ctx.db
                            .query("userSettings")
                            .withIndex("by_user", (q) => q.eq("userId", userId))
                            .unique();

                        if (existing) {
                            await ctx.db.patch(existing._id, { ...mutArgs.updates, version });
                        } else {
                            await ctx.db.insert("userSettings", {
                                userId,
                                ...mutArgs.updates,
                                workspaceOrder: [],
                                openProjectIds: [],
                                version
                            });
                        }
                        break;
                    }

                    default:
                        console.warn(`Unknown mutation name: ${name}`);
                }
            } catch (err) {
                console.error(`Error processing mutation ${name}:`, err);
                // In Replicache, we typically don't fail the batch if one mutation throws,
                // we just skip it or log it, to prevent poison pills.
                // We'll advance the lastMutationId so it doesn't get stuck.
            }

            if (clientDoc) {
                await ctx.db.patch(clientDoc._id, { lastMutationId: nextMutationId, clientGroupID: args.clientGroupID });
            } else {
                await ctx.db.insert("replicacheClients", { id: clientID, lastMutationId: nextMutationId, clientGroupID: args.clientGroupID });
            }
        }

        if (serverVersionDoc) {
            await ctx.db.patch(serverVersionDoc._id, { version });
        } else {
            await ctx.db.insert("replicacheServer", { version });
        }

        return null;
    },
});
