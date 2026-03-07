import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const get = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .unique();
  },
});

export const upsert = mutation({
  args: {
    workspaceOrder: v.optional(v.array(v.id("workspaces"))),
    openProjectIds: v.optional(v.array(v.id("projects"))),
    theme: v.optional(v.string()),
    systemAccent: v.optional(v.string()),
    colorMode: v.optional(v.string()),
    blurEffectsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...(args.workspaceOrder !== undefined && { workspaceOrder: args.workspaceOrder }),
        ...(args.openProjectIds !== undefined && { openProjectIds: args.openProjectIds }),
        ...(args.theme !== undefined && { theme: args.theme }),
        ...(args.systemAccent !== undefined && { systemAccent: args.systemAccent }),
        ...(args.colorMode !== undefined && { colorMode: args.colorMode }),
        ...(args.blurEffectsEnabled !== undefined && { blurEffectsEnabled: args.blurEffectsEnabled }),
      });
      return { id: existing._id };
    } else {
      const id = await ctx.db.insert("userSettings", {
        userId,
        workspaceOrder: args.workspaceOrder ?? [],
        openProjectIds: args.openProjectIds ?? [],
        theme: args.theme,
        systemAccent: args.systemAccent,
        colorMode: args.colorMode,
        blurEffectsEnabled: args.blurEffectsEnabled,
      });
      return { id };
    }
  },
});
