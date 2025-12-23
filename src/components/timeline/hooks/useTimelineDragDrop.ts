import { useState, useRef, useCallback } from 'react';
import {
    DragEndEvent,
    DragStartEvent,
    useSensor,
    useSensors,
    PointerSensor,
    Modifier
} from '@dnd-kit/core';
import { subDays, parseISO, format } from 'date-fns';
import { useTimelineMutations } from '@/hooks/useTimelineMutations';

import { CELL_WIDTH } from '@/lib/constants';
import { TimelineItem, Milestone, SubProject } from '@/types/timeline';

export function useTimelineDragDrop() {
    const [activeDragItem, setActiveDragItem] = useState<{ type: string; item: any } | null>(null);
    const [dragOffsetDays, setDragOffsetDays] = useState(0);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const dragOverlayRef = useRef<HTMLDivElement>(null);

    const mutations = useTimelineMutations();


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

        const dropData = over.data.current as { projectId: string; date: string; subProjectId?: string } | undefined;
        if (!dropData) return;

        const dragData = active.data.current as { type: string; item: any } | undefined;
        if (!dragData) return;

        const newDate = dropData.date;

        switch (dragData.type) {
            case 'item':
                const item = dragData.item as TimelineItem;
                if (item.subProjectId !== dropData.subProjectId) {
                    mutations.updateItem.mutate({
                        id: item.id,
                        updates: { date: newDate, subProjectId: dropData.subProjectId }
                    });
                } else if (item.date !== newDate) {
                    mutations.updateItem.mutate({
                        id: item.id,
                        updates: { date: newDate }
                    });
                }
                break;
            case 'milestone':
                if (dragData.item.date !== newDate) {
                    mutations.updateMilestone.mutate({
                        id: dragData.item.id,
                        updates: { date: newDate }
                    });
                }
                break;
            case 'subProject':
                const sp = dragData.item as SubProject;
                // Calculate diff
                const originalStart = parseISO(sp.startDate);
                const originalEnd = parseISO(sp.endDate);

                // For subProject, drag is constrained to start date visual shift if we used dragOffsetDays correctly?
                // Logic: visual x difference -> day offset.
                // We want to apply that day offset to BOTH start and end.
                // dropData.date is the date of the cell we dropped ON.
                // But subproject is wide. We dropped the *start* there? Or the point we held?
                // Depending on implementation of Draggable. 
                // Usually "over" detects the cell under the cursor.
                // If we grab the middle of a bar and drop it on cell X, cell X corresponds to cursor location.
                // So if we grab 2 days into the bar, and drop on May 5th, the start should be May 3rd.
                // We calculated `dragOffsetDays` in handleDragStart which was:
                // days = Math.floor(offsetX / CELL_WIDTH);
                // This means cursor is `dragOffsetDays` *after* start.
                // So NewStartDate = DropDate - dragOffsetDays.

                const dropDateObj = parseISO(newDate);
                const newStartObj = subDays(dropDateObj, dragOffsetDays);

                // Calculate duration to shift end date
                const duration = originalEnd.getTime() - originalStart.getTime();
                const newEndObj = new Date(newStartObj.getTime() + duration);

                const newStartStr = format(newStartObj, 'yyyy-MM-dd');
                const newEndStr = format(newEndObj, 'yyyy-MM-dd');

                if (sp.startDate !== newStartStr) {
                    mutations.updateSubProject.mutate({
                        id: sp.id,
                        updates: {
                            startDate: newStartStr,
                            endDate: newEndStr
                        }
                    });
                }
                break;
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
