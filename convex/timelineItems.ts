import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
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

// ---------------------------------------------------------------------------
// QUERIES
// ---------------------------------------------------------------------------

/**
 * Returns items, milestones, and sub-projects within the given date range,
 * normalized into the TimelineState sub-shape.
 */
export const getByDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { items: {}, milestones: {}, subProjects: {} };
    }
    const userId = identity.subject;

    // Get user's workspace IDs for ownership filtering
    const userWorkspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const ownedWsIds = new Set(userWorkspaces.map((w) => w._id));

    // Get all user's projects
    const allProjects = await ctx.db.query("projects").collect();
    const ownedProjectIds = new Set(
      allProjects.filter((p) => ownedWsIds.has(p.workspaceId)).map((p) => p._id)
    );

    // Fetch all items in date range (using date index), filter by ownership
    const allItems = await ctx.db
      .query("timelineItems")
      .withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate))
      .collect();
    const ownedItems = allItems.filter((i) => ownedProjectIds.has(i.projectId));

    // Fetch all milestones in date range
    const allMilestones = await ctx.db
      .query("milestones")
      .withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate))
      .collect();
    const ownedMilestones = allMilestones.filter((m) => ownedProjectIds.has(m.projectId));

    // Fetch sub-projects overlapping the date range
    const allSubProjects = await ctx.db.query("subProjects").collect();
    const ownedSubProjects = allSubProjects.filter(
      (sp) =>
        ownedProjectIds.has(sp.projectId) &&
        sp.startDate <= endDate &&
        sp.endDate >= startDate
    );

    // Normalize to Record<id, entity> maps
    const items: Record<string, {
      id: string; title: string; content?: string; date: string;
      completed: boolean; projectId: string; subProjectId?: string;
      color?: string; position?: number; completedAt?: string;
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
      id: string; title: string; date: string; projectId: string;
      content?: string; color?: string; position?: number;
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
      id: string; title: string; startDate: string; endDate: string;
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
    date: v.string(),
    content: v.optional(v.string()),
    completed: v.optional(v.boolean()),
    subProjectId: v.optional(v.id("subProjects")),
    color: v.optional(v.string()),
    position: v.optional(v.number()),
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
    date: v.optional(v.string()),
    completed: v.optional(v.boolean()),
    subProjectId: v.optional(v.id("subProjects")),
    color: v.optional(v.string()),
    position: v.optional(v.number()),
    completedAt: v.optional(v.string()),
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
    items: v.array(v.object({ id: v.string(), position: v.number() })),
  },
  handler: async (ctx, { items }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    for (const { id, position } of items) {
      const item = await ctx.db.get(id as Id<"timelineItems">);
      if (!item) continue;
      const project = await ctx.db.get(item.projectId);
      if (!project) continue;
      const ws = await ctx.db.get(project.workspaceId);
      if (ws && ws.userId === identity.subject) {
        await ctx.db.patch(id as Id<"timelineItems">, { position });
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
        date: v.optional(v.string()),
        completed: v.optional(v.boolean()),
        color: v.optional(v.string()),
        position: v.optional(v.number()),
        completedAt: v.optional(v.string()),
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
      if (!project) continue;
      const ws = await ctx.db.get(project.workspaceId);
      if (!ws || ws.userId !== identity.subject) continue;
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
