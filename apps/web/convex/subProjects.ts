import { v } from "convex/values";
import { mutation, MutationCtx } from "./_generated/server";
import { requireProjectOwnership } from "./lib/auth";
import { Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    startDate: v.number(),          // Unix ms
    endDate: v.number(),            // Unix ms
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
    startDate: v.optional(v.number()),  // Unix ms
    endDate: v.optional(v.number()),    // Unix ms
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

    const items = await ctx.db
      .query("timelineItems")
      .withIndex("by_sub_project", (q) => q.eq("subProjectId", id))
      .collect();

    if (deleteItems) {
      for (const item of items) await ctx.db.delete(item._id);
    } else {
      // Detach items from the sub-project instead of deleting them
      for (const item of items) await ctx.db.patch(item._id, { subProjectId: undefined });
    }

    await ctx.db.delete(id);
    return { id };
  },
});
