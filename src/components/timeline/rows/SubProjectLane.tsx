import React from 'react';
import { SubProject, TimelineItem } from '@/types/timeline';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { CELL_WIDTH, SUBPROJECT_HEADER_HEIGHT, EMPTY_ARRAY } from '@/lib/constants';
import { StaticSubProjectBar } from './StaticSubProjectBar';
import { SubProjectCell } from './SubProjectCell';

interface SubProjectLaneProps {
    subProjects: SubProject[];
    itemsBySubProject: Map<string, Map<string, TimelineItem[]>>;
    days: { date: Date; dateStr: string }[];
    workspaceColor: number;
    onToggleItemComplete: (itemId: string) => void;
    onItemDoubleClick: (item: TimelineItem) => void;
    onSubProjectDoubleClick: (subProject: SubProject) => void;
    rowHeight?: number;
    laneIndex: number;
    projectId: string;
    onQuickCreate: (type: 'item' | 'milestone', projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
    onQuickEdit: (item: TimelineItem | SubProject, anchorElement?: HTMLElement) => void;
    onItemClick: (id: string, multi: boolean, e: React.MouseEvent) => void;
    onItemContextMenu: (id: string, type: 'item' | 'milestone' | 'subproject', e: React.MouseEvent) => void;
    colorMode?: 'full' | 'monochromatic';
    systemAccent?: string;
}

export function SubProjectLane({
    subProjects,
    itemsBySubProject,
    days,
    workspaceColor,
    onToggleItemComplete,
    onItemDoubleClick,
    onSubProjectDoubleClick,
    rowHeight = 64,
    laneIndex,
    projectId,
    onQuickCreate,
    onQuickEdit,
    onItemClick,
    onItemContextMenu,
    colorMode,
    systemAccent
}: SubProjectLaneProps) {

    const timelineStartDate = days[0].date;
    const cellHeight = rowHeight - SUBPROJECT_HEADER_HEIGHT;

    return (
        <div className="relative flex flex-col min-h-[64px]">
            {/* Column dividers - full height background layer */}
            <div className="absolute inset-0 flex pointer-events-none">
                {days.map(({ date, dateStr }, index) => (
                    <div
                        key={dateStr}
                        className={`shrink-0 ${index < days.length - 1 ? 'border-r border-border/50' : ''}`}
                        style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
                    />
                ))}
            </div>

            {/* SubProject Bars - visual layer */}
            <div className="absolute inset-0 pointer-events-none z-20">
                {subProjects.map(sub => (
                    <StaticSubProjectBar
                        key={sub.id}
                        subProject={sub}
                        timelineStartDate={timelineStartDate}
                        totalVisibleDays={days.length}
                        onDoubleClick={onSubProjectDoubleClick}
                        onQuickEdit={onQuickEdit}
                        onItemClick={onItemClick}
                        onItemContextMenu={onItemContextMenu}
                        colorMode={colorMode}
                        systemAccent={systemAccent}
                    />
                ))}
            </div>

            {/* Items layer - rendered on top with padding to account for subproject header */}
            <div className="relative flex z-30" style={{ marginTop: SUBPROJECT_HEADER_HEIGHT }}>
                {days.map(({ date, dateStr }) => {
                    const activeSubProject = subProjects.find(sub =>
                        isWithinInterval(date, {
                            start: parseISO(sub.startDate),
                            end: parseISO(sub.endDate)
                        })
                    );

                    const items = activeSubProject
                        ? itemsBySubProject.get(activeSubProject.id)?.get(dateStr) || EMPTY_ARRAY
                        : EMPTY_ARRAY;

                    return (
                        <SubProjectCell
                            key={dateStr}
                            date={date}
                            dateStr={dateStr}
                            projectId={projectId}
                            activeSubProject={activeSubProject}
                            items={items as TimelineItem[]}
                            workspaceColor={workspaceColor}
                            onToggleItemComplete={onToggleItemComplete}
                            onItemDoubleClick={onItemDoubleClick}
                            height={cellHeight}
                            onQuickCreate={onQuickCreate}
                            onQuickEdit={onQuickEdit}
                            onItemClick={onItemClick}
                            onItemContextMenu={onItemContextMenu}
                            colorMode={colorMode}
                            systemAccent={systemAccent}
                        />
                    );
                })}
            </div>
        </div>
    );
}
