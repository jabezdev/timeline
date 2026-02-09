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

        // Case 1: SubProject (Free Drag)
        if (activeItemData.type === 'subProject') {
            const daysMoved = Math.round(delta.x / CELL_WIDTH);

            const sp = activeItemData.item as SubProject;
            const originalStart = parseISO(sp.startDate);
            const originalEnd = parseISO(sp.endDate);

            const newStartObj = addDays(originalStart, daysMoved);
            const duration = originalEnd.getTime() - originalStart.getTime();
            const newEndObj = new Date(newStartObj.getTime() + duration);

            const newStartStr = format(newStartObj, 'yyyy-MM-dd');
            const newEndStr = format(newEndObj, 'yyyy-MM-dd');

            if (sp.startDate !== newStartStr) {
                let childItemsToUpdate: Partial<TimelineItem>[] = [];

                const queries = queryClient.getQueriesData<TimelineState>({ queryKey: ['timeline', 'data'] });
                const allData = queries.find(([_key, data]) => data?.items)?.[1];

                const relatedItems = Object.values(allData?.items || {}).filter((i: TimelineItem) => i.subProjectId === sp.id);

                if (relatedItems.length > 0 && daysMoved !== 0) {
                    childItemsToUpdate = relatedItems.map((item: TimelineItem) => {
                        const itemDate = parseISO(item.date);
                        const newItemDate = addDays(itemDate, daysMoved);
                        return {
                            id: item.id,
                            date: format(newItemDate, 'yyyy-MM-dd')
                        };
                    });
                }

                // Mutate immediately (flushSync will ensure DOM updates)
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

        if (overItemData && overItemData.date) {
            overDate = overItemData.date;
            overProjectId = overItemData.projectId;
            overSubProjectId = overItemData.subProjectId;
        }
        else if (overItemData && overItemData.item) {
            const targetItem = overItemData.item;
            overDate = targetItem.date;
            overProjectId = targetItem.projectId;
            overSubProjectId = (targetItem as TimelineItem).subProjectId;
        }

        if (!overDate || !overProjectId) {
            setActiveDragItem(null);
            return;
        }

        if (activeItem.projectId !== overProjectId) {
            setActiveDragItem(null);
            return;
        }

        const isSameContainer =
            activeItem.date === overDate &&
            activeItem.projectId === overProjectId &&
            (activeItemData.type === 'milestone' || (activeItem as TimelineItem).subProjectId === overSubProjectId);

        if (isSameContainer && active.id !== over.id) {
            const allData = queryClient.getQueryData(['timeline', 'data']) as any;
            if (!allData) {
                setActiveDragItem(null);
                return;
            }

            let itemsInCell: any[] = [];

            if (activeItemData.type === 'item') {
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
