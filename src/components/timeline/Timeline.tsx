import { useState, useEffect } from 'react';
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
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { addDays, subDays, parseISO, format, differenceInDays } from 'date-fns';
import { TimelineHeader } from './TimelineHeader';
import { WorkspaceSection } from './WorkspaceSection';
import { SidebarHeader, SidebarWorkspace } from './Sidebar';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { Plus } from 'lucide-react';
import { AddItemDialog } from './AddItemDialog';
import { ItemDialog } from './ItemDialog';
import { TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { SIDEBAR_WIDTH, CELL_WIDTH, VISIBLE_DAYS } from '@/lib/constants';
import { SubProjectBar } from './SubProjectRow';
import { UnifiedItemView } from './UnifiedItem';
import { MilestoneItemView } from './MilestoneItem';
import { DropAnimationProvider } from './DropAnimationContext';

// Hooks
import { useTimelineSelectors } from '@/hooks/useTimelineSelectors';
import { useTimelineDragDrop } from './hooks/useTimelineDragDrop';
import { useTimelineScroll } from './hooks/useTimelineScroll';
import { useTimelineVirtualization } from './hooks/useTimelineVirtualization';
import { useTimelineDataQuery, useStructureQuery } from '@/hooks/useTimelineQueries';

function TimelineContent() {
  const visibleDays = VISIBLE_DAYS;

  // 1. Scroll Logic
  const {
    startDate,
    setStartDate,
    sidebarRef,
    timelineRef,
    handleNavigate,
    handleTodayClick,
    handleTimelineScroll,
    handleSidebarScroll
  } = useTimelineScroll(visibleDays);

  // 2. Data Selectors
  const {
    projectsItems,
    projectsMilestones,
    projectsSubProjects,
    allProjects,
    workspaceProjects,
    allSubProjects,
    sortedWorkspaceIds,
    openProjectIds
  } = useTimelineSelectors();

  // 3. Drag & Drop Logic
  const {
    activeDragItem,
    dragOffset,
    dragOverlayRef,
    sensors,
    handleDragStart,
    handleDragEnd,
    adjustTranslate,
    setActiveDragItem // Exposed if needed, but mainly used internally by hook
  } = useTimelineDragDrop();

  // 4. Store Actions & State
  const {
    workspaces: workspacesMap,
    toggleWorkspace,
    toggleProject,
    toggleItemComplete,
    addItem,
    updateItem,
    updateMilestone,
    addWorkspace,
    addProject,
    expandAllWorkspaces,
    addSubProject,
    updateSubProject,
    addMilestone,
    deleteItem,
    deleteMilestone,
    deleteSubProject,
    syncRemoteData,
    syncRangeData,
  } = useTimelineStore();

  // 5. Virtualization
  const { rowVirtualizer } = useTimelineVirtualization(
    sortedWorkspaceIds,
    workspacesMap,
    workspaceProjects,
    projectsItems,
    projectsSubProjects,
    openProjectIds,
    timelineRef
  );

  // 6. React Query Integration
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(addDays(startDate, visibleDays), 'yyyy-MM-dd');

  const structureQuery = useStructureQuery();
  const timelineDataQuery = useTimelineDataQuery({ startDate: startStr, endDate: endStr });

  // Sync Query Data to Store
  useEffect(() => {
    if (structureQuery.data) {
      syncRemoteData(structureQuery.data);
    }
  }, [structureQuery.data, syncRemoteData]);

  useEffect(() => {
    if (timelineDataQuery.data) {
      syncRangeData(timelineDataQuery.data, { startDate: startStr, endDate: endStr });
    }
  }, [timelineDataQuery.data, syncRangeData, startStr, endStr]);

  // local UI state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | Milestone | SubProject | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [subProjectToDelete, setSubProjectToDelete] = useState<SubProject | null>(null);

  // (Removed old fetchRange useEffect)

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
            isAllExpanded={Object.values(workspacesMap).length > 0 && Object.values(workspacesMap).every(ws => !ws.isCollapsed)}
          />

          <div
            ref={sidebarRef}
            className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide"
            onScroll={handleSidebarScroll}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const id = sortedWorkspaceIds[virtualRow.index];
                if (!workspacesMap[id]) return null;
                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
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
                  </div>
                );
              })}
            </div>
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

            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
                // Ensure width matches header
                width: '100%'
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const id = sortedWorkspaceIds[virtualRow.index];
                if (!workspacesMap[id]) return null;
                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
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
                  </div>
                );
              })}
            </div>
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
