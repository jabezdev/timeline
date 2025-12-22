import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { startOfWeek, addDays, subDays, differenceInDays } from 'date-fns';
import { CELL_WIDTH } from '@/lib/constants';

export function useTimelineScroll(visibleDays: number = 21) {
    const [startDate, setStartDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
    const pendingScrollRef = useRef<{ type: 'instant' | 'smooth'; value: number } | null>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

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
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const daysSinceCurrentStart = differenceInDays(today, startDate);

        if (daysSinceCurrentStart >= 0 && daysSinceCurrentStart < visibleDays) {
            if (timelineRef.current) {
                const scrollOffset = daysSinceCurrentStart * CELL_WIDTH;
                timelineRef.current.scrollTo({
                    left: scrollOffset,
                    behavior: 'smooth'
                });
            }
        } else {
            const newDaysSinceStart = differenceInDays(today, weekStart);
            if (newDaysSinceStart >= 0 && newDaysSinceStart < visibleDays) {
                pendingScrollRef.current = { type: 'smooth', value: newDaysSinceStart * CELL_WIDTH };
            }
            setStartDate(weekStart);
        }
    };

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
    }, [startDate]);

    useEffect(() => {
        if (timelineRef.current) {
            const today = new Date();
            const daysSinceStart = differenceInDays(today, startDate);
            if (daysSinceStart >= 0 && daysSinceStart < visibleDays) {
                const scrollOffset = daysSinceStart * CELL_WIDTH;
                timelineRef.current.scrollLeft = scrollOffset;
            }
        }
    }, []);

    const handleTimelineScroll = () => {
        if (sidebarRef.current && timelineRef.current) {
            sidebarRef.current.scrollTop = timelineRef.current.scrollTop;
        }
    };

    const handleSidebarScroll = () => {
        if (sidebarRef.current && timelineRef.current) {
            timelineRef.current.scrollTop = sidebarRef.current.scrollTop;
        }
    };

    return {
        startDate,
        setStartDate,
        sidebarRef,
        timelineRef,
        handleNavigate,
        handleTodayClick,
        handleTimelineScroll,
        handleSidebarScroll
    };
}
