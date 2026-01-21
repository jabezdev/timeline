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
import {
  DndContext,
  DragOverlay,
  pointerWithin,
} from '@dnd-kit/core';
import { addDays, subDays, parseISO, format, differenceInDays } from 'date-fns';
import { TimelineHeader } from './TimelineHeader';
import { WorkspaceHeaderRow } from './WorkspaceSection'; // Updated Import
import { ProjectRow } from './ProjectRow'; // Explicit Import for flat use
import { SidebarHeader, SidebarWorkspaceHeader, SidebarProject } from './Sidebar'; // Updated Import
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { Plus, PanelLeftOpen } from 'lucide-react';
import { CreateItemPopover } from './CreateItemPopover';
import { ItemSheet } from './ItemSheet';
import { TimelineItem, Milestone, SubProject, Project } from '@/types/timeline';
import { SIDEBAR_WIDTH, COLLAPSED_SIDEBAR_WIDTH, CELL_WIDTH, VISIBLE_DAYS, HEADER_HEIGHT } from '@/lib/constants';
import { SubProjectBar } from './SubProjectRow';
import { UnifiedItemView } from './UnifiedItem';
import { MilestoneItemView } from './MilestoneItem';
import { generateId } from '@/lib/utils';
import { Scrollbar } from './Scrollbar';



// Hooks
import { useTimelineSelectors } from '@/hooks/useTimelineSelectors';
import { useTimelineDragDrop } from './hooks/useTimelineDragDrop';
import { useTimelineScroll } from './hooks/useTimelineScroll';
import { useTimelineVirtualization } from './hooks/useTimelineVirtualization';
import { useFlattenedRows } from '@/hooks/useFlattenedRows'; // New Hook
import { useTimelineData } from '@/hooks/useTimelineData';
import { useTimelineMutations } from '@/hooks/useTimelineMutations';

function TimelineContent() {
  const visibleDays = VISIBLE_DAYS;

  // 1. Scroll Logic
  const {
    startDate,
    timelineRef,
    handleNavigate,
    handleTodayClick,
  } = useTimelineScroll(visibleDays);

  // 2. Data & Mutations
  const { data: timelineState, isLoading } = useTimelineData(startDate, visibleDays);
  const mutations = useTimelineMutations();

  const {
    collapsedWorkspaceIds,
    toggleWorkspace,
    setAllWorkspacesCollapsed,
    toggleProject,
    isSidebarCollapsed,
    setSidebarCollapsed,
    openProjectIds: storeOpenProjectIds
  } = useTimelineStore();

  // 3. Data Selectors (Pass State)
  const {
    projectsItems,
    projectsMilestones,
    projectsSubProjects,
    allProjects,
    workspaceProjects,
    allSubProjects,
    sortedWorkspaceIds,
    openProjectIds
  } = useTimelineSelectors(timelineState, storeOpenProjectIds);

  // 4. Drag & Drop Logic
  const {
    activeDragItem,
    dragOverlayRef,
    sensors,
    handleDragStart,
    handleDragEnd,

  } = useTimelineDragDrop();

  // 5. Virtualization (Flat)
  const {
    workspaces: workspacesMap,
    items: allItemsMap // Need items for lookups if not using selectors? Selectors are easier.
  } = timelineState;

  // Generate flat list of rows
  const flatRows = useFlattenedRows(
    sortedWorkspaceIds,
    workspaceProjects,
    collapsedWorkspaceIds
  );

  const { rowVirtualizer } = useTimelineVirtualization(
    flatRows,
    workspaceProjects,
    projectsItems,
    projectsSubProjects,
    openProjectIds,
    timelineRef
  );

  // local UI state
  const [selectedItem, setSelectedItem] = useState<TimelineItem | Milestone | SubProject | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [subProjectToDelete, setSubProjectToDelete] = useState<SubProject | null>(null);

  // Action Handlers using Mutations
  const handleAddItem = (title: string, date: string, projectId: string, subProjectId?: string, color?: number) => {
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
  };

  const handleAddMilestone = (projectId: string, title: string, date: string, color?: number) => {
    const newMilestone: Milestone = {
      id: generateId(),
      title,
      date,
      projectId,
      color: color ? String(color) : undefined
    };
    mutations.addMilestone.mutate(newMilestone);
  };

  const handleAddSubProject = (projectId: string, title: string, startDate: string, endDate: string, color?: number) => {
    const newSub: SubProject = {
      id: generateId(),
      title,
      startDate,
      endDate,
      projectId,
      color: color ? String(color) : undefined
    };
    mutations.addSubProject.mutate(newSub);
  };

  // Logic
  const handleToggleWorkspace = (workspaceId: string) => {
    toggleWorkspace(workspaceId);
  };

  const handleToggleProject = (project: Project) => {
    toggleProject(project.id, project.workspaceId, sortedWorkspaceIds);
  };

  const handleExpandAll = () => {
    const areAllExpanded = sortedWorkspaceIds.every(id => !collapsedWorkspaceIds.includes(id));
    setAllWorkspacesCollapsed(areAllExpanded, sortedWorkspaceIds);
  };

  const currentSidebarWidth = isSidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : SIDEBAR_WIDTH;

  const handleItemClick = (item: TimelineItem | Milestone | SubProject) => {
    setSelectedItem(item);
    setIsItemDialogOpen(true);
  };

  const handleItemDelete = (item: TimelineItem | Milestone | SubProject) => {
    if ('completed' in item) {
      mutations.deleteItem.mutate(item.id);
    } else if ('startDate' in item) {
      setSubProjectToDelete(item as SubProject);
      setIsItemDialogOpen(false);
      return;
    } else {
      mutations.deleteMilestone.mutate(item.id);
    }
    setSelectedItem(null);
    setIsItemDialogOpen(false);
  };

  const handleItemSave = (updatedItem: TimelineItem | Milestone | SubProject) => {
    if ('completed' in updatedItem) {
      mutations.updateItem.mutate({ id: updatedItem.id, updates: updatedItem as TimelineItem });
    } else if ('startDate' in updatedItem) {
      let childItemsToUpdate: Partial<TimelineItem>[] = [];

      if (selectedItem && 'startDate' in selectedItem) {
        const originalSP = selectedItem as SubProject;
        const newSP = updatedItem as SubProject;

        if (originalSP.id === newSP.id && originalSP.startDate !== newSP.startDate) {
          const oldStart = parseISO(originalSP.startDate);
          const newStart = parseISO(newSP.startDate);
          const diffDays = differenceInDays(newStart, oldStart);

          if (diffDays !== 0) {
            const relatedItems = Object.values(timelineState.items || {}).filter(i => i.subProjectId === originalSP.id);
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
  };

  const handleToggleItemComplete = (id: string) => {
    const item = timelineState.items[id];
    if (item) {
      mutations.updateItem.mutate({
        id,
        updates: { completed: !item.completed, completedAt: !item.completed ? new Date().toISOString() : undefined }
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
      <div className="h-screen flex bg-background overflow-hidden relative">
        {/* 
            SINGLE MAIN SCROLL CONTAINER 
            This handles both vertical (sticky sidebar) and horizontal (sticky header) scrolling.
        */}
        <div
          ref={timelineRef}
          className="flex-1 overflow-auto scrollbar-hide w-full h-full relative"
          id="timeline-scroll-container"
        >
          {/* Internal wrapper to ensure min-width fits all content (Sidebar + TimelineColumns) */}
          <div className="min-w-max flex flex-col relative h-full">

            {/* --- STICKY TOP ROW (HEADERS) --- */}
            <div className="sticky top-0 z-40 flex bg-background h-min border-b border-border">
              {/* Sticky Left Sidebar Header */}
              <div
                className={`sticky left-0 z-50 bg-background border-r border-border overflow-hidden`}
                style={{ width: currentSidebarWidth }}
              >
                <SidebarHeader
                  startDate={startDate}
                  onNavigate={handleNavigate}
                  onTodayClick={handleTodayClick}
                  onExpandAll={handleExpandAll}
                  isAllExpanded={sortedWorkspaceIds.every(id => !collapsedWorkspaceIds.includes(id))}
                  isCollapsed={isSidebarCollapsed}
                  onToggleCollapse={() => setSidebarCollapsed(!isSidebarCollapsed)}
                />
              </div>

              {/* Scrolling Timeline Header */}
              <div className="flex-1 bg-background">
                <TimelineHeader
                  startDate={startDate}
                  visibleDays={visibleDays}
                />
              </div>
            </div>

            {/* --- VIRTUALIZED BODY (FLAT) --- */}
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
                width: '100%',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = flatRows[virtualRow.index];
                if (!row) return null;

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className="flex w-full absolute left-0"
                    style={{
                      height: `${virtualRow.size}px`,
                      top: 0,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {/* Sticky Sidebar Cell */}
                    <div
                      className="sticky left-0 z-50 bg-background border-r border-border shrink-0 overflow-hidden"
                      style={{ width: currentSidebarWidth }}
                    >
                      {row.type === 'workspace-header' ? (
                        <SidebarWorkspaceHeader
                          workspace={workspacesMap[row.workspaceId]}
                          isCollapsed={collapsedWorkspaceIds.includes(row.workspaceId)}
                          projects={workspaceProjects.get(row.workspaceId) || []}
                          projectsItems={projectsItems}
                          projectsMilestones={projectsMilestones}
                          onToggleWorkspace={() => handleToggleWorkspace(row.workspaceId)}
                          isSidebarCollapsed={isSidebarCollapsed}
                        />
                      ) : (
                        <SidebarProject
                          project={allProjects.find(p => p.id === row.projectId)!} // Ideally look up from map, but array find is okay-ish if array is not huge. 
                          // Optimization: create projectId -> Project map or Use workspaceProjects.find
                          // Using workspaceProjects:
                          // project={workspaceProjects.get(row.workspaceId)?.find(p => p.id === row.projectId)!}
                          items={projectsItems.get(row.projectId) || []}
                          subProjects={projectsSubProjects.get(row.projectId) || []}
                          isOpen={openProjectIds.has(row.projectId)}
                          onToggle={() => handleToggleProject((workspaceProjects.get(row.workspaceId)?.find(p => p.id === row.projectId)!) as Project)}
                          workspaceColor={workspacesMap[row.workspaceId]?.color}
                        />
                      )}
                    </div>

                    {/* Timeline Content Cell */}
                    <div className="flex-1 min-w-0">
                      {row.type === 'workspace-header' ? (
                        <WorkspaceHeaderRow
                          workspace={workspacesMap[row.workspaceId]}
                          isCollapsed={collapsedWorkspaceIds.includes(row.workspaceId)}
                          projects={workspaceProjects.get(row.workspaceId) || []}
                          projectsItems={projectsItems}
                          projectsMilestones={projectsMilestones}
                          startDate={startDate}
                          visibleDays={visibleDays}
                        />
                      ) : (
                        <ProjectRow
                          project={workspaceProjects.get(row.workspaceId)?.find(p => p.id === row.projectId)!} // Determine efficient lookup later if needed
                          items={projectsItems.get(row.projectId) || []}
                          milestones={projectsMilestones.get(row.projectId) || []}
                          subProjects={projectsSubProjects.get(row.projectId) || []}
                          isOpen={openProjectIds.has(row.projectId)}
                          startDate={startDate}
                          visibleDays={visibleDays}
                          workspaceColor={parseInt(workspacesMap[row.workspaceId]?.color || '1')}
                          onToggleItemComplete={handleToggleItemComplete}
                          onItemClick={handleItemClick}
                          onSubProjectClick={handleItemClick}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>


        {/* Floating Expand Button (Visible only when collapsed) */}
        <div
          className={`absolute top-2 left-2 z-[60] ${isSidebarCollapsed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        >
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="w-8 h-8 rounded-md bg-background border border-border shadow-sm flex items-center justify-center hover:bg-secondary/50"
            title="Expand Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div
          className={`absolute top-2 left-2 z-[60] ${isSidebarCollapsed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        >
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="w-8 h-8 rounded-md bg-background border border-border shadow-sm flex items-center justify-center hover:bg-secondary/50"
            title="Expand Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <CreateItemPopover
          onAddItem={handleAddItem}
          onAddMilestone={handleAddMilestone}
          onAddSubProject={handleAddSubProject}
          projects={allProjects}
          subProjects={allSubProjects}
          activeProjectId={Array.from(openProjectIds)[0]}
        />
      </div>

      <Scrollbar containerRef={timelineRef} orientation="horizontal" />
      <Scrollbar containerRef={timelineRef} orientation="vertical" />

      <ItemSheet
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
                  mutations.deleteSubProject.mutate({ id: subProjectToDelete.id, deleteItems: false });
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
                  mutations.deleteSubProject.mutate({ id: subProjectToDelete.id, deleteItems: true });
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

      {/* 
         Drop animation configuration:
         Animating the overlay to the new position gives a "quick slide" effect.
         We use `defaultDropAnimationSideEffects` to handle opacity transitions properly (e.g. fading out the drag styles).
      */}
      <DragOverlay
        modifiers={[]}
        dropAnimation={null}
      >
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
    <TimelineContent />
  );
}
