import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { requireProjectOwnership } from "./lib/auth";
import { Id } from "./_generated/dataModel";



// ---------------------------------------------------------------------------
// QUERIES
// ---------------------------------------------------------------------------

/**
 * Returns items, milestones, and sub-projects within the given date range (Unix ms),
 * normalized into the TimelineState sub-shape.
 * Uses per-project fan-out via compound indexes — no cross-user scans.
 */
export const getByDateRange = query({
  args: {
    startDate: v.number(),  // Unix ms
    endDate: v.number(),    // Unix ms
  },
  handler: async (ctx, { startDate, endDate }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { items: {}, milestones: {}, subProjects: {} };
    }
    const userId = identity.subject;

    // Get user's owned project IDs via the by_user index
    const ownedProjects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const ownedProjectIds = ownedProjects.map((p) => p._id);

    // Fan-out: fetch items per project using compound index (no cross-user scan)
    const itemArrays = await Promise.all(
      ownedProjectIds.map((pid) =>
        ctx.db
          .query("timelineItems")
          .withIndex("by_project_date", (q) =>
            q.eq("projectId", pid).gte("date", startDate).lte("date", endDate)
          )
          .collect()
      )
    );
    const ownedItems = itemArrays.flat();

    // Fan-out: fetch milestones per project using compound index
    const milestoneArrays = await Promise.all(
      ownedProjectIds.map((pid) =>
        ctx.db
          .query("milestones")
          .withIndex("by_project_date", (q) =>
            q.eq("projectId", pid).gte("date", startDate).lte("date", endDate)
          )
          .collect()
      )
    );
    const ownedMilestones = milestoneArrays.flat();

    // Fan-out: fetch sub-projects per project using compound index
    // by_project_start_date gives us startDate <= endDate; filter endDate >= startDate in JS
    const spArrays = await Promise.all(
      ownedProjectIds.map((pid) =>
        ctx.db
          .query("subProjects")
          .withIndex("by_project_start_date", (q) =>
            q.eq("projectId", pid).lte("startDate", endDate)
          )
          .collect()
      )
    );
    const ownedSubProjects = spArrays.flat().filter((sp) => sp.endDate >= startDate);

    // Normalize to Record<id, entity> maps
    const items: Record<string, {
      id: string; title: string; content?: string; date: number;
      completed: boolean; projectId: string; subProjectId?: string;
      color?: string; position?: string; completedAt?: number;
    }> = {};
    ownedItems.forEach((i) => {
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

    const milestones: Record<string, {
      id: string; title: string; date: number; projectId: string;
      content?: string; color?: string; position?: string;
    }> = {};
    ownedMilestones.forEach((m) => {
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

    const subProjects: Record<string, {
      id: string; title: string; startDate: number; endDate: number;
      projectId: string; color?: string; description?: string;
    }> = {};
    ownedSubProjects.forEach((sp) => {
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

    return { items, milestones, subProjects };
  },
});

// ---------------------------------------------------------------------------
// MUTATIONS
// ---------------------------------------------------------------------------

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    date: v.number(),               // Unix ms
    content: v.optional(v.string()),
    completed: v.optional(v.boolean()),
    subProjectId: v.optional(v.id("subProjects")),
    color: v.optional(v.string()),
    position: v.optional(v.string()),  // fractional key
  },
  handler: async (ctx, args) => {
    await requireProjectOwnership(ctx, args.projectId);
    const id = await ctx.db.insert("timelineItems", {
      projectId: args.projectId,
      title: args.title,
      date: args.date,
      content: args.content,
      completed: args.completed ?? false,
      subProjectId: args.subProjectId,
      color: args.color,
      position: args.position,
    });
    return { id };
  },
});

export const update = mutation({
  args: {
    id: v.id("timelineItems"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    date: v.optional(v.number()),       // Unix ms
    completed: v.optional(v.boolean()),
    subProjectId: v.optional(v.id("subProjects")),
    color: v.optional(v.string()),
    position: v.optional(v.string()),   // fractional key
    completedAt: v.optional(v.number()), // Unix ms
  },
  handler: async (ctx, { id, ...updates }) => {
    const item = await ctx.db.get(id);
    if (!item) throw new Error("Item not found");
    await requireProjectOwnership(ctx, item.projectId);
    const patch: Record<string, unknown> = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.content !== undefined) patch.content = updates.content;
    if (updates.date !== undefined) patch.date = updates.date;
    if (updates.completed !== undefined) patch.completed = updates.completed;
    if (updates.subProjectId !== undefined) patch.subProjectId = updates.subProjectId;
    if (updates.color !== undefined) patch.color = updates.color;
    if (updates.position !== undefined) patch.position = updates.position;
    if (updates.completedAt !== undefined) patch.completedAt = updates.completedAt;
    await ctx.db.patch(id, patch);
    return { id };
  },
});

export const remove = mutation({
  args: { id: v.id("timelineItems") },
  handler: async (ctx, { id }) => {
    const item = await ctx.db.get(id);
    if (!item) throw new Error("Item not found");
    await requireProjectOwnership(ctx, item.projectId);
    await ctx.db.delete(id);
    return { id };
  },
});

export const reorder = mutation({
  args: {
    items: v.array(v.object({ id: v.string(), key: v.string() })),
  },
  handler: async (ctx, { items }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    for (const { id, key } of items) {
      const item = await ctx.db.get(id as Id<"timelineItems">);
      if (!item) continue;
      const { project } = await requireProjectOwnership(ctx, item.projectId);
      if (project.userId === identity.subject) {
        await ctx.db.patch(id as Id<"timelineItems">, { position: key });
      }
    }
  },
});

export const batchUpdate = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.string(),
        title: v.optional(v.string()),
        content: v.optional(v.string()),
        date: v.optional(v.number()),       // Unix ms
        completed: v.optional(v.boolean()),
        color: v.optional(v.string()),
        position: v.optional(v.string()),   // fractional key
        completedAt: v.optional(v.number()), // Unix ms
      })
    ),
  },
  handler: async (ctx, { updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    for (const { id, ...fields } of updates) {
      const item = await ctx.db.get(id as Id<"timelineItems">);
      if (!item) continue;
      const project = await ctx.db.get(item.projectId);
      if (!project || project.userId !== identity.subject) continue;
      const patch: Record<string, unknown> = {};
      if (fields.title !== undefined) patch.title = fields.title;
      if (fields.content !== undefined) patch.content = fields.content;
      if (fields.date !== undefined) patch.date = fields.date;
      if (fields.completed !== undefined) patch.completed = fields.completed;
      if (fields.color !== undefined) patch.color = fields.color;
      if (fields.position !== undefined) patch.position = fields.position;
      if (fields.completedAt !== undefined) patch.completedAt = fields.completedAt;
      await ctx.db.patch(id as Id<"timelineItems">, patch);
    }
  },
});
