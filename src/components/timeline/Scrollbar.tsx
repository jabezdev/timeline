import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { COLLAPSED_SIDEBAR_WIDTH, SIDEBAR_WIDTH } from '@/lib/constants';
import { useTimelineStore } from '@/hooks/useTimelineStore';

interface ScrollbarProps {
    containerRef: React.RefObject<HTMLDivElement>;
    className?: string;
}

export function Scrollbar({ containerRef, className }: ScrollbarProps) {
    const [thumbWidth, setThumbWidth] = useState(0);
    const [thumbLeft, setThumbLeft] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const startScrollLeft = useRef(0);
    const scrollbarRef = useRef<HTMLDivElement>(null);

    const { isSidebarCollapsed } = useTimelineStore();
    const sidebarWidth = isSidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : SIDEBAR_WIDTH;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let resizeObserver: ResizeObserver;

        const updateScrollbar = () => {
            if (!container) return;
            const { clientWidth, scrollWidth, scrollLeft } = container;

            // If content fits, hide scrollbar
            if (scrollWidth <= clientWidth) {
                setIsVisible(false);
                return;
            }

            setIsVisible(true);

            // Calculate thumb width ratio
            // We want thumb to represent the visible viewport ratio
            const widthRatio = clientWidth / scrollWidth;
            const newThumbWidth = Math.max(widthRatio * (clientWidth - sidebarWidth), 40); // Min width 40px

            // Calculate thumb position ratio
            // "Available" track width for movement = clientWidth - sidebarWidth - thumbWidth
            // "Available" scroll width = scrollWidth - clientWidth
            const trackWidth = clientWidth - sidebarWidth;
            const maxScroll = scrollWidth - clientWidth;
            const maxThumbLeft = trackWidth - newThumbWidth;

            const scrollRatio = scrollLeft / maxScroll;
            const newThumbLeft = scrollRatio * maxThumbLeft;

            setThumbWidth(newThumbWidth);
            setThumbLeft(newThumbLeft);
        };

        // Listen to scroll
        container.addEventListener('scroll', updateScrollbar);

        // Listen to resize
        resizeObserver = new ResizeObserver(() => {
            updateScrollbar();
        });
        resizeObserver.observe(container);

        // Initial call
        updateScrollbar();

        return () => {
            container.removeEventListener('scroll', updateScrollbar);
            resizeObserver.disconnect();
        };
    }, [containerRef, sidebarWidth]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        startX.current = e.clientX;
        if (containerRef.current) {
            startScrollLeft.current = containerRef.current.scrollLeft;
        }

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current || !containerRef.current) return;

        const deltaX = e.clientX - startX.current;
        const container = containerRef.current;
        const { clientWidth, scrollWidth } = container;

        const trackWidth = clientWidth - sidebarWidth;
        const maxThumbLeft = trackWidth - thumbWidth;
        const maxScroll = scrollWidth - clientWidth;

        // Calculate how much 1px of thumb moves corresponds to scroll px
        // ratio = maxScroll / maxThumbLeft
        const scrollPerPx = maxScroll / maxThumbLeft;

        container.scrollLeft = startScrollLeft.current + (deltaX * scrollPerPx);
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
    };

    if (!isVisible) return null;

    return (
        <div
            className={cn(
                "absolute bottom-4 z-50 h-2 bg-transparent hover:h-3 transition-all duration-200 ease-in-out group",
                className
            )}
            style={{
                left: sidebarWidth,
                width: `calc(100% - ${sidebarWidth}px - 16px)`, // 16px padding right
            }}
            ref={scrollbarRef}
        >
            {/* Track background */}
            <div className="absolute inset-0 bg-accent/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Thumb */}
            <div
                className="absolute top-0 h-full bg-muted-foreground/50 hover:bg-muted-foreground/80 rounded-full cursor-grab active:cursor-grabbing backdrop-blur-sm transition-colors"
                style={{
                    width: thumbWidth,
                    transform: `translateX(${thumbLeft}px)`,
                }}
                onMouseDown={handleMouseDown}
            />
        </div>
    );
}
