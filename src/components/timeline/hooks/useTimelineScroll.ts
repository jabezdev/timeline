import { useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { startOfWeek, addDays, subDays, differenceInDays, parseISO, format, isValid } from 'date-fns';
import { CELL_WIDTH } from '@/lib/constants';

export function useTimelineScroll(visibleDays: number = 21) {
    const [searchParams, setSearchParams] = useSearchParams();
    const timelineRef = useRef<HTMLDivElement>(null);
    const pendingScrollRef = useRef<{ type: 'instant' | 'smooth'; value: number } | null>(null);

    // Derived state from URL
    const startDate = useMemo(() => {
        const startParam = searchParams.get('start');
        if (startParam) {
            const parsed = parseISO(startParam);
            if (isValid(parsed)) {
                return parsed;
            }
        }
        // Default: 1 week before the start of current week
        const today = new Date();
        const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
        return subDays(startOfCurrentWeek, 7);
    }, [searchParams]);

    // Helper to update URL
    const setStartDate = (newDateOrUpdater: Date | ((prev: Date) => Date)) => {
        let newDate: Date;
        if (typeof newDateOrUpdater === 'function') {
            newDate = newDateOrUpdater(startDate);
        } else {
            newDate = newDateOrUpdater;
        }

        // Update URL, keeping other params if any (though currently none exist)
        // We use replace: false to allow back button
        setSearchParams({ start: format(newDate, 'yyyy-MM-dd') }, { replace: false });
    };

    const handleNavigate = (direction: 'prev' | 'next') => {
        if (!timelineRef.current) {
            setStartDate(prev =>
                direction === 'next'
                    ? addDays(prev, 7)
                    : subDays(prev, 7)
            );
            return;
        }

        const currentScrollLeft = timelineRef.current.scrollLeft;

        // Calculate target scroll
        if (direction === 'prev') {
            pendingScrollRef.current = { type: 'instant', value: currentScrollLeft + (7 * CELL_WIDTH) };
            setStartDate(prev => subDays(prev, 7));
        } else {
            pendingScrollRef.current = { type: 'instant', value: Math.max(0, currentScrollLeft - (7 * CELL_WIDTH)) };
            setStartDate(prev => addDays(prev, 7));
        }
    };

    const handleTodayClick = () => {
        const today = new Date();
        const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
        const targetStartDate = subDays(startOfCurrentWeek, 7);

        // We want to navigate to the view where today is 1 week in.

        const daysSinceCurrentStart = differenceInDays(targetStartDate, startDate);

        // If we are already at the correct start date week, just scroll if needed?
        // Actually, existing logic checks if "Today" is in view.
        // But here we want to RESET to the standard "Today View" which is (Today - 1 week).

        setStartDate(targetStartDate);

        // We might want to scroll to 0 (start) of this new view?
        // Let's assume the default mount effect or scroll restoration handles it?
        // Actually, if we set the start date, the content shifts.
        // We probably want to scroll to the beginning (left=0) so the user sees the 1 week buffer?
        pendingScrollRef.current = { type: 'smooth', value: 0 };
    };

    // Handle Pending Scroll after Render
    useEffect(() => {
        if (pendingScrollRef.current && timelineRef.current) {
            const { type, value } = pendingScrollRef.current;
            if (type === 'instant') {
                timelineRef.current.scrollLeft = value;
            } else {
                timelineRef.current.scrollTo({
                    left: value,
                    behavior: 'smooth'
                });
            }
            pendingScrollRef.current = null;
        }
    }, [startDate]); // Run when startDate changes

    // Initial Scroll on Mount
    useEffect(() => {
        if (timelineRef.current) {
            // Scroll to 0 (start) initially?
            // With the new logic, the "default" view starts at (Today - 1 week).
            // So x=0 corresponds to (Today - 1 week).
            // This places Today at x = 7 * CELL_WIDTH.
            // If we want Today to be sticky or centered, user keeps typical view.
            // Usually timelines start at 0 scroll.
            // So we don't need to do anything if we want to start at the "start date".

            // However, existing logic tried to scroll to Today.
            // If we want to maintain the "Today is visible" logic from before:
            // The default startDate IS constructed such that Today is visible (it's index 7).
            // So simply not scrolling (leaving it at 0) works perfectly to show the 1 week buffer.
        }
    }, []);

    return {
        startDate,
        setStartDate, // Now updates URL
        timelineRef,
        handleNavigate,
        handleTodayClick
    };
}
