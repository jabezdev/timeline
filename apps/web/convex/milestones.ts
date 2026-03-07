import { v } from "convex/values";
import { mutation, MutationCtx } from "./_generated/server";
import { requireProjectOwnership } from "./lib/auth";
import { Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    date: v.number(),               // Unix ms
    content: v.optional(v.string()),
    color: v.optional(v.string()),
    position: v.optional(v.string()),  // fractional key
  },
  handler: async (ctx, args) => {
    await requireProjectOwnership(ctx, args.projectId);
    const id = await ctx.db.insert("milestones", {
      projectId: args.projectId,
      title: args.title,
      date: args.date,
      content: args.content,
      color: args.color,
      position: args.position,
    });
    return { id };
  },
});

export const update = mutation({
  args: {
    id: v.id("milestones"),
    title: v.optional(v.string()),
    date: v.optional(v.number()),   // Unix ms
    content: v.optional(v.string()),
    color: v.optional(v.string()),
    position: v.optional(v.string()),  // fractional key
  },
  handler: async (ctx, { id, ...updates }) => {
    const m = await ctx.db.get(id);
    if (!m) throw new Error("Milestone not found");
    await requireProjectOwnership(ctx, m.projectId);
    const patch: Record<string, unknown> = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.date !== undefined) patch.date = updates.date;
    if (updates.content !== undefined) patch.content = updates.content;
    if (updates.color !== undefined) patch.color = updates.color;
    if (updates.position !== undefined) patch.position = updates.position;
    await ctx.db.patch(id, patch);
    return { id };
  },
});

export const remove = mutation({
  args: { id: v.id("milestones") },
  handler: async (ctx, { id }) => {
    const m = await ctx.db.get(id);
    if (!m) throw new Error("Milestone not found");
    await requireProjectOwnership(ctx, m.projectId);
    await ctx.db.delete(id);
    return { id };
  },
});

export const reorder = mutation({
  args: {
    milestones: v.array(v.object({ id: v.string(), key: v.string() })),
  },
  handler: async (ctx, { milestones }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    for (const { id, key } of milestones) {
      const m = await ctx.db.get(id as Id<"milestones">);
      if (!m) continue;
      const { project } = await requireProjectOwnership(ctx, m.projectId);
      if (project.userId === identity.subject) {
        await ctx.db.patch(id as Id<"milestones">, { position: key });
      }
    }
  },
});
