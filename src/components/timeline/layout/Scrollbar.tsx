import React, { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ScrollbarProps {
    containerRef: React.RefObject<HTMLDivElement>;
    className?: string;
    orientation?: 'horizontal' | 'vertical';
    blurEffectsEnabled?: boolean;
}

export function Scrollbar({ containerRef, className, orientation = 'horizontal', blurEffectsEnabled = true }: ScrollbarProps) {
    const [isVisible, setIsVisible] = useState(false);
    const isVisibleRef = useRef(false);
    const isDragging = useRef(false);
    const startPos = useRef(0);
    const startScroll = useRef(0);
    const scrollbarRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const thumbSizeRef = useRef(0);
    const frameRef = useRef<number | null>(null);

    const isHorizontal = orientation === 'horizontal';

    const updateScrollbar = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;

        const clientSize = isHorizontal ? container.clientWidth : container.clientHeight;
        const scrollSize = isHorizontal ? container.scrollWidth : container.scrollHeight;
        const scrollPos = isHorizontal ? container.scrollLeft : container.scrollTop;

        if (scrollSize <= clientSize || clientSize <= 0) {
            if (isVisibleRef.current) {
                isVisibleRef.current = false;
                setIsVisible(false);
            }
            return;
        }

        if (!isVisibleRef.current) {
            isVisibleRef.current = true;
            setIsVisible(true);
        }

        const sizeRatio = clientSize / scrollSize;
        const newThumbSize = Math.max(sizeRatio * clientSize, 40);
        thumbSizeRef.current = newThumbSize;

        const maxScroll = Math.max(0, scrollSize - clientSize);
        const maxThumbPos = Math.max(0, clientSize - newThumbSize);
        const scrollRatio = maxScroll === 0 ? 0 : scrollPos / maxScroll;
        const newThumbOffset = scrollRatio * maxThumbPos;

        const thumbEl = thumbRef.current;
        if (!thumbEl) return;

        if (isHorizontal) {
            thumbEl.style.width = `${newThumbSize}px`;
            thumbEl.style.transform = `translate3d(${newThumbOffset}px, 0, 0)`;
        } else {
            thumbEl.style.height = `${newThumbSize}px`;
            thumbEl.style.transform = `translate3d(0, ${newThumbOffset}px, 0)`;
        }
    }, [containerRef, isHorizontal]);

    const scheduleUpdate = useCallback(() => {
        if (frameRef.current !== null) return;
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            updateScrollbar();
        });
    }, [updateScrollbar]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('scroll', scheduleUpdate, { passive: true });

        const resizeObserver = new ResizeObserver(() => {
            scheduleUpdate();
        });
        resizeObserver.observe(container);

        scheduleUpdate();

        return () => {
            container.removeEventListener('scroll', scheduleUpdate);
            resizeObserver.disconnect();
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
        };
    }, [containerRef, scheduleUpdate]);

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

        const maxScroll = scrollSize - clientSize;
        const maxThumbPos = clientSize - thumbSizeRef.current;
        if (maxThumbPos <= 0 || maxScroll <= 0) return;
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

    return (
        <div
            className={cn(
                "absolute z-50 bg-transparent transition-all duration-200 ease-in-out group",
                isHorizontal
                    ? "bottom-4 h-2 hover:h-3"
                    : "right-1 top-12 w-2 hover:w-3",
                isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
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
                ref={thumbRef}
                className={cn(
                    "absolute bg-muted-foreground/50 hover:bg-muted-foreground/80 rounded-full cursor-grab active:cursor-grabbing transition-colors will-change-transform",
                    blurEffectsEnabled && "backdrop-blur-sm"
                )}
                style={isHorizontal ? {
                    height: '100%',
                    top: 0,
                    width: thumbSizeRef.current,
                    transform: 'translate3d(0, 0, 0)',
                } : {
                    width: '100%',
                    left: 0,
                    height: thumbSizeRef.current,
                    transform: 'translate3d(0, 0, 0)',
                }}
                onMouseDown={handleMouseDown}
            />
        </div>
    );
}
