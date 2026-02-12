import { useEffect, useCallback } from 'react';
import { TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { useTimelineMutations } from '@/hooks/useTimelineMutations';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { addDays, addWeeks, format, parseISO } from 'date-fns';

interface UseTimelineKeyboardProps {
    timelineState: import('@/types/timeline').TimelineState;
    onQuickEdit: (item: TimelineItem | Milestone | SubProject) => void;
}

export function useTimelineKeyboard({
    timelineState,
    onQuickEdit
}: UseTimelineKeyboardProps) {
    const mutations = useTimelineMutations();

    // Use granular selectors to prevent unnecessary re-renders
    const setSelectedIds = useTimelineStore(state => state.setSelectedIds);
    const toggleSelection = useTimelineStore(state => state.toggleSelection);
    const clearSelection = useTimelineStore(state => state.clearSelection);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Ignore if input/textarea is focused
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        // Get current selectedIds on demand to avoid re-rendering on every selection change
        const selectedIds = useTimelineStore.getState().selectedIds;
        if (selectedIds.size === 0) return;

        // Delete
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            const idsToDelete = Array.from(selectedIds);

            // We need to determine type for each ID to call correct mutation
            // Check items, milestones, subprojects
            idsToDelete.forEach(id => {
                if (timelineState.items[id]) {
                    mutations.deleteItem.mutate(id);
                } else if (timelineState.milestones[id]) {
                    mutations.deleteMilestone.mutate(id);
                } else if (timelineState.subProjects[id]) {
                    // For subprojects, we might need a confirmation or just delete
                    // Defaulting to safe delete (no cascading items unless implemented)
                    mutations.deleteSubProject.mutate({ id, deleteItems: false });
                }
            });
            clearSelection();
            return;
        }

        // Enter -> Edit (only if single selection)
        if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIds.size === 1) {
                const id = Array.from(selectedIds)[0];
                const item = timelineState.items[id] || timelineState.milestones[id] || timelineState.subProjects[id];
                if (item) {
                    onQuickEdit(item);
                }
            }
            return;
        }

        // Escape -> Deselect
        if (e.key === 'Escape') {
            e.preventDefault();
            setSelectedIds(new Set());
            return;
        }

        // Arrow Keys -> Date Shift
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();

            let days = 0;
            if (e.key === 'ArrowLeft') days = -1;
            if (e.key === 'ArrowRight') days = 1;
            if (e.key === 'ArrowUp') days = -7;
            if (e.key === 'ArrowDown') days = 7;

            if (e.shiftKey) days *= 7;

            const idsToUpdate = Array.from(selectedIds);
            idsToUpdate.forEach(id => {
                const item = timelineState.items[id];
                const milestone = timelineState.milestones[id];
                const subProject = timelineState.subProjects[id];

                if (item) {
                    const newDate = addDays(parseISO(item.date), days);
                    mutations.updateItem.mutate({
                        id: item.id,
                        updates: { date: format(newDate, 'yyyy-MM-dd') }
                    });
                } else if (milestone) {
                    const newDate = addDays(parseISO(milestone.date), days);
                    mutations.updateMilestone.mutate({
                        id: milestone.id,
                        updates: { date: format(newDate, 'yyyy-MM-dd') }
                    });
                } else if (subProject) {
                    const newStart = addDays(parseISO(subProject.startDate), days);
                    const newEnd = subProject.endDate ? addDays(parseISO(subProject.endDate), days) : undefined;
                    mutations.updateSubProject.mutate({
                        id: subProject.id,
                        updates: {
                            startDate: format(newStart, 'yyyy-MM-dd'),
                            ...(newEnd && { endDate: format(newEnd, 'yyyy-MM-dd') })
                        }
                    });
                }
            });
        }
    }, [timelineState, mutations, setSelectedIds, onQuickEdit, toggleSelection, clearSelection]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return {
        handleSelection: (id: string, multi: boolean) => {
            if (multi) {
                toggleSelection(id, true);
            } else {
                // For keyboard selection (e.g. arrow keys moving selection?), 
                // typically arrow keys move single selection. 
                // But this handleSelection is exposed to Timeline.tsx for CLICK handling too?
                // No, Timeline.tsx has its own click logic now (or will have).
                // Let's see where handleSelection is used.
                // It is used in Timeline.tsx for click and context menu.
                // context menu -> single select -> multi=false
                // click -> multi depends on ctrl key

                // If multi=false, we want single selection.
                // toggleSelection(id, false) in store implementation: produces single selection if id present?
                // store: if(multi) ... else return { selectedIds: new Set([id]) };
                // So toggleSelection(id, false) DOES single select if id matches?
                // Wait, store implementation:
                /*
                  toggleSelection: (id, multi) => set((state) => {
                    const newSet = new Set(multi ? state.selectedIds : []);
                    if (newSet.has(id)) {
                      if (multi) newSet.delete(id);
                      else return { selectedIds: new Set([id]) }; 
                    } else {
                      newSet.add(id);
                    }
                    return { selectedIds: newSet };
                  }),
                */
                // If id NOT in set, and multi=false: newSet initialized to [], adds id -> result {id}. Correct.
                // If id IN set, and multi=false: returns {id}. Correct.

                toggleSelection(id, multi);
            }
        },
        clearSelection
    };
}
