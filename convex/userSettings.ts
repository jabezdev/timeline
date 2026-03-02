import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
    workspaceOrder: v.optional(v.array(v.string())),
    openProjectIds: v.optional(v.array(v.string())),
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
      const patch: Record<string, unknown> = {};
      if (args.workspaceOrder !== undefined) patch.workspaceOrder = args.workspaceOrder;
      if (args.openProjectIds !== undefined) patch.openProjectIds = args.openProjectIds;
      if (args.theme !== undefined) patch.theme = args.theme;
      if (args.systemAccent !== undefined) patch.systemAccent = args.systemAccent;
      if (args.colorMode !== undefined) patch.colorMode = args.colorMode;
      if (args.blurEffectsEnabled !== undefined) patch.blurEffectsEnabled = args.blurEffectsEnabled;
      await ctx.db.patch(existing._id, patch);
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
