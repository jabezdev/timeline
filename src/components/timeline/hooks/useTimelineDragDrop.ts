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
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
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

        const rect = event.active.rect.current?.initial;
        const activatorEvent = event.activatorEvent as any;

        if (rect && activatorEvent) {
            const clientX = activatorEvent.touches ? activatorEvent.touches[0].clientX : activatorEvent.clientX;
            const clientY = activatorEvent.touches ? activatorEvent.touches[0].clientY : activatorEvent.clientY;

            if (typeof clientX === 'number' && typeof clientY === 'number') {
                const offsetX = clientX - rect.left;
                const offsetY = clientY - rect.top;
                setDragOffset({ x: offsetX, y: offsetY });

                if (event.active.data.current?.type === 'subProject') {
                    const days = Math.floor(offsetX / CELL_WIDTH);
                    setDragOffsetDays(days);
                } else {
                    setDragOffsetDays(0);
                }
                return;
            }
        }
        setDragOffset({ x: 0, y: 0 });
        setDragOffsetDays(0);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveDragItem(null);

        if (!over) return;

        const activeItemData = active.data.current as { type: string; item: any };
        if (!activeItemData) return;

        // Case 1: SubProject (Free Drag) - Keep existing logic
        if (activeItemData.type === 'subProject') {
            const dropData = over.data.current as { projectId: string; date: string; subProjectId?: string } | undefined;
            if (!dropData) return;

            const newDate = dropData.date;
            const sp = activeItemData.item as SubProject;
            const originalStart = parseISO(sp.startDate);
            const originalEnd = parseISO(sp.endDate);
            const dropDateObj = parseISO(newDate);
            const newStartObj = subDays(dropDateObj, dragOffsetDays);
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

                const relatedItems = Object.values(allData?.items || {}).filter((i: TimelineItem) => i.subProjectId === sp.id); // Update all items including completed

                if (relatedItems.length > 0) {
                    const diffDays = differenceInDays(dropDateObj, originalStart) - dragOffsetDays;
                    // Wait, dragOffsetDays is "days cursor is from start".
                    // newStart is calculated as 'dropDate - offset'.
                    // So diff is 'newStart - originalStart'.

                    const actualNewStart = parseISO(newStartStr);
                    const actualOldStart = parseISO(sp.startDate);
                    const dayDiff = differenceInDays(actualNewStart, actualOldStart);

                    if (dayDiff !== 0) {
                        childItemsToUpdate = relatedItems.map((item: TimelineItem) => {
                            const itemDate = parseISO(item.date);
                            const newItemDate = addDays(itemDate, dayDiff);
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

        if (!overDate || !overProjectId) return;

        const isSameContainer =
            activeItem.date === overDate &&
            activeItem.projectId === overProjectId &&
            (activeItemData.type === 'milestone' || (activeItem as TimelineItem).subProjectId === overSubProjectId);

        if (isSameContainer && active.id !== over.id) {
            // REORDER within same cell
            const allData = queryClient.getQueryData(['timeline', 'data']) as any;
            if (!allData) return;

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
    };

    const adjustTranslate: Modifier = useCallback(({ transform }) => {
        return {
            ...transform,
            x: transform.x - dragOffset.x,
            y: transform.y - dragOffset.y,
        };
    }, [dragOffset]);

    return {
        activeDragItem,
        dragOffset,
        dragOverlayRef,
        sensors,
        handleDragStart,
        handleDragEnd,
        adjustTranslate,
        setActiveDragItem
    };
}
