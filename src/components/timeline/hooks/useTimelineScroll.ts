import { useRef, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { startOfWeek, addDays, subDays, differenceInDays, parseISO, format, isValid, startOfDay } from 'date-fns';
import { CELL_WIDTH } from '@/lib/constants';
import { useTimelineStore } from '@/hooks/useTimelineStore';

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
    const setStartDate = useCallback((newDateOrUpdater: Date | ((prev: Date) => Date)) => {
        let newDate: Date;
        // Logic to resolve value
        // We cannot use 'startDate' from closure if we want stability unless we list it in dependency.
        // But we can use functional update for setSearchParams? No, setSearchParams takes new params.
        // We need startDate to compute new params if we are updating it.
        // Wait, if setStartDate changes, handleNavigate will change. 
        // startDate changes frequently? NO, only on navigate.
        // During resize, startDate is stable. So it is fine to depend on startDate.

        // Actually, let's use the functional form of setStartDate logic inside handleNavigate
        // to avoid dependency on startDate in handleNavigate?
        // But setStartDate updates URL.

        // Let's just wrap setStartDate
        let computedDate: Date;
        if (typeof newDateOrUpdater === 'function') {
            // We need current startDate. 
            // If we use startDate from closure, this function changes when startDate changes.
            // That is acceptable.
            computedDate = newDateOrUpdater(startDate);
        } else {
            computedDate = newDateOrUpdater;
        }

        setSearchParams({ start: format(computedDate, 'yyyy-MM-dd') }, { replace: false });
    }, [startDate, setSearchParams]);

    const handleNavigate = useCallback((direction: 'prev' | 'next') => {
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
    }, [setStartDate, timelineRef]); // setStartDate depends on startDate. So handleNavigate depends on startDate.

    const handleTodayClick = useCallback(() => {
        const today = startOfDay(new Date());
        // Set start date to 2 weeks before today to have enough buffer for centering
        const targetStartDate = subDays(today, 14);

        // Check if start date is changing
        const diffStart = differenceInDays(targetStartDate, startDate);

        if (diffStart !== 0) {
            setStartDate(targetStartDate);
        }

        // Calculate target scroll
        if (timelineRef.current) {
            const currentSidebarWidth = useTimelineStore.getState().sidebarWidth;
            const containerWidth = timelineRef.current.clientWidth;

            const diffDays = 14; // Since we set start date to today - 14
            // Center of "Today" relative to timeline content start (0 scroll)
            // Position = sidebarWidth + (diffDays * CELL_WIDTH) + (CELL_WIDTH / 2)
            const todayCenter = currentSidebarWidth + (diffDays * CELL_WIDTH) + (CELL_WIDTH / 2);

            // We want this position to be at the center of the viewport (containerWidth / 2).
            // So: scrollLeft = todayCenter - (containerWidth / 2).
            const targetScroll = todayCenter - (containerWidth / 2);

            if (diffStart === 0) {
                timelineRef.current.scrollTo({
                    left: Math.max(0, targetScroll),
                    behavior: 'smooth'
                });
            } else {
                pendingScrollRef.current = { type: 'smooth', value: Math.max(0, targetScroll) };
            }
        }
    }, [startDate, setStartDate]);

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
            const today = startOfDay(new Date());
            const diffDays = differenceInDays(today, startDate);
            const currentSidebarWidth = useTimelineStore.getState().sidebarWidth;
            const containerWidth = timelineRef.current.clientWidth;

            // Calculate center position of "Today" column relative to scroll start
            // sidebarWidth + (diffDays * CELL_WIDTH) + (CELL_WIDTH / 2)
            const todayCenter = currentSidebarWidth + (diffDays * CELL_WIDTH) + (CELL_WIDTH / 2);

            // Calculate target scroll to align "Today" center with viewport center
            const targetScroll = todayCenter - (containerWidth / 2);

            timelineRef.current.scrollLeft = Math.max(0, targetScroll);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        startDate,
        setStartDate, // Now updates URL
        timelineRef,
        handleNavigate,
        handleTodayClick
    };
}
