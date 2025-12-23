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
        return startOfWeek(new Date(), { weekStartsOn: 1 });
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
        // We use replace: true to avoid cluttering history stack with every week navigation if desired, 
        // but push (default) is better for "Back" button functionality.
        setSearchParams({ start: format(newDate, 'yyyy-MM-dd') }, { replace: false });
    };

    const handleNavigate = (direction: 'prev' | 'next') => {
        if (!timelineRef.current) {
            // If ref is missing, just update state (URL)
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
            // When going back, we want to maintain relative visual position or scroll to "end" of new segment?
            // Actually, existing logic:
            // "type: 'instant', value: currentScrollLeft + (7 * CELL_WIDTH)"
            // implies we shift the VIEWPORT so the user sees the *previous* week but stays at relative scroll?
            // Wait, if we change startDate, the virtualizer resets the 0-index content.
            // If we move startDate BACK by 7 days, the content that was at 0 is now at day 7.
            // So to keep the user looking at the "same" content (which is now shifted right), we must scroll RIGHT.
            pendingScrollRef.current = { type: 'instant', value: currentScrollLeft + (7 * CELL_WIDTH) };
            setStartDate(prev => subDays(prev, 7));
        } else {
            // Going forward: startDate moves forward 7 days.
            // Content at day 7 is now at day 0.
            // To keep "same" content (now shifted left), we scroll LEFT.
            pendingScrollRef.current = { type: 'instant', value: Math.max(0, currentScrollLeft - (7 * CELL_WIDTH)) };
            setStartDate(prev => addDays(prev, 7));
        }
    };

    const handleTodayClick = () => {
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const daysSinceCurrentStart = differenceInDays(today, startDate);

        // If today is visible in current view (roughly), just scroll to it
        // We use 'visibleDays' as a heuristic.
        // Actually, precise logic: if 0 <= days < visibleDays
        if (daysSinceCurrentStart >= 0 && daysSinceCurrentStart < visibleDays) {
            if (timelineRef.current) {
                const scrollOffset = daysSinceCurrentStart * CELL_WIDTH;
                timelineRef.current.scrollTo({
                    left: scrollOffset,
                    behavior: 'smooth'
                });
            }
        } else {
            // If not visible, jump to Today's week.
            // When we jump, we want Today to be visible? Or just start at Today's week?
            // Logic: "start at weekStart".
            // We want to scroll so "Today" is in view?
            // Existing logic: calculates `newDaysSinceStart` (today vs weekStart) which is e.g. 0-6.
            // Then sets pendingScroll to that offset.
            const newDaysSinceStart = differenceInDays(today, weekStart);
            if (newDaysSinceStart >= 0 && newDaysSinceStart < visibleDays) {
                pendingScrollRef.current = { type: 'smooth', value: newDaysSinceStart * CELL_WIDTH };
            }
            setStartDate(weekStart);
        }
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
    }, [startDate]); // Run when startDate changes (which means DOM/Virtualizer likely updated)

    // Initial Scroll on Mount (Restoring position logic?)
    // If we have a startDate from URL, do we need to scroll?
    // Existing logic: "scroll to today if today is in view".
    // If user loaded a specific URL, they probably want to see *that start date*.
    // And standard behavior uses (0,0) usually.
    // However, the helper: scroll to Today if it happens to be in range.
    useEffect(() => {
        if (timelineRef.current) {
            const today = new Date();
            const daysSinceStart = differenceInDays(today, startDate);
            // Only auto-scroll to "Today" column if we are effectively looking at "Today's week".
            // This prevents starting at x=0 (Monday) if Today is Wednesday.
            if (daysSinceStart >= 0 && daysSinceStart < visibleDays) {
                // Optimization: Only if "just mounted" or "just loaded"?
                // This runs once on mount.
                const scrollOffset = daysSinceStart * CELL_WIDTH;
                timelineRef.current.scrollLeft = scrollOffset;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once

    return {
        startDate,
        setStartDate, // Now updates URL
        timelineRef,
        handleNavigate,
        handleTodayClick
    };
}
