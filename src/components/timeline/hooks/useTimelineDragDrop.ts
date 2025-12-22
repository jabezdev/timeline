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
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { useDropAnimation } from '../DropAnimationContext';
import { CELL_WIDTH } from '@/lib/constants';
import { TimelineItem, Milestone, SubProject } from '@/types/timeline';

export function useTimelineDragDrop() {
    const [activeDragItem, setActiveDragItem] = useState<{ type: string; item: any } | null>(null);
    const [dragOffsetDays, setDragOffsetDays] = useState(0);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const dragOverlayRef = useRef<HTMLDivElement>(null);

    const { registerDrop } = useDropAnimation();

    const {
        updateItem,
        updateItemDate,
        updateMilestoneDate,
        updateSubProjectDate
    } = useTimelineStore();

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

        if (dragOverlayRef.current && active.id) {
            const rect = dragOverlayRef.current.getBoundingClientRect();
            registerDrop(String(active.id), rect);
        }

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
                    updateItem(item.id, { date: newDate, subProjectId: dropData.subProjectId });
                } else {
                    updateItemDate(item.id, newDate);
                }
                break;
            case 'milestone':
                updateMilestoneDate(dragData.item.id, newDate);
                break;
            case 'subProject':
                const adjustedDate = subDays(parseISO(newDate), dragOffsetDays);
                updateSubProjectDate(dragData.item.id, format(adjustedDate, 'yyyy-MM-dd'));
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
