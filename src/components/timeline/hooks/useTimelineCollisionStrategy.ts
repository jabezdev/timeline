import { CollisionDetection, ClientRect, DroppableContainer } from '@dnd-kit/core';

// Optimized collision detection for Timeline Grid
export const timelineGridCollisionDetection: CollisionDetection = ({
    droppableContainers,
    pointerCoordinates,
    droppableRects
}) => {
    if (!pointerCoordinates) return [];

    const { x, y } = pointerCoordinates;
    const collisions: Array<{ id: string | number; data?: Record<string, unknown> }> = [];

    // 1. Filter candidates by Viewport Intersection (if dnd-kit hasn't already)
    // But more importantly, we assume a Grid structure.
    // We want to find the CELL that contains the pointer.
    // Standard 'pointerWithin' is O(N) where N is all droppables.

    // Strategy:
    // Iterate all containers. Check if pointer is within rect.
    // But optimize by knowing that if we are outside the Project Row, we don't need to check cells.
    // HOWEVER, we don't have "Project Row Droppables". We only have Cell Droppables.

    // So we just iterate all. But verify if `rectIntersection` or manual math is faster.
    // Manual math:
    // pointer X, Y.
    // rect: left, top, right, bottom.

    // Optimized loop: cache Rects? dnd-kit passes `droppableRects`.
    // It is a map of ID -> Rect.

    for (const container of droppableContainers) {
        const rect = droppableRects.get(container.id);
        if (rect) {
            if (
                x >= rect.left &&
                x <= rect.right &&
                y >= rect.top &&
                y <= rect.bottom
            ) {
                collisions.push({ id: container.id, data: container.data.current });
                // In a grid of non-overlapping cells, we can break early if found!
                // Cells shouldn't overlap.
                // If we found a cell, we are done.
                return collisions;
            }
        }
    }

    return collisions;
};
