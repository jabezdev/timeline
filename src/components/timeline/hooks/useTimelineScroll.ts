import { useRef, useEffect, useMemo, useCallback } from 'react';
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
        const today = new Date();
        const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
        const targetStartDate = subDays(startOfCurrentWeek, 7);

        setStartDate(targetStartDate);

        pendingScrollRef.current = { type: 'smooth', value: 0 };
    }, [setStartDate]);

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
