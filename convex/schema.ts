import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  workspaces: defineTable({
    userId: v.string(),
    name: v.string(),
    color: v.string(),
    isHidden: v.optional(v.boolean()),
    position: v.number(),
  }).index("by_user", ["userId"]),

  projects: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    color: v.string(),
    position: v.number(),
    isHidden: v.optional(v.boolean()),
  }).index("by_workspace", ["workspaceId"]),

  subProjects: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    color: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  milestones: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    content: v.optional(v.string()),
    date: v.string(),
    color: v.optional(v.string()),
    position: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_date", ["date"]),

  timelineItems: defineTable({
    projectId: v.id("projects"),
    subProjectId: v.optional(v.id("subProjects")),
    title: v.string(),
    content: v.optional(v.string()),
    date: v.string(),
    completed: v.boolean(),
    color: v.optional(v.string()),
    position: v.optional(v.number()),
    completedAt: v.optional(v.string()),
  })
    .index("by_project", ["projectId"])
    .index("by_date", ["date"])
    .index("by_sub_project", ["subProjectId"]),

  userSettings: defineTable({
    userId: v.string(),
    workspaceOrder: v.array(v.string()),
    openProjectIds: v.array(v.string()),
    theme: v.optional(v.string()),
    systemAccent: v.optional(v.string()),
    colorMode: v.optional(v.string()),
    blurEffectsEnabled: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),
});
