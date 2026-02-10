import React from 'react';
import { SubProject, TimelineItem } from '@/types/timeline';
import { useTimelineStore } from '@/hooks/useTimelineStore';

export const SubProjectBar = React.forwardRef<HTMLDivElement, {
    subProject: SubProject;
    width?: number;
    height?: number;
    left?: number;
    onDoubleClick?: (subProject: SubProject) => void;
    style?: React.CSSProperties;
    className?: string;
    children?: React.ReactNode;
    onQuickEdit?: (item: SubProject, anchorElement?: HTMLElement) => void;
    onItemClick?: (id: string, multi: boolean, e: React.MouseEvent) => void;
    onItemContextMenu?: (id: string, type: 'item' | 'milestone' | 'subproject', e: React.MouseEvent) => void;
    colorMode?: 'full' | 'monochromatic';
    systemAccent?: string;
}>(({
    subProject,
    width,
    height,
    left,
    onDoubleClick,
    style,
    className,
    children,
    onQuickEdit,
    onItemClick,
    onItemContextMenu,
    colorMode,
    systemAccent
}, ref) => {
    const isSelected = useTimelineStore(state => state.selectedIds.has(subProject.id));

    const effectiveVar = colorMode === 'monochromatic'
        ? 'var(--primary)'
        : (subProject.color ? (subProject.color.startsWith('#') ? undefined : `var(--workspace-${subProject.color})`) : 'var(--primary)'); // Default fallback

    let borderColor, bgColor, headerBg;

    if (colorMode === 'monochromatic') {
        // Monochromatic overrides everything
        borderColor = `hsl(${effectiveVar} / 0.3)`;
        bgColor = `hsl(${effectiveVar} / 0.08)`;
        headerBg = `hsl(${effectiveVar} / 0.2)`;
    } else {
        // Normal mode
        if (subProject.color && subProject.color.startsWith('#')) {
            borderColor = `${subProject.color}30`;
            bgColor = `${subProject.color}08`;
            headerBg = `${subProject.color}20`;
        } else if (subProject.color) { // Workspace color index
            borderColor = `hsl(var(--workspace-${subProject.color}) / 0.3)`;
            bgColor = `hsl(var(--workspace-${subProject.color}) / 0.08)`;
            headerBg = `hsl(var(--workspace-${subProject.color}) / 0.2)`;
        } else { // Default
            borderColor = 'hsl(var(--primary) / 0.2)';
            bgColor = 'hsl(var(--primary) / 0.05)';
            headerBg = 'hsl(var(--primary) / 0.15)';
        }
    }

    // Selected Style Override
    if (isSelected) {
        borderColor = 'hsl(var(--primary))';
        headerBg = 'hsl(var(--primary) / 0.4)';
        bgColor = 'hsl(var(--primary) / 0.15)';
    }

    return (
        <div
            ref={ref}
            className={`group border border-dashed flex flex-col pointer-events-none z-10 ${className || ''}`}
            style={{
                left: left !== undefined ? `${left}px` : undefined,
                width: width !== undefined ? `${width}px` : undefined,
                height: height !== undefined ? `${height}px` : undefined,
                borderColor,
                backgroundColor: bgColor,
                ...style
            }}
        >
            {/* Header - sticky title */}
            <div className="h-6 shrink-0 w-full z-20 pointer-events-auto">
                <div
                    className="sticky w-fit max-w-[250px] flex items-center h-full pl-2.5 pr-2"
                    style={{
                        left: 'var(--sidebar-width)',
                        backgroundColor: headerBg,
                    }}
                >
                    {/* Title - Clickable to Edit */}
                    <div
                        onContextMenu={(e) => {
                            if (onItemContextMenu) onItemContextMenu(subProject.id, 'subproject', e);
                            else {
                                e.preventDefault();
                                e.stopPropagation();
                                if (onQuickEdit) onQuickEdit(subProject, e.currentTarget);
                            }
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onItemClick) onItemClick(subProject.id, e.ctrlKey || e.metaKey, e);
                            else if (onDoubleClick) onDoubleClick(subProject);
                        }}
                        className="flex-1 min-w-0 flex items-center h-full cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-sm px-1.5"
                    >
                        <span className="text-xs font-semibold truncate text-foreground">
                            {subProject.title}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content area - Render children or placeholder */}
            <div className="flex-1 rounded-b-sm overflow-hidden pointer-events-none">
                {children}
            </div>
        </div>
    );
});
