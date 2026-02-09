import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

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

            if (scrollSize <= clientSize) {
                setIsVisible(false);
                return;
            }

            setIsVisible(true);

            const availableSize = clientSize;
            const sizeRatio = clientSize / scrollSize;
            const newThumbSize = Math.max(sizeRatio * availableSize, 40);

            const maxScroll = scrollSize - clientSize;
            const trackSize = availableSize;
            const maxThumbPos = trackSize - newThumbSize;

            const scrollRatio = scrollPos / maxScroll;
            const newThumbOffset = scrollRatio * maxThumbPos;

            setThumbSize(newThumbSize);
            setThumbOffset(newThumbOffset);
        };

        container.addEventListener('scroll', updateScrollbar);

        resizeObserver = new ResizeObserver(() => {
            updateScrollbar();
        });
        resizeObserver.observe(container);

        updateScrollbar();

        return () => {
            container.removeEventListener('scroll', updateScrollbar);
            resizeObserver.disconnect();
        };
    }, [containerRef, orientation]);

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
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current || !containerRef.current) return;

        const currentPos = orientation === 'horizontal' ? e.clientX : e.clientY;
        const delta = currentPos - startPos.current;
        const container = containerRef.current;

        const isHorizontal = orientation === 'horizontal';
        const clientSize = isHorizontal ? container.clientWidth : container.clientHeight;
        const scrollSize = isHorizontal ? container.scrollWidth : container.scrollHeight;

        const availableSize = clientSize;
        const maxScroll = scrollSize - clientSize;
        const maxThumbPos = availableSize - thumbSize;
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
                    : "right-1 top-12 w-2 hover:w-3",
                className
            )}
            style={isHorizontal ? {
                left: 0,
                width: `calc(100% - 16px)`,
            } : {
                height: `calc(100% - 48px)`,
                top: 48
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
