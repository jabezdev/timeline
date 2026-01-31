import { useVirtualizer } from '@tanstack/react-virtual';
import { CELL_WIDTH } from '@/lib/constants';

/**
 * Hook for horizontal (column) virtualization of timeline days.
 * Only renders columns that are visible in the viewport + overscan.
 * 
 * @param containerRef - Reference to the scrollable container
 * @param totalDays - Total number of days to virtualize
 * @param overscan - Number of extra columns to render outside viewport (default: 3)
 */
export function useColumnVirtualization(
    containerRef: React.RefObject<HTMLElement | null>,
    totalDays: number,
    overscan: number = 3
) {
    const columnVirtualizer = useVirtualizer({
        horizontal: true,
        count: totalDays,
        getScrollElement: () => containerRef.current,
        estimateSize: () => CELL_WIDTH,
        overscan,
    });

    return { columnVirtualizer };
}
