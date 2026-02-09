import { useState, useRef, useCallback } from 'react';
import {
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    useSensor,
    useSensors,
    PointerSensor,
    Modifier
} from '@dnd-kit/core';
import { subDays, parseISO, format, differenceInDays, addDays } from 'date-fns';
import { useTimelineMutations } from '@/hooks/useTimelineMutations';

import { CELL_WIDTH } from '@/lib/constants';
import { TimelineItem, Milestone, SubProject, TimelineState } from '@/types/timeline';
import { useQueryClient } from '@tanstack/react-query'; // Need to access query cache to get current lists for reorder
import { arrayMove } from '@dnd-kit/sortable';

export function useTimelineDragDrop() {
    const [activeDragItem, setActiveDragItem] = useState<{ type: string; item: any } | null>(null);
    const [dragOffsetDays, setDragOffsetDays] = useState(0);

    const dragOverlayRef = useRef<HTMLDivElement>(null);

    const mutations = useTimelineMutations();
    const queryClient = useQueryClient();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragItem(event.active.data.current as any);
        setDragOffsetDays(0);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over, delta } = event;

        if (!over) {
            setActiveDragItem(null);
            return;
        }

        const activeItemData = active.data.current as { type: string; item: any };
        if (!activeItemData) {
            setActiveDragItem(null);
            return;
        }

        // Case 1: SubProject (Free Drag) - Keep existing logic
        if (activeItemData.type === 'subProject') {
            // We only care about X delta for date shifting
            // We ignore where it is dropped (over) as long as it's a valid drop area,
            // but effectively we are just using the delta.
            // Requirement from task: "drag a subproject = ... starting and end dates moved. items within ... also moved"

            // Calculate days moved based on DELTA x
            const daysMoved = Math.round(delta.x / CELL_WIDTH);

            const sp = activeItemData.item as SubProject;
            const originalStart = parseISO(sp.startDate);
            const originalEnd = parseISO(sp.endDate);

            // New Start is simple: Old Start + Days Moved
            const newStartObj = addDays(originalStart, daysMoved);
            const duration = originalEnd.getTime() - originalStart.getTime();
            const newEndObj = new Date(newStartObj.getTime() + duration);

            const newStartStr = format(newStartObj, 'yyyy-MM-dd');
            const newEndStr = format(newEndObj, 'yyyy-MM-dd');

            if (sp.startDate !== newStartStr) {
                // Calculate item updates
                let childItemsToUpdate: Partial<TimelineItem>[] = [];

                // Use getQueriesData for fuzzy match since key includes variables
                const queries = queryClient.getQueriesData<TimelineState>({ queryKey: ['timeline', 'data'] });
                const allData = queries.find(([_key, data]) => data?.items)?.[1];

                const relatedItems = Object.values(allData?.items || {}).filter((i: TimelineItem) => i.subProjectId === sp.id);

                if (relatedItems.length > 0) {
                    // The diff is exactly daysMoved
                    if (daysMoved !== 0) {
                        childItemsToUpdate = relatedItems.map((item: TimelineItem) => {
                            const itemDate = parseISO(item.date);
                            const newItemDate = addDays(itemDate, daysMoved);
                            return {
                                id: item.id,
                                date: format(newItemDate, 'yyyy-MM-dd')
                            };
                        });
                    }
                }

                mutations.updateSubProject.mutate({
                    id: sp.id,
                    updates: { startDate: newStartStr, endDate: newEndStr },
                    childItemsToUpdate
                });
            }
            setActiveDragItem(null);
            return;
        }

        // Case 2: Sortable Item (TimelineItem or Milestone)
        const activeItem = activeItemData.item;
        const overItemData = over.data.current as any;

        let overDate: string | undefined;
        let overProjectId: string | undefined;
        let overSubProjectId: string | undefined;

        // If dropped on a Droppable Container (empty cell)
        if (overItemData && overItemData.date) {
            overDate = overItemData.date;
            overProjectId = overItemData.projectId;
            overSubProjectId = overItemData.subProjectId;
        }
        // If dropped on another Sortable Item
        else if (overItemData && overItemData.item) {
            const targetItem = overItemData.item;
            overDate = targetItem.date;
            overProjectId = targetItem.projectId;
            overSubProjectId = (targetItem as TimelineItem).subProjectId; // Undefined for milestones
        }

        if (!overDate || !overProjectId) {
            setActiveDragItem(null);
            return;
        }

        // CONSTRAINT: Prevent Cross-Project/Workspace Drag
        // "drag an item / milestone = date moved. can't be cross-project or cross-workspace"
        if (activeItem.projectId !== overProjectId) {
            setActiveDragItem(null);
            return;
        }

        const isSameContainer =
            activeItem.date === overDate &&
            activeItem.projectId === overProjectId &&
            (activeItemData.type === 'milestone' || (activeItem as TimelineItem).subProjectId === overSubProjectId);

        if (isSameContainer && active.id !== over.id) {
            // REORDER within same cell
            const allData = queryClient.getQueryData(['timeline', 'data']) as any;
            if (!allData) {
                setActiveDragItem(null);
                return;
            }

            let itemsInCell: any[] = [];

            if (activeItemData.type === 'item') {
                // Filter and Sort by position to get current order
                itemsInCell = Object.values(allData.items).filter((i: any) =>
                    i.projectId === overProjectId &&
                    i.date === overDate &&
                    i.subProjectId === overSubProjectId
                ).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
            } else {
                itemsInCell = Object.values(allData.milestones).filter((m: any) =>
                    m.projectId === overProjectId && m.date === overDate
                ).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
            }

            const oldIndex = itemsInCell.findIndex(i => i.id === active.id);
            const newIndex = itemsInCell.findIndex(i => i.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(itemsInCell, oldIndex, newIndex);
                // Update positions
                const updates = newOrder.map((item: any, index: number) => ({
                    id: item.id,
                    position: index
                }));

                if (activeItemData.type === 'item') {
                    mutations.reorderItems.mutate(updates);
                } else {
                    mutations.reorderMilestones.mutate(updates);
                }
            }
        }
        else if (!isSameContainer) {
            // MOVE to new cell
            const updates: any = {
                date: overDate,
                projectId: overProjectId
            };
            if (activeItemData.type === 'item') {
                updates.subProjectId = overSubProjectId || null;
                mutations.updateItem.mutate({ id: activeItem.id, updates });
            } else {
                mutations.updateMilestone.mutate({ id: activeItem.id, updates: { date: overDate } });
            }
        }

        setActiveDragItem(null);
    };



    return {
        activeDragItem,
        dragOverlayRef,
        sensors,
        handleDragStart,
        handleDragEnd,
        setActiveDragItem
    };
}
