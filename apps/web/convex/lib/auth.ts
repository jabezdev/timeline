import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Verifies that the authenticated user owns the given project.
 * Uses the denormalized `userId` on the project document — one DB read, no workspace join.
 * Throws if not authenticated, project not found, or user is not the owner.
 */
export async function requireProjectOwnership(
    ctx: MutationCtx | QueryCtx,
    projectId: Id<"projects">
) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const project = await ctx.db.get(projectId);
    if (!project) throw new Error("Project not found");
    if (project.userId !== identity.subject) throw new Error("Unauthorized");
    return { identity, project };
}
