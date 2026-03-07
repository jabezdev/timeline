import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";



// ---------------------------------------------------------------------------
// QUERIES
// ---------------------------------------------------------------------------

/**
 * Combined structure query: returns all workspaces + projects + userSettings
 * for the authenticated user, normalized into the TimelineState shape.
 * Stale IDs in workspaceOrder / openProjectIds are filtered out before returning.
 */
export const getStructure = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        workspaces: {},
        projects: {},
        items: {},
        milestones: {},
        subProjects: {},
        workspaceOrder: [],
        userSettings: undefined
      };
    }
    const userId = identity.subject;

    const [wsArr, ownedProjects, settings] = await Promise.all([
      ctx.db.query("workspaces").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("projects").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("userSettings").withIndex("by_user", (q) => q.eq("userId", userId)).unique(),
    ]);

    const ownedProjectIds = ownedProjects.map(p => p._id);

    // Fan-out fetching for items, milestones, and subprojects
    const [itemArrays, milestoneArrays, subProjectArrays] = await Promise.all([
      Promise.all(ownedProjectIds.map(pid =>
        ctx.db.query("timelineItems").withIndex("by_project", q => q.eq("projectId", pid)).collect()
      )),
      Promise.all(ownedProjectIds.map(pid =>
        ctx.db.query("milestones").withIndex("by_project", q => q.eq("projectId", pid)).collect()
      )),
      Promise.all(ownedProjectIds.map(pid =>
        ctx.db.query("subProjects").withIndex("by_project", q => q.eq("projectId", pid)).collect()
      )),
    ]);

    const allItems = itemArrays.flat();
    const allMilestones = milestoneArrays.flat();
    const allSubProjects = subProjectArrays.flat();

    // Build workspace map (sorted by fractional position key)
    const workspaces: Record<string, {
      id: string; name: string; color: string; isCollapsed: boolean;
      isHidden: boolean; position: string;
    }> = {};
    const workspaceOrder: string[] = [];
    [...wsArr].sort((a, b) => a.position.localeCompare(b.position)).forEach((w) => {
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

    // Build project map (sorted by fractional position key)
    const projects: Record<string, {
      id: string; name: string; workspaceId: string; color: string;
      position: string; isHidden: boolean;
    }> = {};
    [...ownedProjects].sort((a, b) => a.position.localeCompare(b.position)).forEach((p) => {
      projects[p._id] = {
        id: p._id,
        name: p.name,
        workspaceId: p.workspaceId,
        color: p.color,
        position: p.position,
        isHidden: p.isHidden ?? false,
      };
    });

    // Normalize Items
    const items: Record<string, {
      id: string; title: string; content?: string; date: number;
      completed: boolean; projectId: string; subProjectId?: string;
      color?: string; position?: string; completedAt?: number;
    }> = {};
    allItems.forEach((i) => {
      items[i._id] = {
        id: i._id,
        title: i.title,
        content: i.content,
        date: i.date,
        completed: i.completed,
        projectId: i.projectId,
        subProjectId: i.subProjectId,
        color: i.color,
        position: i.position,
        completedAt: i.completedAt,
      };
    });

    // Normalize Milestones
    const milestones: Record<string, {
      id: string; title: string; date: number; projectId: string;
      content?: string; color?: string; position?: string;
    }> = {};
    allMilestones.forEach((m) => {
      milestones[m._id] = {
        id: m._id,
        title: m.title,
        date: m.date,
        projectId: m.projectId,
        content: m.content,
        color: m.color,
        position: m.position,
      };
    });

    // Normalize SubProjects
    const subProjects: Record<string, {
      id: string; title: string; startDate: number; endDate: number;
      projectId: string; color?: string; description?: string;
    }> = {};
    allSubProjects.forEach((sp) => {
      subProjects[sp._id] = {
        id: sp._id,
        title: sp.title,
        startDate: sp.startDate,
        endDate: sp.endDate,
        projectId: sp.projectId,
        color: sp.color,
        description: sp.description,
      };
    });

    // Filter stale IDs from userSettings (deleted workspaces / projects leave orphan refs)
    const validWsIds = new Set(wsArr.map((w) => w._id));
    const validProjectIds = new Set(ownedProjects.map((p) => p._id));

    return {
      workspaces,
      projects,
      items,
      milestones,
      subProjects,
      workspaceOrder,
      userSettings: settings
        ? {
          userId: settings.userId,
          workspaceOrder: settings.workspaceOrder.filter((id) => validWsIds.has(id)),
          openProjectIds: settings.openProjectIds.filter((id) => validProjectIds.has(id)),
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
    position: v.string(),           // fractional key
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
    position: v.optional(v.string()),  // fractional key
  },
  handler: async (ctx, { id, ...updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const ws = await ctx.db.get(id);
    if (!ws || ws.userId !== identity.subject) throw new Error("Not found or unauthorized");
    const patch: Record<string, unknown> = {};
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

    // Cascade: delete all child projects and their descendants
    const childProjects = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", id))
      .collect();
    for (const project of childProjects) {
      const milestones = await ctx.db.query("milestones").withIndex("by_project", (q) => q.eq("projectId", project._id)).collect();
      for (const m of milestones) await ctx.db.delete(m._id);
      const subProjects = await ctx.db.query("subProjects").withIndex("by_project", (q) => q.eq("projectId", project._id)).collect();
      for (const sp of subProjects) await ctx.db.delete(sp._id);
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
    workspaces: v.array(v.object({ id: v.string(), key: v.string() })),
  },
  handler: async (ctx, { workspaces }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    for (const { id, key } of workspaces) {
      const ws = await ctx.db.get(id as Id<"workspaces">);
      if (ws && ws.userId === identity.subject) {
        await ctx.db.patch(id as Id<"workspaces">, { position: key });
      }
    }
  },
});
