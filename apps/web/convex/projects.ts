import { v } from "convex/values";
import { mutation, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper to verify workspace ownership — returns identity + workspace
async function requireOwnedWorkspace(ctx: MutationCtx, workspaceId: Id<"workspaces">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const ws = await ctx.db.get(workspaceId);
  if (!ws || ws.userId !== identity.subject) throw new Error("Workspace not found or unauthorized");
  return { identity, userId: ws.userId };
}

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    color: v.string(),
    position: v.string(),           // fractional key
    isHidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOwnedWorkspace(ctx, args.workspaceId);
    const id = await ctx.db.insert("projects", {
      workspaceId: args.workspaceId,
      userId,                         // denormalized for fast ownership filtering
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
    position: v.optional(v.string()),   // fractional key
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
    if (updates.isHidden !== undefined) patch.isHidden = updates.isHidden;
    // If moving to a new workspace, verify ownership and sync the denormalized userId
    if (updates.workspaceId !== undefined) {
      const newWs = await ctx.db.get(updates.workspaceId);
      if (!newWs || newWs.userId !== identity.subject) throw new Error("Target workspace not found or unauthorized");
      patch.workspaceId = updates.workspaceId;
      patch.userId = newWs.userId;
    }
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
    projects: v.array(v.object({ id: v.string(), key: v.string() })),
  },
  handler: async (ctx, { projects }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    for (const { id, key } of projects) {
      const project = await ctx.db.get(id as Id<"projects">);
      if (!project || project.userId !== identity.subject) continue;
      await ctx.db.patch(project._id, { position: key });
    }
  },
});
