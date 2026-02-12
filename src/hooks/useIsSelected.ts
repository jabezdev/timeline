import { useTimelineStore } from './useTimelineStore';

/**
 * Optimized hook to check if an item is selected.
 * Only re-renders when THIS SPECIFIC item's selection state changes.
 * 
 * This prevents the mass re-render issue where all timeline items
 * would re-render whenever any selection changed.
 * 
 * Zustand's default shallow equality check works perfectly for boolean
 * values, so we don't need a custom equality function.
 */
export function useIsSelected(itemId: string): boolean {
    return useTimelineStore((state) => state.selectedIds.has(itemId));
}
