import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  replicacheServer: defineTable({
    version: v.number(),
  }),

  replicacheClients: defineTable({
    id: v.string(), // client ID
    clientGroupID: v.string(),
    lastMutationId: v.number(),
  })
    .index("by_client_id", ["id"])
    .index("by_client_group", ["clientGroupID"]),

  workspaces: defineTable({
    userId: v.string(),
    name: v.string(),
    color: v.string(),
    isHidden: v.optional(v.boolean()),
    position: v.string(),          // fractional index key (lexicographically sortable)
    version: v.optional(v.number()),
    deleted: v.optional(v.boolean()),
    clientId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_version", ["version"])
    .index("by_client_id", ["clientId"]),

  projects: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(),             // denormalized for fast ownership filtering
    name: v.string(),
    color: v.string(),
    position: v.string(),           // fractional index key
    isHidden: v.optional(v.boolean()),
    version: v.optional(v.number()),
    deleted: v.optional(v.boolean()),
    clientId: v.optional(v.string()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_version", ["version"])
    .index("by_client_id", ["clientId"]),

  subProjects: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),             // denormalized for fast ownership filtering
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.number(),          // Unix ms
    endDate: v.number(),            // Unix ms
    color: v.optional(v.string()),
    version: v.optional(v.number()),
    deleted: v.optional(v.boolean()),
    clientId: v.optional(v.string()),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"])
    .index("by_start_date", ["startDate"])
    .index("by_project_start_date", ["projectId", "startDate"])
    .index("by_version", ["version"])
    .index("by_user_version", ["userId", "version"])
    .index("by_client_id", ["clientId"]),

  milestones: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),             // denormalized for fast ownership filtering
    title: v.string(),
    content: v.optional(v.string()),
    date: v.number(),               // Unix ms
    color: v.optional(v.string()),
    position: v.optional(v.string()), // fractional index key
    version: v.optional(v.number()),
    deleted: v.optional(v.boolean()),
    clientId: v.optional(v.string()),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"])
    .index("by_date", ["date"])
    .index("by_project_date", ["projectId", "date"])
    .index("by_version", ["version"])
    .index("by_user_version", ["userId", "version"])
    .index("by_client_id", ["clientId"]),

  timelineItems: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),             // denormalized for fast ownership filtering
    subProjectId: v.optional(v.id("subProjects")),
    title: v.string(),
    content: v.optional(v.string()),
    date: v.number(),               // Unix ms
    completed: v.boolean(),
    color: v.optional(v.string()),
    position: v.optional(v.string()), // fractional index key
    completedAt: v.optional(v.number()), // Unix ms
    version: v.optional(v.number()),
    deleted: v.optional(v.boolean()),
    clientId: v.optional(v.string()),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"])
    .index("by_date", ["date"])
    .index("by_sub_project", ["subProjectId"])
    .index("by_project_date", ["projectId", "date"])
    .index("by_version", ["version"])
    .index("by_user_version", ["userId", "version"])
    .index("by_client_id", ["clientId"]),

  userSettings: defineTable({
    userId: v.string(),
    workspaceOrder: v.array(v.id("workspaces")),
    openProjectIds: v.array(v.id("projects")),
    theme: v.optional(v.string()),
    systemAccent: v.optional(v.string()),
    colorMode: v.optional(v.string()),
    blurEffectsEnabled: v.optional(v.boolean()),
    version: v.optional(v.number()),
    deleted: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_version", ["version"]),
});
