import React from 'react';
import { SubProject, TimelineItem } from '@/types/timeline';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { UnifiedItem } from '../items/UnifiedItem';
import { CELL_WIDTH } from '@/lib/constants';

interface SubProjectCellProps {
    date: Date;
    dateStr: string;
    projectId: string;
    activeSubProject: SubProject | undefined;
    items: TimelineItem[];
    workspaceColor: number;
    onToggleItemComplete: (itemId: string) => void;
    onItemDoubleClick: (item: TimelineItem) => void;
    height: number;
    onQuickCreate: (type: 'item' | 'milestone', projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
    onQuickEdit: (item: TimelineItem | SubProject, anchorElement?: HTMLElement) => void;
    onItemClick: (id: string, multi: boolean, e: React.MouseEvent) => void;
    onItemContextMenu: (id: string, type: 'item' | 'milestone' | 'subproject', e: React.MouseEvent) => void;
    colorMode?: 'full' | 'monochromatic';
    systemAccent?: string;
}

export function SubProjectCell({
    date,
    dateStr,
    projectId,
    activeSubProject,
    items,
    workspaceColor,
    onToggleItemComplete,
    onItemDoubleClick,
    height,
    onQuickCreate,
    onQuickEdit,
    onItemClick,
    onItemContextMenu,
    colorMode,
    systemAccent
}: SubProjectCellProps) {
    return (
        <div
            className="shrink-0 px-0 py-0"
            style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH, minHeight: height }}
            onClick={(e) => activeSubProject && onQuickCreate('item', projectId, dateStr, activeSubProject.id, workspaceColor, e.currentTarget)}
        >
            <div className="relative w-full h-full group/cell">
                <div className="flex flex-col gap-0 h-full pointer-events-none">
                    {items.map(item => (
                        <div key={item.id} className="pointer-events-auto">
                            <UnifiedItem
                                item={item}
                                onToggleComplete={onToggleItemComplete}
                                onDoubleClick={onItemDoubleClick}
                                onQuickEdit={onQuickEdit}
                                workspaceColor={workspaceColor}
                                minHeight={height}
                                onClick={(multi, e) => onItemClick(item.id, multi, e)}
                                onContextMenu={(e) => onItemContextMenu(item.id, 'item', e)}
                                colorMode={colorMode}
                                systemAccent={systemAccent}
                            />
                        </div>
                    ))}
                </div>

                {/* Quick Add Button for SubProject */}
                {activeSubProject && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onQuickCreate('item', projectId, dateStr, activeSubProject.id, workspaceColor, e.currentTarget);
                        }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-md opacity-0 group-hover/cell:opacity-100 transition-all bg-primary/20 hover:bg-primary/40 flex items-center justify-center z-10 pointer-events-auto"
                        title="Add task to subproject"
                    >
                        <Plus className="w-3 h-3 text-primary" strokeWidth={2.5} />
                    </button>
                )}
            </div>
        </div>
    );
}
