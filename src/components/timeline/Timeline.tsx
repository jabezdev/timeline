import { useState, useMemo, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useSensor, useSensors, PointerSensor, pointerWithin, Modifier } from '@dnd-kit/core';
import { addDays, subDays, startOfWeek, differenceInDays, parseISO, format } from 'date-fns';
import { TimelineHeader } from './TimelineHeader';
import { WorkspaceSection } from './WorkspaceSection';
import { SidebarHeader, SidebarWorkspace } from './Sidebar';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { Plus } from 'lucide-react';
import { AddItemDialog } from './AddItemDialog';
import { ItemDialog } from './ItemDialog';
import { TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { SIDEBAR_WIDTH, CELL_WIDTH } from './TimelineHeader';
import { SubProjectBar } from './SubProjectRow';
import { UnifiedItemView } from './UnifiedItem';
import { MilestoneItemView } from './MilestoneItem';

export function Timeline() {
  const [startDate, setStartDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | Milestone | SubProject | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState<{ type: string; item: any } | null>(null);
  const [dragOffsetDays, setDragOffsetDays] = useState(0);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const pendingScrollRef = useRef<{ type: 'instant' | 'smooth'; value: number } | null>(null);
  const visibleDays = 21;
  
  const { 
    workspaces, 
    openProjectIds, 
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
  } = useTimelineStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!timelineRef.current) {
      // Fallback to original behavior if ref not available
      setStartDate(prev => 
        direction === 'next' 
          ? addDays(prev, 7) 
          : subDays(prev, 7)
      );
      return;
    }

    const currentScrollLeft = timelineRef.current.scrollLeft;
    
    if (direction === 'prev') {
      // Store the target scroll position to be applied before paint
      pendingScrollRef.current = { type: 'instant', value: currentScrollLeft + (7 * CELL_WIDTH) };
      // Add 7 days to the left by shifting startDate back
      setStartDate(prev => subDays(prev, 7));
    } else {
      // Store the target scroll position to be applied before paint
      pendingScrollRef.current = { type: 'instant', value: Math.max(0, currentScrollLeft - (7 * CELL_WIDTH)) };
      // Add 7 days to the right by shifting startDate forward
      setStartDate(prev => addDays(prev, 7));
    }
  };

  const handleTodayClick = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const daysSinceCurrentStart = differenceInDays(today, startDate);
    
    // Check if today is already within the current visible range (with some buffer)
    if (daysSinceCurrentStart >= 0 && daysSinceCurrentStart < visibleDays) {
      // Today is in the current range, just smooth scroll to it
      if (timelineRef.current) {
        const scrollOffset = daysSinceCurrentStart * CELL_WIDTH;
        timelineRef.current.scrollTo({
          left: scrollOffset,
          behavior: 'smooth'
        });
      }
    } else {
      // Today is outside current range, update startDate and then scroll
      const newDaysSinceStart = differenceInDays(today, weekStart);
      if (newDaysSinceStart >= 0 && newDaysSinceStart < visibleDays) {
        pendingScrollRef.current = { type: 'smooth', value: newDaysSinceStart * CELL_WIDTH };
      }
      setStartDate(weekStart);
    }
  };

  // Apply pending scroll adjustments before browser paint to avoid visual flash
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
    setActiveDragItem(null);
    const { active, over } = event;
    
    if (!over) return;
    
    const dropData = over.data.current as { projectId: string; date: string; subProjectId?: string } | undefined;
    if (!dropData) return;
    
    const dragData = active.data.current as { type: string; item: any } | undefined;
    if (!dragData) return;
    
    const newDate = dropData.date;
    
    switch (dragData.type) {
      case 'item':
        const item = dragData.item as TimelineItem;
        // If subProjectId changed (including undefined <-> string), update it
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

  // Custom modifier to offset the drag overlay based on where the user clicked
  const adjustTranslate: Modifier = useCallback(({ transform }) => {
    return {
      ...transform,
      x: transform.x - dragOffset.x,
      y: transform.y - dragOffset.y,
    };
  }, [dragOffset]);

  const handleAddItem = (title: string, date: string, projectId: string, subProjectId?: string) => {
    addItem(projectId, title, date, subProjectId);
  };

  const handleAddMilestone = (projectId: string, title: string, date: string) => {
    addMilestone(projectId, title, date);
  };

  const handleItemClick = (item: TimelineItem | Milestone | SubProject) => {
    setSelectedItem(item);
    setIsItemDialogOpen(true);
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

  const allProjects = workspaces.flatMap(ws => 
    ws.projects.map(p => ({ ...p, workspaceName: ws.name }))
  );

  const allSubProjects = workspaces.flatMap(ws =>
    ws.projects.flatMap(p =>
      (p.subProjects || []).map(sp => ({
        id: sp.id,
        title: sp.title,
        projectId: sp.projectId,
      }))
    )
  );

  // Sort: active workspaces (with open projects) first, then expanded, then collapsed
  const sortedWorkspaces = useMemo(() => {
    const hasOpenProject = (ws: typeof workspaces[0]) => 
      ws.projects.some(p => openProjectIds.has(p.id));
    
    const activeWorkspaces = workspaces.filter(ws => !ws.isCollapsed && hasOpenProject(ws));
    const expandedWorkspaces = workspaces.filter(ws => !ws.isCollapsed && !hasOpenProject(ws));
    const collapsedWorkspaces = workspaces.filter(ws => ws.isCollapsed);
    
    return [...activeWorkspaces, ...expandedWorkspaces, ...collapsedWorkspaces];
  }, [workspaces, openProjectIds]);

  // Sync scroll between sidebar and timeline content
  const sidebarRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Scroll to today's date on initial load
  useEffect(() => {
    if (timelineRef.current) {
      const today = new Date();
      const daysSinceStart = differenceInDays(today, startDate);
      // Only scroll if today is within the visible range
      if (daysSinceStart >= 0 && daysSinceStart < visibleDays) {
        const scrollOffset = daysSinceStart * CELL_WIDTH;
        timelineRef.current.scrollLeft = scrollOffset;
      }
    }
  }, []); // Only run on mount

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
          {/* Sidebar Header */}
          <SidebarHeader 
            startDate={startDate}
            onNavigate={handleNavigate}
            onTodayClick={handleTodayClick}
            onExpandAll={expandAllWorkspaces}
          />
          
          {/* Sidebar Content - synced vertical scroll */}
          <div 
            ref={sidebarRef}
            className="flex-1 overflow-y-auto overflow-x-hidden"
            onScroll={handleSidebarScroll}
          >
            {sortedWorkspaces.map(workspace => (
              <SidebarWorkspace
                key={workspace.id}
                workspace={workspace}
                openProjectIds={openProjectIds}
                onToggleWorkspace={() => toggleWorkspace(workspace.id)}
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
            {/* Timeline Header - sticky at top */}
            <TimelineHeader 
              startDate={startDate} 
              visibleDays={visibleDays}
            />
            
            {/* Workspaces and projects */}
            {sortedWorkspaces.map(workspace => (
              <WorkspaceSection
                key={workspace.id}
                workspace={workspace}
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
        
        {/* Floating Add Button */}
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
        onAddSubProject={addSubProject}
        projects={allProjects}
        subProjects={allSubProjects}
        activeProjectId={Array.from(openProjectIds)[0]}
      />

      <ItemDialog
        item={selectedItem}
        open={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        onSave={handleItemSave}
      />

      <DragOverlay modifiers={[adjustTranslate]} dropAnimation={null}>
        {activeDragItem ? (
          activeDragItem.type === 'subProject' ? (
             (() => {
                const subProject = activeDragItem.item as SubProject;
                const subProjectStart = parseISO(subProject.startDate);
                const subProjectEnd = parseISO(subProject.endDate);
                const durationDays = differenceInDays(subProjectEnd, subProjectStart) + 1;
                const width = durationDays * CELL_WIDTH;
                const height = activeDragItem.rowHeight || 64;
                return (
                    <SubProjectBar 
                        subProject={subProject} 
                        width={width}
                        height={height - 8} // Account for top-1 bottom-1 margins
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
          ) : null
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
