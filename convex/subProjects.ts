import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

async function requireProjectOwnership(
  ctx: Parameters<Parameters<typeof mutation>[0]["handler"]>[0],
  projectId: Id<"projects">
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const project = await ctx.db.get(projectId);
  if (!project) throw new Error("Project not found");
  const ws = await ctx.db.get(project.workspaceId);
  if (!ws || ws.userId !== identity.subject) throw new Error("Unauthorized");
  return identity;
}

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwnership(ctx, args.projectId);
    const id = await ctx.db.insert("subProjects", {
      projectId: args.projectId,
      title: args.title,
      startDate: args.startDate,
      endDate: args.endDate,
      color: args.color,
      description: args.description,
    });
    return { id };
  },
});

export const update = mutation({
  args: {
    id: v.id("subProjects"),
    title: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const sp = await ctx.db.get(id);
    if (!sp) throw new Error("SubProject not found");
    await requireProjectOwnership(ctx, sp.projectId);
    const patch: Record<string, unknown> = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.startDate !== undefined) patch.startDate = updates.startDate;
    if (updates.endDate !== undefined) patch.endDate = updates.endDate;
    if (updates.color !== undefined) patch.color = updates.color;
    if (updates.description !== undefined) patch.description = updates.description;
    await ctx.db.patch(id, patch);
    return { id };
  },
});

export const remove = mutation({
  args: {
    id: v.id("subProjects"),
    deleteItems: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, deleteItems }) => {
    const sp = await ctx.db.get(id);
    if (!sp) throw new Error("SubProject not found");
    await requireProjectOwnership(ctx, sp.projectId);

    if (deleteItems) {
      const items = await ctx.db
        .query("timelineItems")
        .withIndex("by_sub_project", (q) => q.eq("subProjectId", id))
        .collect();
      for (const item of items) await ctx.db.delete(item._id);
    } else {
      // Detach items from the sub-project instead of deleting them
      const items = await ctx.db
        .query("timelineItems")
        .withIndex("by_sub_project", (q) => q.eq("subProjectId", id))
        .collect();
      for (const item of items) await ctx.db.patch(item._id, { subProjectId: undefined });
    }

    await ctx.db.delete(id);
    return { id };
  },
});
