import { useState, useMemo, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor, pointerWithin, Modifier } from '@dnd-kit/core';
import { addDays, subDays, startOfWeek, differenceInDays, parseISO, format } from 'date-fns';
import { TimelineHeader } from './TimelineHeader';
import { WorkspaceSection } from './WorkspaceSection';
import { SidebarHeader, SidebarWorkspace } from './Sidebar';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { Plus } from 'lucide-react';
import { AddItemDialog } from './AddItemDialog';
import { ItemDialog } from './ItemDialog';
import { TimelineItem, Milestone, SubProject, Project, Workspace } from '@/types/timeline';
import { SIDEBAR_WIDTH, CELL_WIDTH } from './TimelineHeader';
import { SubProjectBar } from './SubProjectRow';
import { UnifiedItemView } from './UnifiedItem';
import { MilestoneItemView } from './MilestoneItem';
import { DropAnimationProvider, useDropAnimation } from './DropAnimationContext';

function TimelineContent() {
  const [startDate, setStartDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | Milestone | SubProject | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState<{ type: string; item: any } | null>(null);
  const [subProjectToDelete, setSubProjectToDelete] = useState<SubProject | null>(null);
  const [dragOffsetDays, setDragOffsetDays] = useState(0);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const pendingScrollRef = useRef<{ type: 'instant' | 'smooth'; value: number } | null>(null);
  const dragOverlayRef = useRef<HTMLDivElement>(null);
  const visibleDays = 21;

  const { registerDrop } = useDropAnimation();

  // Select state from store
  const {
    workspaces: workspacesMap,
    projects: projectsMap,
    items: itemsMap,
    subProjects: subProjectsMap,
    milestones: milestonesMap,
    workspaceOrder,
    openProjectIds: openProjectIdsArray,
    toggleWorkspace,
    toggleProject,
    updateItemDate,
    updateMilestoneDate,
    toggleItemComplete,
    addItem,
    updateItem,
    updateMilestone,
    addWorkspace,
    addProject,
    expandAllWorkspaces,
    updateSubProjectDate,
    addSubProject,
    updateSubProject,
    addMilestone,
    deleteItem,
    deleteMilestone,
    deleteSubProject,
    fetchRange,
  } = useTimelineStore();

  const openProjectIds = useMemo(() => new Set(openProjectIdsArray), [openProjectIdsArray]);

  // Derived State: Grouping
  const { projectsItems, projectsMilestones, projectsSubProjects, allProjects } = useMemo(() => {
    const pItems = new Map<string, TimelineItem[]>();
    const pMilestones = new Map<string, Milestone[]>();
    const pSubProjects = new Map<string, SubProject[]>();
    const allProjs: Array<Project & { workspaceName: string }> = [];

    // Initialize maps for all projects
    Object.values(projectsMap).forEach(p => {
      const ws = workspacesMap[p.workspaceId];
      // Only include project if workspace exists (filter orphans)
      if (ws) {
        pItems.set(p.id, []);
        pMilestones.set(p.id, []);
        pSubProjects.set(p.id, []);
        allProjs.push({ ...p, workspaceName: ws.name });
      }
    });

    Object.values(itemsMap).forEach(i => {
      if (pItems.has(i.projectId)) pItems.get(i.projectId)!.push(i);
    });

    Object.values(milestonesMap).forEach(m => {
      if (pMilestones.has(m.projectId)) pMilestones.get(m.projectId)!.push(m);
    });

    Object.values(subProjectsMap).forEach(sp => {
      if (pSubProjects.has(sp.projectId)) pSubProjects.get(sp.projectId)!.push(sp);
    });

    return {
      projectsItems: pItems,
      projectsMilestones: pMilestones,
      projectsSubProjects: pSubProjects,
      allProjects: allProjs
    };
  }, [workspacesMap, projectsMap, itemsMap, milestonesMap, subProjectsMap]);

  // Derived State: Workspace -> Projects list (ordered)
  // Create a map of workspaceId -> Projects (Sorted by position)
  const workspaceProjects = useMemo(() => {
    const map = new Map<string, Project[]>();

    // Initialize buckets
    Object.keys(workspacesMap).forEach(wsId => map.set(wsId, []));

    // Distribute projects
    Object.values(projectsMap).forEach(p => {
      if (map.has(p.workspaceId) && !p.isHidden) {
        map.get(p.workspaceId)?.push(p);
      }
    });

    // Sort each bucket
    map.forEach(projs => {
      projs.sort((a, b) => (a.position || 0) - (b.position || 0));
    });

    return map;
  }, [workspacesMap, projectsMap]);

  // Derived State: SubProjects List for Dialog
  const allSubProjects = useMemo(() => Object.values(subProjectsMap).map(sp => ({
    id: sp.id,
    title: sp.title,
    projectId: sp.projectId
  })), [subProjectsMap]);


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!timelineRef.current) {
      setStartDate(prev =>
        direction === 'next'
          ? addDays(prev, 7)
          : subDays(prev, 7)
      );
      return;
    }

    const currentScrollLeft = timelineRef.current.scrollLeft;

    if (direction === 'prev') {
      pendingScrollRef.current = { type: 'instant', value: currentScrollLeft + (7 * CELL_WIDTH) };
      setStartDate(prev => subDays(prev, 7));
    } else {
      pendingScrollRef.current = { type: 'instant', value: Math.max(0, currentScrollLeft - (7 * CELL_WIDTH)) };
      setStartDate(prev => addDays(prev, 7));
    }
  };

  const handleTodayClick = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const daysSinceCurrentStart = differenceInDays(today, startDate);

    if (daysSinceCurrentStart >= 0 && daysSinceCurrentStart < visibleDays) {
      if (timelineRef.current) {
        const scrollOffset = daysSinceCurrentStart * CELL_WIDTH;
        timelineRef.current.scrollTo({
          left: scrollOffset,
          behavior: 'smooth'
        });
      }
    } else {
      const newDaysSinceStart = differenceInDays(today, weekStart);
      if (newDaysSinceStart >= 0 && newDaysSinceStart < visibleDays) {
        pendingScrollRef.current = { type: 'smooth', value: newDaysSinceStart * CELL_WIDTH };
      }
      setStartDate(weekStart);
    }
  };

  useLayoutEffect(() => {
    if (pendingScrollRef.current && timelineRef.current) {
      const { type, value } = pendingScrollRef.current;
      if (type === 'instant') {
        timelineRef.current.scrollLeft = value;
      } else {
        timelineRef.current.scrollTo({
          left: value,
          behavior: 'smooth'
        });
      }
      pendingScrollRef.current = null;
    }
  }, [startDate]);

  // Fetch data when startDate changes
  useEffect(() => {
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(addDays(startDate, visibleDays), 'yyyy-MM-dd');
    fetchRange(startStr, endStr);
  }, [startDate, fetchRange, visibleDays]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current as any);

    const rect = event.active.rect.current?.initial;
    const activatorEvent = event.activatorEvent as any;

    if (rect && activatorEvent) {
      const clientX = activatorEvent.touches ? activatorEvent.touches[0].clientX : activatorEvent.clientX;
      const clientY = activatorEvent.touches ? activatorEvent.touches[0].clientY : activatorEvent.clientY;

      if (typeof clientX === 'number' && typeof clientY === 'number') {
        const offsetX = clientX - rect.left;
        const offsetY = clientY - rect.top;
        setDragOffset({ x: offsetX, y: offsetY });

        if (event.active.data.current?.type === 'subProject') {
          const days = Math.floor(offsetX / CELL_WIDTH);
          setDragOffsetDays(days);
        } else {
          setDragOffsetDays(0);
        }
        return;
      }
    }
    setDragOffset({ x: 0, y: 0 });
    setDragOffsetDays(0);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (dragOverlayRef.current && active.id) {
      const rect = dragOverlayRef.current.getBoundingClientRect();
      registerDrop(String(active.id), rect);
    }

    setActiveDragItem(null);

    if (!over) return;

    const dropData = over.data.current as { projectId: string; date: string; subProjectId?: string } | undefined;
    if (!dropData) return;

    const dragData = active.data.current as { type: string; item: any } | undefined;
    if (!dragData) return;

    const newDate = dropData.date;

    switch (dragData.type) {
      case 'item':
        const item = dragData.item as TimelineItem;
        if (item.subProjectId !== dropData.subProjectId) {
          updateItem(item.id, { date: newDate, subProjectId: dropData.subProjectId });
        } else {
          updateItemDate(item.id, newDate);
        }
        break;
      case 'milestone':
        updateMilestoneDate(dragData.item.id, newDate);
        break;
      case 'subProject':
        const adjustedDate = subDays(parseISO(newDate), dragOffsetDays);
        updateSubProjectDate(dragData.item.id, format(adjustedDate, 'yyyy-MM-dd'));
        break;
    }
  };

  const adjustTranslate: Modifier = useCallback(({ transform }) => {
    return {
      ...transform,
      x: transform.x - dragOffset.x,
      y: transform.y - dragOffset.y,
    };
  }, [dragOffset]);

  const handleAddItem = (title: string, date: string, projectId: string, subProjectId?: string, color?: number) => {
    addItem(projectId, title, date, subProjectId, color);
  };

  const handleAddMilestone = (projectId: string, title: string, date: string, color?: number) => {
    addMilestone(projectId, title, date, color);
  };

  const handleAddSubProject = (projectId: string, title: string, startDate: string, endDate: string, color?: number) => {
    addSubProject(projectId, title, startDate, endDate, color);
  };

  const handleItemClick = (item: TimelineItem | Milestone | SubProject) => {
    setSelectedItem(item);
    setIsItemDialogOpen(true);
  };

  const handleItemDelete = (item: TimelineItem | Milestone | SubProject) => {
    if ('completed' in item) {
      deleteItem(item.id);
    } else if ('startDate' in item) {
      // Trigger custom dialog
      setSubProjectToDelete(item as SubProject);
      setIsItemDialogOpen(false); // Close the detail view
      return;
    } else {
      deleteMilestone(item.id);
    }
    setSelectedItem(null);
    setIsItemDialogOpen(false);
  };

  const handleItemSave = (updatedItem: TimelineItem | Milestone | SubProject) => {
    if ('completed' in updatedItem) {
      updateItem(updatedItem.id, updatedItem as TimelineItem);
    } else if ('startDate' in updatedItem) {
      updateSubProject(updatedItem.id, updatedItem as SubProject);
    } else {
      updateMilestone(updatedItem.id, updatedItem as Milestone);
    }
  };

  // Sort workspaces using workspaceOrder
  const sortedWorkspaceIds = useMemo(() => {
    const activeIds: string[] = [];
    const expandedIds: string[] = [];
    const collapsedIds: string[] = [];

    // Helper to check if a workspace has an open project
    const hasOpenProject = (wsId: string) => {
      const projs = workspaceProjects.get(wsId) || [];
      return projs.some(p => openProjectIds.has(p.id));
    };

    workspaceOrder.forEach(id => {
      const ws = workspacesMap[id];
      if (!ws || ws.isHidden) return;

      if (!ws.isCollapsed && hasOpenProject(id)) {
        activeIds.push(id);
      } else if (!ws.isCollapsed && !hasOpenProject(id)) {
        expandedIds.push(id);
      } else {
        collapsedIds.push(id);
      }
    });

    return [...activeIds, ...expandedIds, ...collapsedIds];
  }, [workspaceOrder, workspacesMap, openProjectIds]);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timelineRef.current) {
      const today = new Date();
      const daysSinceStart = differenceInDays(today, startDate);
      if (daysSinceStart >= 0 && daysSinceStart < visibleDays) {
        const scrollOffset = daysSinceStart * CELL_WIDTH;
        timelineRef.current.scrollLeft = scrollOffset;
      }
    }
  }, []);

  const handleTimelineScroll = () => {
    if (sidebarRef.current && timelineRef.current) {
      sidebarRef.current.scrollTop = timelineRef.current.scrollTop;
    }
  };

  const handleSidebarScroll = () => {
    if (sidebarRef.current && timelineRef.current) {
      timelineRef.current.scrollTop = sidebarRef.current.scrollTop;
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
      <div className="h-screen flex bg-background">
        {/* FIXED SIDEBAR */}
        <div
          className="flex flex-col border-r border-border bg-background shrink-0"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <SidebarHeader
            startDate={startDate}
            onNavigate={handleNavigate}
            onTodayClick={handleTodayClick}
            onExpandAll={expandAllWorkspaces}
          />

          <div
            ref={sidebarRef}
            className="flex-1 overflow-y-auto overflow-x-hidden"
            onScroll={handleSidebarScroll}
          >
            {sortedWorkspaceIds.map(id => workspacesMap[id] && (
              <SidebarWorkspace
                key={id}
                workspace={workspacesMap[id]}
                projects={workspaceProjects.get(id) || []}
                projectsItems={projectsItems}
                projectsSubProjects={projectsSubProjects}
                openProjectIds={Array.from(openProjectIds)}
                onToggleWorkspace={() => toggleWorkspace(id)}
                onToggleProject={toggleProject}
              />
            ))}
          </div>
        </div>

        {/* SCROLLABLE TIMELINE CONTENT */}
        <div
          ref={timelineRef}
          className="flex-1 overflow-y-auto overflow-x-scroll scrollbar-hide"
          onScroll={handleTimelineScroll}
        >
          <div className="min-w-fit">
            <TimelineHeader
              startDate={startDate}
              visibleDays={visibleDays}
            />

            {sortedWorkspaceIds.map(id => workspacesMap[id] && (
              <WorkspaceSection
                key={id}
                workspace={workspacesMap[id]}
                projects={workspaceProjects.get(id) || []}
                projectsItems={projectsItems}
                projectsMilestones={projectsMilestones}
                projectsSubProjects={projectsSubProjects}
                openProjectIds={openProjectIds}
                startDate={startDate}
                visibleDays={visibleDays}
                onToggleItemComplete={toggleItemComplete}
                onItemClick={handleItemClick}
                onSubProjectClick={handleItemClick}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="fixed bottom-4 right-4 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center z-30"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <AddItemDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAddItem={handleAddItem}
        onAddMilestone={handleAddMilestone}
        onAddSubProject={handleAddSubProject}
        projects={allProjects}
        subProjects={allSubProjects}
        activeProjectId={Array.from(openProjectIds)[0]}
      />

      <ItemDialog
        item={selectedItem}
        open={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        onSave={handleItemSave}
        onDelete={handleItemDelete}
      />

      <AlertDialog open={!!subProjectToDelete} onOpenChange={(open) => !open && setSubProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sub-Project</AlertDialogTitle>
            <AlertDialogDescription>
              How do you want to handle the items inside this sub-project?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (subProjectToDelete) {
                  deleteSubProject(subProjectToDelete.id, false);
                  setSubProjectToDelete(null);
                }
              }}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Keep Items (Unlink)
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                if (subProjectToDelete) {
                  deleteSubProject(subProjectToDelete.id, true);
                  setSubProjectToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DragOverlay modifiers={[adjustTranslate]} dropAnimation={null}>
        {activeDragItem ? (
          <div ref={dragOverlayRef}>
            {/* Simplified Drag Preview rendering for now to avoid complexity in this file 
                 Ideally these components also need to be updated to support normalized item or just take the item object
             */}
            {activeDragItem.type === 'subProject' ? (
              (() => {
                const subProject = activeDragItem.item as SubProject;
                const subProjectStart = parseISO(subProject.startDate);
                const subProjectEnd = parseISO(subProject.endDate);
                const durationDays = differenceInDays(subProjectEnd, subProjectStart) + 1;
                const width = durationDays * CELL_WIDTH;
                const height = (activeDragItem as any).rowHeight || 64;
                return (
                  <SubProjectBar
                    subProject={subProject}
                    width={width}
                    height={height - 8}
                    style={{ cursor: 'grabbing' }}
                  />
                );
              })()
            ) :
              activeDragItem.type === 'item' ? (
                <UnifiedItemView
                  item={activeDragItem.item as TimelineItem}
                  style={{ cursor: 'grabbing', width: CELL_WIDTH - 8 }}
                />
              ) :
                activeDragItem.type === 'milestone' ? (
                  <MilestoneItemView
                    milestone={activeDragItem.item as Milestone}
                    style={{ cursor: 'grabbing', width: CELL_WIDTH - 8 }}
                  />
                ) : null}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export function Timeline() {
  return (
    <DropAnimationProvider>
      <TimelineContent />
    </DropAnimationProvider>
  );
}
