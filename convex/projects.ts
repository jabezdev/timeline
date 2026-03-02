import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper to verify workspace ownership
async function requireOwnedWorkspace(ctx: Parameters<Parameters<typeof mutation>[0]["handler"]>[0], workspaceId: Id<"workspaces">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const ws = await ctx.db.get(workspaceId);
  if (!ws || ws.userId !== identity.subject) throw new Error("Workspace not found or unauthorized");
  return identity;
}

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    color: v.string(),
    position: v.number(),
    isHidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireOwnedWorkspace(ctx, args.workspaceId);
    const id = await ctx.db.insert("projects", {
      workspaceId: args.workspaceId,
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
    id: v.id("projects"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    position: v.optional(v.number()),
    workspaceId: v.optional(v.id("workspaces")),
    isHidden: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const project = await ctx.db.get(id);
    if (!project) throw new Error("Project not found");
    await requireOwnedWorkspace(ctx, project.workspaceId);
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.color !== undefined) patch.color = updates.color;
    if (updates.position !== undefined) patch.position = updates.position;
    if (updates.workspaceId !== undefined) patch.workspaceId = updates.workspaceId;
    if (updates.isHidden !== undefined) patch.isHidden = updates.isHidden;
    await ctx.db.patch(id, patch);
    return { id };
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const project = await ctx.db.get(id);
    if (!project) throw new Error("Project not found");
    await requireOwnedWorkspace(ctx, project.workspaceId);

    // Cascade: delete milestones, subProjects, timelineItems
    const milestones = await ctx.db.query("milestones").withIndex("by_project", (q) => q.eq("projectId", id)).collect();
    for (const m of milestones) await ctx.db.delete(m._id);

    const subProjects = await ctx.db.query("subProjects").withIndex("by_project", (q) => q.eq("projectId", id)).collect();
    for (const sp of subProjects) await ctx.db.delete(sp._id);

    const items = await ctx.db.query("timelineItems").withIndex("by_project", (q) => q.eq("projectId", id)).collect();
    for (const item of items) await ctx.db.delete(item._id);

    await ctx.db.delete(id);
    return { id };
  },
});

export const reorder = mutation({
  args: {
    projectIds: v.array(v.string()),
  },
  handler: async (ctx, { projectIds }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    for (let i = 0; i < projectIds.length; i++) {
      const project = await ctx.db.get(projectIds[i] as Id<"projects">);
      if (!project) continue;
      const ws = await ctx.db.get(project.workspaceId);
      if (ws && ws.userId === identity.subject) {
        await ctx.db.patch(project._id, { position: i });
      }
    }
  },
});
