import { useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { startOfDay, addDays, subDays, differenceInDays, parseISO, format, isValid } from 'date-fns';

export function useTimelineScroll(visibleDays: number = 7) {
    const [searchParams, setSearchParams] = useSearchParams();
    const timelineRef = useRef<HTMLDivElement>(null);

    // Derived state from URL - default to yesterday (so we see: yesterday, today, next 5 days)
    const startDate = useMemo(() => {
        const startParam = searchParams.get('start');
        if (startParam) {
            const parsed = parseISO(startParam);
            if (isValid(parsed)) {
                return parsed;
            }
        }
        // Default: yesterday
        return subDays(startOfDay(new Date()), 1);
    }, [searchParams]);

    // Helper to update URL
    const setStartDate = (newDateOrUpdater: Date | ((prev: Date) => Date)) => {
        let newDate: Date;
        if (typeof newDateOrUpdater === 'function') {
            newDate = newDateOrUpdater(startDate);
        } else {
            newDate = newDateOrUpdater;
        }
        setSearchParams({ start: format(newDate, 'yyyy-MM-dd') }, { replace: false });
    };

    // Navigate by 3 days
    const handleNavigate = (direction: 'prev' | 'next') => {
        setStartDate(prev =>
            direction === 'next'
                ? addDays(prev, 3)
                : subDays(prev, 3)
        );
    };

    const handleTodayClick = () => {
        // Set start to yesterday so today is the 2nd column
        setStartDate(subDays(startOfDay(new Date()), 1));
    };

    return {
        startDate,
        setStartDate,
        timelineRef,
        handleNavigate,
        handleTodayClick
    };
}
