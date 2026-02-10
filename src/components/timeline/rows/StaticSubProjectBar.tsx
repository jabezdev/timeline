import React from 'react';
import { SubProject } from '@/types/timeline';
import { differenceInDays, parseISO } from 'date-fns';
import { CELL_WIDTH } from '@/lib/constants';
import { SubProjectBar } from './SubProjectBar';

interface StaticSubProjectBarProps {
    subProject: SubProject;
    timelineStartDate: Date;
    totalVisibleDays: number;
    onDoubleClick: (subProject: SubProject) => void;
    onItemClick: (id: string, multi: boolean, e: React.MouseEvent) => void;
    onItemContextMenu: (id: string, type: 'item' | 'milestone' | 'subproject', e: React.MouseEvent) => void;
    colorMode?: 'full' | 'monochromatic';
    systemAccent?: string;
    onQuickEdit: (item: SubProject, anchorElement?: HTMLElement) => void;
}

export function StaticSubProjectBar({
    subProject,
    timelineStartDate,
    totalVisibleDays,
    onDoubleClick,
    onQuickEdit,
    colorMode,
    systemAccent,
    onItemClick,
    onItemContextMenu
}: StaticSubProjectBarProps) {
    const subProjectStart = parseISO(subProject.startDate);
    const subProjectEnd = parseISO(subProject.endDate);

    const startOffsetDays = differenceInDays(subProjectStart, timelineStartDate);
    const durationDays = differenceInDays(subProjectEnd, subProjectStart) + 1;

    // Clamp to visible day range
    const rawLeft = startOffsetDays * CELL_WIDTH;
    const rawRight = rawLeft + durationDays * CELL_WIDTH;
    const maxWidth = totalVisibleDays * CELL_WIDTH;
    const left = Math.max(0, rawLeft);
    const right = Math.min(maxWidth, rawRight);
    const width = Math.max(0, right - left);

    if (width <= 0) return null;

    return (
        <div className="absolute top-0 bottom-0" style={{ left: `${left}px`, width: `${width}px` }}>
            <SubProjectBar
                subProject={subProject}
                width={width}
                onDoubleClick={onDoubleClick}
                onQuickEdit={onQuickEdit}
                onItemClick={onItemClick}
                onItemContextMenu={onItemContextMenu}
                className="h-full"
                colorMode={colorMode}
                systemAccent={systemAccent}
            />
        </div>
    );
}
