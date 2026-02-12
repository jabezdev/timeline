import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTimelineMutations } from '@/hooks/useTimelineMutations';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { useTimelineKeyboard } from '@/hooks/useTimelineKeyboard';
import { generateId } from '@/lib/utils';
import { addDays, parseISO, format, differenceInDays } from 'date-fns';
import { TimelineItem, Milestone, SubProject, TimelineState } from '@/types/timeline';

export function useTimelineHandlers({
    timelineState
}: {
    timelineState: TimelineState
}) {
    const mutations = useTimelineMutations();

    // Optimisation: Use granular selectors to avoid re-rendering when other parts of the store change
    const toggleSelection = useTimelineStore(state => state.toggleSelection);
    const selectItem = useTimelineStore(state => state.selectItem);
    const clearSelection = useTimelineStore(state => state.clearSelection);
    const setSidebarWidth = useTimelineStore(state => state.setSidebarWidth);
    const sidebarWidth = useTimelineStore(state => state.sidebarWidth);

    // UI State Setters from store (these are stable and don't trigger re-renders if selected carefully)
    const setSelectedItem = useTimelineStore(state => state.setSelectedItem);
    const setIsItemDialogOpen = useTimelineStore(state => state.setIsItemDialogOpen);
    const setQuickCreateState = useTimelineStore(state => state.setQuickCreateState);
    const setQuickEditState = useTimelineStore(state => state.setQuickEditState);


    // Refs for access in callbacks without dependency changes
    const timelineStateRef = useRef(timelineState);
    timelineStateRef.current = timelineState;



    /* Handlers */
    const handleQuickCreate = useCallback((type: 'item' | 'milestone', projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => {
        const rect = anchorElement?.getBoundingClientRect();
        setQuickCreateState({
            open: true,
            type,
            projectId,
            date,
            subProjectId,
            workspaceColor,
            anchorRect: rect ? {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left,
                right: rect.right,
                bottom: rect.bottom,
                toJSON: rect.toJSON
            } : undefined
        });
    }, []);

    const handleQuickEdit = useCallback((item: TimelineItem | Milestone | SubProject, anchorElement?: HTMLElement) => {
        const rect = anchorElement?.getBoundingClientRect();
        setQuickEditState({
            open: true,
            item,
            anchorRect: rect ? {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left,
                right: rect.right,
                bottom: rect.bottom,
                toJSON: rect.toJSON
            } : undefined
        });
    }, []);

    // Keyboard Hook
    const { handleSelection } = useTimelineKeyboard({
        timelineState,
        onQuickEdit: (item) => handleQuickEdit(item)
    });

    const handleAddItem = useCallback((title: string, date: string, projectId: string, subProjectId?: string, color?: number) => {
        const newItem: TimelineItem = {
            id: generateId(),
            title,
            date,
            projectId,
            subProjectId,
            color: color ? String(color) : undefined,
            completed: false,
            content: ''
        };
        mutations.addItem.mutate(newItem);
    }, [mutations.addItem]);

    const handleAddMilestone = useCallback((projectId: string, title: string, date: string, color?: number) => {
        const newMilestone: Milestone = {
            id: generateId(),
            title,
            date,
            projectId,
            color: color ? String(color) : undefined
        };
        mutations.addMilestone.mutate(newMilestone);
    }, [mutations.addMilestone]);

    const handleAddSubProject = useCallback((projectId: string, title: string, startDate: string, endDate: string, color?: number) => {
        const newSub: SubProject = {
            id: generateId(),
            title,
            startDate,
            endDate,
            projectId,
            color: color ? String(color) : undefined
        };
        mutations.addSubProject.mutate(newSub);
    }, [mutations.addSubProject]);

    const handleItemClick = useCallback((id: string, multi: boolean, e: React.MouseEvent) => {
        e.stopPropagation();

        // 1. Handle Selection Logic - Always use multi-select (automatic multi-select)
        toggleSelection(id, true);

        // Fetch item for further logic
        const ts = timelineStateRef.current;
        const item = ts.items[id] || ts.milestones[id] || ts.subProjects[id];

        if (item) {
            // If it's a subproject, we also want to visually select all its children
            if ('startDate' in item && !('completed' in item)) {
                const childItems = Object.values(ts.items).filter(i => i.subProjectId === id);
                if (childItems.length > 0) {
                    const currentSelected = useTimelineStore.getState().selectedIds;
                    const newSet = new Set(currentSelected);
                    newSet.add(id);
                    childItems.forEach(c => newSet.add(c.id));
                    useTimelineStore.getState().setSelectedIds(newSet);
                }
            }
        }

        // Ensure Sidebar is closed on left click
        setIsItemDialogOpen(false);
    }, [toggleSelection]);

    const handleItemContextMenu = useCallback((id: string, type: 'item' | 'milestone' | 'subproject', e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // 1. Select the item
        handleSelection(id, false);

        // 2. Open Sidebar (Item Sheet)
        const ts = timelineStateRef.current;
        const item = ts.items[id] || ts.milestones[id] || ts.subProjects[id];

        if (item) {
            setSelectedItem(item);
            setIsItemDialogOpen(true);
        }
    }, [handleSelection]);

    const handleItemDoubleClick = useCallback((item: TimelineItem | Milestone | SubProject, e?: React.MouseEvent) => {
        // Single-select the double-clicked item (clear other selections)
        selectItem(item.id, false);

        // Open quick edit dialog
        handleQuickEdit(item, e?.currentTarget as HTMLElement);
    }, [selectItem, handleQuickEdit]);

    const handleItemDelete = useCallback((item: TimelineItem | Milestone | SubProject, deleteItems: boolean = false) => {
        if ('completed' in item) {
            mutations.deleteItem.mutate(item.id);
        } else if ('startDate' in item) {
            mutations.deleteSubProject.mutate({ id: item.id, deleteItems });
        } else {
            mutations.deleteMilestone.mutate(item.id);
        }
    }, [mutations.deleteItem, mutations.deleteMilestone, mutations.deleteSubProject]);

    const handleItemSave = useCallback((updatedItem: TimelineItem | Milestone | SubProject) => {
        const currentTimelineState = timelineStateRef.current;

        if ('completed' in updatedItem) {
            mutations.updateItem.mutate({ id: updatedItem.id, updates: updatedItem as TimelineItem });
        } else if ('startDate' in updatedItem) {
            let childItemsToUpdate: Partial<TimelineItem>[] = [];

            const currentSelectedItem = useTimelineStore.getState().selectedItem;
            if (currentSelectedItem && 'startDate' in currentSelectedItem) {
                const originalSP = currentSelectedItem as SubProject;
                const newSP = updatedItem as SubProject;

                if (originalSP.id === newSP.id && originalSP.startDate !== newSP.startDate) {
                    const oldStart = parseISO(originalSP.startDate);
                    const newStart = parseISO(newSP.startDate);
                    const diffDays = differenceInDays(newStart, oldStart);

                    if (diffDays !== 0) {
                        const relatedItems = Object.values(currentTimelineState.items || {}).filter(i => i.subProjectId === originalSP.id);
                        if (relatedItems.length > 0) {
                            childItemsToUpdate = relatedItems.map(item => ({
                                id: item.id,
                                date: format(addDays(parseISO(item.date), diffDays), 'yyyy-MM-dd')
                            }));
                        }
                    }
                }
            }

            mutations.updateSubProject.mutate({
                id: updatedItem.id,
                updates: updatedItem as SubProject,
                childItemsToUpdate
            });
        } else {
            mutations.updateMilestone.mutate({ id: updatedItem.id, updates: updatedItem as Milestone });
        }
    }, [mutations.updateItem, mutations.updateSubProject, mutations.updateMilestone]);

    const handleToggleItemComplete = useCallback((id: string) => {
        const item = timelineStateRef.current.items[id];
        if (item) {
            mutations.updateItem.mutate({
                id,
                updates: { completed: !item.completed, completedAt: !item.completed ? new Date().toISOString() : undefined }
            });
        }
    }, [mutations.updateItem]);

    /* Sidebar Resize Logic */
    const isResizingRef = useRef(false);
    const currentWidthRef = useRef(sidebarWidth);
    const animationFrameRef = useRef<number>(0);

    // Update the ref when sidebarWidth changes, but don't force a re-render loop if not needed
    useEffect(() => {
        currentWidthRef.current = sidebarWidth;
        document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    }, [sidebarWidth]);

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizingRef.current = true;

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.body.classList.add('sidebar-resizing');

        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizingRef.current) return;

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            animationFrameRef.current = requestAnimationFrame(() => {
                const newWidth = Math.max(250, Math.min(600, e.clientX));
                currentWidthRef.current = newWidth;
                document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
            });
        };

        const handleMouseUp = () => {
            isResizingRef.current = false;

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }

            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.body.classList.remove('sidebar-resizing');

            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);

            setSidebarWidth(currentWidthRef.current);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [setSidebarWidth]);

    return useMemo(() => ({
        // Handlers
        handleQuickCreate,
        handleQuickEdit,
        handleAddItem,
        handleAddMilestone,
        handleAddSubProject,
        handleItemClick,
        handleItemContextMenu,
        handleItemDoubleClick,
        handleItemDelete,
        handleItemSave,
        handleToggleItemComplete,
        handleResizeStart,
        clearSelection,
        setQuickEditState,
    }), [
        handleQuickCreate,
        handleQuickEdit,
        handleAddItem,
        handleAddMilestone,
        handleAddSubProject,
        handleItemClick,
        handleItemContextMenu,
        handleItemDoubleClick,
        handleItemDelete,
        handleItemSave,
        handleToggleItemComplete,
        handleResizeStart,
        clearSelection,
        setQuickEditState,
    ]);
}
