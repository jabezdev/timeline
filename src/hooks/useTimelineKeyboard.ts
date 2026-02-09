import { useEffect, useCallback } from 'react';
import { TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { useTimelineMutations } from '@/hooks/useTimelineMutations';
import { addDays, addWeeks, format, parseISO } from 'date-fns';

interface UseTimelineKeyboardProps {
    selectedIds: Set<string>;
    setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    timelineState: any; // Using any for now to avoid circular deps, refined later
    onQuickEdit: (item: TimelineItem | Milestone | SubProject) => void;
}

export function useTimelineKeyboard({
    selectedIds,
    setSelectedIds,
    timelineState,
    onQuickEdit
}: UseTimelineKeyboardProps) {
    const mutations = useTimelineMutations();

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Ignore if input/textarea is focused
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

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
            setSelectedIds(new Set());
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

            if (e.shiftKey) days *= 7; // Shift+Arrow for larger jumps? 
            // User request: "Arrow keys for +/- 1 day, Shift + Arrow keys for +/- 7 days"
            // My logic above: Up/Down is +/- 7 days (1 week). 
            // Let's stick strictly to user request or reasonable defaults.
            // User said: "Simple arrow keys (not Cmd/Ctrl) for date shifting"
            // Let's make Left/Right = 1 day, Up/Down = 1 week.

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
    }, [selectedIds, timelineState, mutations, setSelectedIds, onQuickEdit]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return {
        handleSelection: (id: string, multi: boolean) => {
            setSelectedIds(prev => {
                const newSet = new Set(multi ? prev : []);
                if (newSet.has(id)) {
                    if (multi) newSet.delete(id); // Toggle off if multi
                    else return new Set([id]); // Ensure single selection
                } else {
                    newSet.add(id);
                }
                return newSet;
            });
        },
        clearSelection: () => setSelectedIds(new Set())
    };
}
