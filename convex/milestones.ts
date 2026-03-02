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
    date: v.string(),
    content: v.optional(v.string()),
    color: v.optional(v.string()),
    position: v.optional(v.number()),
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
    date: v.optional(v.string()),
    content: v.optional(v.string()),
    color: v.optional(v.string()),
    position: v.optional(v.number()),
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
    milestones: v.array(v.object({ id: v.string(), position: v.number() })),
  },
  handler: async (ctx, { milestones }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    for (const { id, position } of milestones) {
      const m = await ctx.db.get(id as Id<"milestones">);
      if (!m) continue;
      const project = await ctx.db.get(m.projectId);
      if (!project) continue;
      const ws = await ctx.db.get(project.workspaceId);
      if (ws && ws.userId === identity.subject) {
        await ctx.db.patch(id as Id<"milestones">, { position });
      }
    }
  },
});
