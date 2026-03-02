import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// QUERIES
// ---------------------------------------------------------------------------

/**
 * Combined structure query: returns all workspaces + projects + userSettings
 * for the authenticated user, normalized into the TimelineState shape.
 */
export const getStructure = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { workspaces: {}, projects: {}, workspaceOrder: [], userSettings: undefined };
    }
    const userId = identity.subject;

    const [wsArr, projArr, settings] = await Promise.all([
      ctx.db.query("workspaces").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("projects").collect(),
      ctx.db.query("userSettings").withIndex("by_user", (q) => q.eq("userId", userId)).unique(),
    ]);

    // Filter projects to only those belonging to this user's workspaces
    const ownedWsIds = new Set(wsArr.map((w) => w._id));
    const ownedProjects = projArr.filter((p) => ownedWsIds.has(p.workspaceId));

    // Build workspace map (sorted by position)
    const workspaces: Record<string, {
      id: string; name: string; color: string; isCollapsed: boolean;
      isHidden: boolean; position: number;
    }> = {};
    const workspaceOrder: string[] = [];
    [...wsArr].sort((a, b) => a.position - b.position).forEach((w) => {
      workspaces[w._id] = {
        id: w._id,
        name: w.name,
        color: w.color,
        isCollapsed: false,
        isHidden: w.isHidden ?? false,
        position: w.position,
      };
      workspaceOrder.push(w._id);
    });

    // Build project map (sorted by position)
    const projects: Record<string, {
      id: string; name: string; workspaceId: string; color: string;
      position: number; isHidden: boolean;
    }> = {};
    [...ownedProjects].sort((a, b) => a.position - b.position).forEach((p) => {
      projects[p._id] = {
        id: p._id,
        name: p.name,
        workspaceId: p.workspaceId,
        color: p.color,
        position: p.position,
        isHidden: p.isHidden ?? false,
      };
    });

    return {
      workspaces,
      projects,
      workspaceOrder,
      userSettings: settings
        ? {
            userId: settings.userId,
            workspaceOrder: settings.workspaceOrder,
            openProjectIds: settings.openProjectIds,
            theme: settings.theme,
            systemAccent: settings.systemAccent,
            colorMode: settings.colorMode as "full" | "monochromatic" | undefined,
            blurEffectsEnabled: settings.blurEffectsEnabled,
          }
        : undefined,
    };
  },
});

// ---------------------------------------------------------------------------
// MUTATIONS
// ---------------------------------------------------------------------------

export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    position: v.number(),
    isHidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const id = await ctx.db.insert("workspaces", {
      userId: identity.subject,
      name: args.name,
      color: args.color,
      position: args.position,
      isHidden: args.isHidden ?? false,
    });
    return { id };
  },
});

export const update = mutation({
  args: {
    id: v.id("workspaces"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    isHidden: v.optional(v.boolean()),
    position: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const ws = await ctx.db.get(id);
    if (!ws || ws.userId !== identity.subject) throw new Error("Not found or unauthorized");
    const patch: Partial<typeof updates> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.color !== undefined) patch.color = updates.color;
    if (updates.isHidden !== undefined) patch.isHidden = updates.isHidden;
    if (updates.position !== undefined) patch.position = updates.position;
    await ctx.db.patch(id, patch);
    return { id };
  },
});

export const remove = mutation({
  args: { id: v.id("workspaces") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const ws = await ctx.db.get(id);
    if (!ws || ws.userId !== identity.subject) throw new Error("Not found or unauthorized");

    // Cascade: delete all child projects (which cascade further via their own remove logic)
    const childProjects = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", id))
      .collect();
    for (const project of childProjects) {
      // Delete milestones
      const milestones = await ctx.db.query("milestones").withIndex("by_project", (q) => q.eq("projectId", project._id)).collect();
      for (const m of milestones) await ctx.db.delete(m._id);
      // Delete subProjects
      const subProjects = await ctx.db.query("subProjects").withIndex("by_project", (q) => q.eq("projectId", project._id)).collect();
      for (const sp of subProjects) await ctx.db.delete(sp._id);
      // Delete timelineItems
      const items = await ctx.db.query("timelineItems").withIndex("by_project", (q) => q.eq("projectId", project._id)).collect();
      for (const item of items) await ctx.db.delete(item._id);
      await ctx.db.delete(project._id);
    }

    await ctx.db.delete(id);
    return { id };
  },
});

export const reorder = mutation({
  args: {
    workspaces: v.array(v.object({ id: v.string(), position: v.number() })),
  },
  handler: async (ctx, { workspaces }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    for (const { id, position } of workspaces) {
      const ws = await ctx.db.get(id as Id<"workspaces">);
      if (ws && ws.userId === identity.subject) {
        await ctx.db.patch(id as Id<"workspaces">, { position });
      }
    }
  },
});
