import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { COLLAPSED_SIDEBAR_WIDTH, SIDEBAR_WIDTH } from '@/lib/constants';
import { useTimelineStore } from '@/hooks/useTimelineStore';

interface ScrollbarProps {
    containerRef: React.RefObject<HTMLDivElement>;
    className?: string;
    orientation?: 'horizontal' | 'vertical';
}

export function Scrollbar({ containerRef, className, orientation = 'horizontal' }: ScrollbarProps) {
    const [thumbSize, setThumbSize] = useState(0);
    const [thumbOffset, setThumbOffset] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const isDragging = useRef(false);
    const startPos = useRef(0);
    const startScroll = useRef(0);
    const scrollbarRef = useRef<HTMLDivElement>(null);

    const { isSidebarCollapsed } = useTimelineStore();
    const sidebarWidth = isSidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : SIDEBAR_WIDTH;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let resizeObserver: ResizeObserver;

        const updateScrollbar = () => {
            if (!container) return;

            const isHorizontal = orientation === 'horizontal';
            const clientSize = isHorizontal ? container.clientWidth : container.clientHeight;
            const scrollSize = isHorizontal ? container.scrollWidth : container.scrollHeight;
            const scrollPos = isHorizontal ? container.scrollLeft : container.scrollTop;

            // If content fits, hide scrollbar
            if (scrollSize <= clientSize) {
                setIsVisible(false);
                return;
            }

            setIsVisible(true);

            // Calculate thumb size ratio
            // For horizontal: subtract sidebar from visible area
            // For vertical: sidebar doesn't affect height, but sticky header might (HEADER_HEIGHT = 40 usually, or min-content)
            // Actually, vertical container includes the header in scroll?
            // Timeline.tsx structure: 
            // container (overflow-auto) -> 
            //    start content
            //    sticky header (top-0)
            //    virtual body
            // So scrollTop includes header.

            const availableSize = isHorizontal ? clientSize - sidebarWidth : clientSize;

            const sizeRatio = clientSize / scrollSize;
            const newThumbSize = Math.max(sizeRatio * availableSize, 40); // Min size 40px

            const maxScroll = scrollSize - clientSize;

            // Available track for movement
            // Horizontal: width - sidebar - thumb
            // Vertical: height - thumb
            const trackSize = availableSize;
            const maxThumbPos = trackSize - newThumbSize;

            const scrollRatio = scrollPos / maxScroll;
            const newThumbOffset = scrollRatio * maxThumbPos;

            setThumbSize(newThumbSize);
            setThumbOffset(newThumbOffset);
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
    }, [containerRef, sidebarWidth, orientation]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        startPos.current = orientation === 'horizontal' ? e.clientX : e.clientY;

        if (containerRef.current) {
            startScroll.current = orientation === 'horizontal' ? containerRef.current.scrollLeft : containerRef.current.scrollTop;
        }

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = 'none';

        // Add class to body to force cursor style? Optional.
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current || !containerRef.current) return;

        const currentPos = orientation === 'horizontal' ? e.clientX : e.clientY;
        const delta = currentPos - startPos.current;
        const container = containerRef.current;

        const isHorizontal = orientation === 'horizontal';
        const clientSize = isHorizontal ? container.clientWidth : container.clientHeight;
        const scrollSize = isHorizontal ? container.scrollWidth : container.scrollHeight;

        const availableSize = isHorizontal ? clientSize - sidebarWidth : clientSize;
        const maxScroll = scrollSize - clientSize;

        // Re-calculate thumb size to know max movement (could store in state, but safe to calc)
        // actually state has it.
        const maxThumbPos = availableSize - thumbSize;

        // ratio = maxScroll / maxThumbPos
        const scrollPerPx = maxScroll / maxThumbPos;

        if (isHorizontal) {
            container.scrollLeft = startScroll.current + (delta * scrollPerPx);
        } else {
            container.scrollTop = startScroll.current + (delta * scrollPerPx);
        }
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
    };

    if (!isVisible) return null;

    const isHorizontal = orientation === 'horizontal';

    return (
        <div
            className={cn(
                "absolute z-50 bg-transparent transition-all duration-200 ease-in-out group",
                isHorizontal
                    ? "bottom-4 h-2 hover:h-3"
                    : "right-1 top-12 w-2 hover:w-3", // Top-12 to clear header? Header is sticky. 
                className
            )}
            style={isHorizontal ? {
                left: sidebarWidth,
                width: `calc(100% - ${sidebarWidth}px - 16px)`,
            } : {
                height: `calc(100% - 48px)`, // Subtract top offset
                top: 48 // Approx header height padding
            }}
            ref={scrollbarRef}
        >
            {/* Track background */}
            <div className="absolute inset-0 bg-accent/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Thumb */}
            <div
                className="absolute bg-muted-foreground/50 hover:bg-muted-foreground/80 rounded-full cursor-grab active:cursor-grabbing backdrop-blur-sm transition-colors"
                style={isHorizontal ? {
                    height: '100%',
                    top: 0,
                    width: thumbSize,
                    transform: `translateX(${thumbOffset}px)`,
                } : {
                    width: '100%',
                    left: 0,
                    height: thumbSize,
                    transform: `translateY(${thumbOffset}px)`,
                }}
                onMouseDown={handleMouseDown}
            />
        </div>
    );
}
