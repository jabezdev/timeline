import { mutation } from "./_generated/server";

export const backfillUserId = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. Fetch all projects to map projectId -> userId
        const projects = await ctx.db.query("projects").collect();
        const projectToUser = new Map(projects.map((p) => [p._id, p.userId]));

        // 2. Backfill subProjects
        const subProjects = await ctx.db.query("subProjects").collect();
        for (const doc of subProjects) {
            if (!doc.userId) {
                const userId = projectToUser.get(doc.projectId);
                if (userId) {
                    await ctx.db.patch(doc._id, { userId });
                }
            }
        }

        // 3. Backfill milestones
        const milestones = await ctx.db.query("milestones").collect();
        for (const doc of milestones) {
            if (!doc.userId) {
                const userId = projectToUser.get(doc.projectId);
                if (userId) {
                    await ctx.db.patch(doc._id, { userId });
                }
            }
        }

        // 4. Backfill timelineItems
        const timelineItems = await ctx.db.query("timelineItems").collect();
        for (const doc of timelineItems) {
            if (!doc.userId) {
                const userId = projectToUser.get(doc.projectId);
                if (userId) {
                    await ctx.db.patch(doc._id, { userId });
                }
            }
        }

        console.log("Backfill complete");
    },
});
