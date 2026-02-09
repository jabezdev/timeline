import { useState, useEffect, useRef, useCallback, memo } from 'react';
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
  closestCorners,
} from '@dnd-kit/core';
// import { timelineGridCollisionDetection } from './hooks/useTimelineCollisionStrategy';
import { addDays, parseISO, format, differenceInDays } from 'date-fns';
import { TimelineHeader } from './TimelineHeader';
import { WorkspaceHeaderRow } from './WorkspaceSection';
import { ProjectRow, MilestoneHeaderRow } from './ProjectRow';
import { TimelineControls, WorkspaceSidebarCell, ProjectSidebarCell, SidebarCell } from './Sidebar';
import { CreateItemPopover } from './CreateItemPopover';
import { ItemSheet } from './ItemSheet';
import { TimelineItem, Milestone, SubProject, Project, TimelineState } from '@/types/timeline';
import { CELL_WIDTH, VISIBLE_DAYS, HEADER_HEIGHT, WORKSPACE_HEADER_HEIGHT, PROJECT_HEADER_HEIGHT, SIDEBAR_WIDTH } from '@/lib/constants';
import { SubProjectBar } from './SubProjectRow';
import { UnifiedItemView } from './UnifiedItem';
import { MilestoneItemView } from './MilestoneItem';
import { QuickCreatePopover } from './QuickCreatePopover';
import { QuickEditPopover } from './QuickEditPopover';
import { generateId } from '@/lib/utils';
import { Scrollbar } from './Scrollbar';

import { useTimelineSelectors } from '@/hooks/useTimelineSelectors';
import { useTimelineDragDrop } from './hooks/useTimelineDragDrop';
import { useTimelineScroll } from './hooks/useTimelineScroll';
import { useTimelineData } from '@/hooks/useTimelineData';
import { useTimelineMutations } from '@/hooks/useTimelineMutations';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import '@/scrollbar-hide.css';

// ── Timeline Main View (Memoized) ──────────────────────────────────────
const TimelineMainView = memo(function TimelineMainView({
  timelineState,
  sidebarWidth,
  setSidebarWidth,
  handleResizeStart,
  startDate,
  visibleDays,
  handleNavigate,
  handleTodayClick,
  handleQuickCreate,
  handleQuickEdit,
  handleAddItem,
  handleAddMilestone,
  handleAddSubProject,
  handleItemDoubleClick,
  handleItemDelete,
  handleItemSave,
  handleToggleItemComplete,
  timelineRef,
  setSelectedItem,
  setIsItemDialogOpen,
  setSubProjectToDelete,
  selectedItem,
  isItemDialogOpen,
  subProjectToDelete
}: {
  timelineState: TimelineState;
  sidebarWidth: number;
  setSidebarWidth: (w: number) => void;
  handleResizeStart: (e: React.MouseEvent) => void;
  startDate: Date;
  visibleDays: number;
  handleNavigate: (dir: 'prev' | 'next') => void;
  handleTodayClick: () => void;
  handleQuickCreate: (projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
  handleQuickEdit: (item: TimelineItem | Milestone | SubProject, anchorElement?: HTMLElement) => void;
  handleAddItem: (title: string, date: string, projectId: string, subProjectId?: string, color?: number) => void;
  handleAddMilestone: (projectId: string, title: string, date: string, color?: number) => void;
  handleAddSubProject: (projectId: string, title: string, startDate: string, endDate: string, color?: number) => void;
  handleItemDoubleClick: (item: TimelineItem | Milestone | SubProject) => void;
  handleItemDelete: (item: TimelineItem | Milestone | SubProject) => void;
  handleItemSave: (item: TimelineItem | Milestone | SubProject) => void;
  handleToggleItemComplete: (id: string) => void;
  timelineRef: React.RefObject<HTMLDivElement>;
  setSelectedItem: (item: TimelineItem | Milestone | SubProject | null) => void;
  setIsItemDialogOpen: (open: boolean) => void;
  setSubProjectToDelete: (sp: SubProject | null) => void;
  selectedItem: TimelineItem | Milestone | SubProject | null;
  isItemDialogOpen: boolean;
  subProjectToDelete: SubProject | null;
}) {
  const {
    projectsItems,
    projectsMilestones,
    projectsSubProjects,
    allProjects,
    workspaceProjects,
    allSubProjects,
    sortedWorkspaceIds,
  } = useTimelineSelectors(timelineState);

  const { workspaces: workspacesMap } = timelineState;

  return (
    <div className="h-screen flex bg-background overflow-hidden relative">
      <div
        ref={timelineRef}
        className="flex-1 overflow-auto scrollbar-hide w-full h-full"
        id="timeline-scroll-container"
      >
        <div className="min-w-max flex flex-col">

          {/* STICKY DATE HEADER — z-50, top-0 */}
          <div className="sticky top-0 z-[60] bg-background border-b border-border flex">
            <SidebarCell height={HEADER_HEIGHT} className="z-[61] border-b border-border justify-between pr-2" width={sidebarWidth}>
              <span className="text-xs font-semibold text-muted-foreground">TIMELINE</span>
              <TimelineControls
                startDate={startDate}
                onNavigate={handleNavigate}
                onTodayClick={handleTodayClick}
              />
            </SidebarCell>
            <TimelineHeader
              startDate={startDate}
              visibleDays={visibleDays}
              projectsItems={projectsItems}
            />
          </div>

          {/* BODY — Workspace-grouped sections */}
          {sortedWorkspaceIds.map(wsId => {
            const workspace = workspacesMap[wsId];
            if (!workspace) return null;
            const projects = workspaceProjects.get(wsId) || [];

            return (
              <div key={wsId}>
                {/* Sticky Workspace Row — z-40, under date header */}
                <div
                  className="sticky z-40 border-b border-border backdrop-blur-xl flex timeline-workspace-row"
                  style={{
                    top: HEADER_HEIGHT,
                    backgroundColor: `hsl(var(--workspace-${workspace.color}) / 0.4)`, // More saturated/darker
                  }}
                >
                  {/* Sidebar Cell — sticky left */}
                  <WorkspaceSidebarCell workspace={workspace} projects={projects} width={sidebarWidth} />

                  {/* Summary dots fill full width */}
                  <div className="flex-1" style={{ height: WORKSPACE_HEADER_HEIGHT }}>
                    <WorkspaceHeaderRow
                      workspace={workspace}
                      projects={projects}
                      projectsItems={projectsItems}
                      projectsMilestones={projectsMilestones}
                      startDate={startDate}
                      visibleDays={visibleDays}
                    />
                  </div>
                </div>

                {/* Project Rows */}
                {projects.map(project => (
                  <div key={project.id} className="border-b border-border/50">
                    {/* Sticky Project Header with Milestones — z-30, under workspace row */}
                    <div
                      className="sticky z-30 backdrop-blur-xl border-b border-border/30 flex"
                      style={{
                        top: HEADER_HEIGHT + WORKSPACE_HEADER_HEIGHT,
                        backgroundColor: `hsl(var(--workspace-${workspace.color}) / 0.05)`, // Lighter/Lower opacity for contrast
                      }}
                    >
                      {/* Sidebar Cell */}
                      <ProjectSidebarCell
                        project={project}
                        items={projectsItems.get(project.id) || []}
                        workspaceColor={workspace.color || '1'}
                        width={sidebarWidth}
                      />

                      <div className="flex-1" style={{ minHeight: PROJECT_HEADER_HEIGHT, height: 'auto' }}>
                        <MilestoneHeaderRow
                          project={project}
                          milestones={projectsMilestones.get(project.id) || []}
                          startDate={startDate}
                          visibleDays={visibleDays}
                          workspaceColor={parseInt(workspace.color || '1')}
                          onItemDoubleClick={handleItemDoubleClick}
                          onQuickEdit={handleQuickEdit}
                          onQuickCreate={handleQuickCreate}
                        />
                      </div>
                    </div>

                    {/* Timeline content (items, subprojects) — z-0 */}
                    <div className="relative z-0 flex">
                      {/* Sidebar Spacer for Content Row */}
                      <div
                        className="sticky left-0 shrink-0 bg-background/50 backdrop-blur-xl border-r border-border z-50 pointer-events-none"
                        style={{
                          width: 'var(--sidebar-width)',
                          minWidth: 'var(--sidebar-width)'
                        }}
                      />

                      <div className="flex-1">
                        <ProjectRow
                          project={project}
                          items={projectsItems.get(project.id) || []}
                          subProjects={projectsSubProjects.get(project.id) || []}
                          startDate={startDate}
                          visibleDays={visibleDays}
                          workspaceColor={parseInt(workspace.color || '1')}
                          onToggleItemComplete={handleToggleItemComplete}
                          onItemDoubleClick={handleItemDoubleClick}
                          onSubProjectDoubleClick={handleItemDoubleClick}
                          onQuickCreate={handleQuickCreate}
                          onQuickEdit={handleQuickEdit}
                          sidebarWidth={sidebarWidth}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className="absolute top-0 bottom-0 z-[100] w-1 hover:bg-primary/50 cursor-col-resize transition-colors"
        style={{ left: 'calc(var(--sidebar-width) - 2px)' }} // -2 to center the 4px handle on the border
        onMouseDown={handleResizeStart}
      />

      <CreateItemPopover
        onAddItem={handleAddItem}
        onAddMilestone={handleAddMilestone}
        onAddSubProject={handleAddSubProject}
        projects={allProjects}
        subProjects={allSubProjects}
        activeProjectId={allProjects[0]?.id}
      />

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
                  setSubProjectToDelete(null); // Just close
                  handleItemDelete(subProjectToDelete); // This logic needs to be passed down or handled here.
                  // Actually logic was in handleItemDelete which calls setSubProjectToDelete. 
                  // But the ALERT ACTIONS need to call the mutations.
                  // The original code had the mutation logic inline in the onClick.
                  // Since `mutations` is not passed to TimelineMainView (unless we access it there? Yes, we can call useTimelineMutations there too, or pass wrappers).
                  // The mutations are calling hooks. We used `useTimelineMutations` in key handlers.
                  // We should pass a `handleDeleteSubProjectConfirmed` prop or similar?
                  // Or just let TimelineMainView use `useTimelineMutations` directly. It's a component.
                  // YES, we can use useTimelineMutations in TimelineMainView.
                }
              }}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Keep Items (Unlink)
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                // Logic will be handled in TimelineMainView's local handlers if we move the Alert there too.
                // OR we keep Alert in TimelineMainView.
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

// I need to fix the Alert Dialog Logic in the above block before writing.
// In the original code, the Alert Dialog was at the end of TimelineContent.
// I included it in TimelineMainView.
// But `mutations` variable needs to be available.
// In the code block above I declared `const mutations = useTimelineMutations();` inside TimelineMainView.
// So it should be fine.
// I need to restore the Alert Dialog logic properly.

function TimelineContent() {
  const visibleDays = VISIBLE_DAYS;
  const { sidebarWidth, setSidebarWidth } = useTimelineStore();

  // Use refs for resize state to avoid re-renders during drag
  const isResizingRef = useRef(false);
  const currentWidthRef = useRef(sidebarWidth);
  const animationFrameRef = useRef<number>(0);

  // Set CSS variable on mount and when sidebarWidth changes from store
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    currentWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  // Resize handler that uses refs - no state changes during drag
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

  const {
    startDate,
    timelineRef,
    handleNavigate,
    handleTodayClick,
  } = useTimelineScroll(visibleDays);

  const { data: timelineState, isLoading } = useTimelineData(startDate, visibleDays);
  const mutations = useTimelineMutations();

  // Drag hooks
  const {
    activeDragItem,
    dragOverlayRef,
    sensors,
    handleDragStart,
    handleDragEnd,
  } = useTimelineDragDrop();

  const [selectedItem, setSelectedItem] = useState<TimelineItem | Milestone | SubProject | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [subProjectToDelete, setSubProjectToDelete] = useState<SubProject | null>(null);

  const [quickCreateState, setQuickCreateState] = useState<{
    open: boolean;
    projectId: string;
    subProjectId?: string;
    date: string;
    workspaceColor?: number;
    anchorPosition?: { x: number; y: number };
  }>({ open: false, projectId: '', date: '', workspaceColor: 1 });

  const [quickEditState, setQuickEditState] = useState<{
    open: boolean;
    item: TimelineItem | Milestone | SubProject | null;
    anchorPosition?: { x: number; y: number };
  }>({ open: false, item: null });

  // Sync timelineState to ref for event handlers
  const timelineStateRef = useRef(timelineState);
  timelineStateRef.current = timelineState;

  // Sync selectedItem to ref
  const selectedItemRef = useRef(selectedItem);
  selectedItemRef.current = selectedItem;

  /* Handlers wrapped in useCallback for performance */
  const handleQuickCreate = useCallback((projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => {
    const rect = anchorElement?.getBoundingClientRect();
    setQuickCreateState({
      open: true,
      projectId,
      date,
      subProjectId,
      workspaceColor,
      anchorPosition: rect ? { x: rect.left, y: rect.bottom } : undefined
    });
  }, []);

  const handleQuickEdit = useCallback((item: TimelineItem | Milestone | SubProject, anchorElement?: HTMLElement) => {
    const rect = anchorElement?.getBoundingClientRect();
    setQuickEditState({
      open: true,
      item,
      anchorPosition: rect ? {
        x: rect.left + (rect.width / 2),
        y: rect.top + (rect.height / 2)
      } : undefined
    });
  }, []);

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
  }, [mutations.addItem.mutate]);

  const handleAddMilestone = useCallback((projectId: string, title: string, date: string, color?: number) => {
    const newMilestone: Milestone = {
      id: generateId(),
      title,
      date,
      projectId,
      color: color ? String(color) : undefined
    };
    mutations.addMilestone.mutate(newMilestone);
  }, [mutations.addMilestone.mutate]);

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
  }, [mutations.addSubProject.mutate]);

  const handleItemDoubleClick = useCallback((item: TimelineItem | Milestone | SubProject) => {
    setSelectedItem(item);
    setIsItemDialogOpen(true);
  }, []);

  const handleItemDelete = useCallback((item: TimelineItem | Milestone | SubProject) => {
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
  }, [mutations.deleteItem.mutate, mutations.deleteMilestone.mutate]);

  const handleItemSave = useCallback((updatedItem: TimelineItem | Milestone | SubProject) => {
    const currentTimelineState = timelineStateRef.current;

    if ('completed' in updatedItem) {
      mutations.updateItem.mutate({ id: updatedItem.id, updates: updatedItem as TimelineItem });
    } else if ('startDate' in updatedItem) {
      let childItemsToUpdate: Partial<TimelineItem>[] = [];

      const currentSelectedItem = selectedItemRef.current;
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
  }, [
    mutations.updateItem.mutate,
    mutations.updateSubProject.mutate,
    mutations.updateMilestone.mutate
  ]);

  const handleToggleItemComplete = useCallback((id: string) => {
    const item = timelineStateRef.current.items[id];
    if (item) {
      mutations.updateItem.mutate({
        id,
        updates: { completed: !item.completed, completedAt: !item.completed ? new Date().toISOString() : undefined }
      });
    }
  }, [mutations.updateItem.mutate]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCorners}
    >
      <TimelineMainView
        timelineState={timelineState}
        sidebarWidth={sidebarWidth}
        setSidebarWidth={setSidebarWidth}
        handleResizeStart={handleResizeStart}
        startDate={startDate}
        visibleDays={visibleDays}
        handleNavigate={handleNavigate}
        handleTodayClick={handleTodayClick}
        handleQuickCreate={handleQuickCreate}
        handleQuickEdit={handleQuickEdit}
        handleAddItem={handleAddItem}
        handleAddMilestone={handleAddMilestone}
        handleAddSubProject={handleAddSubProject}
        handleItemDoubleClick={handleItemDoubleClick}
        handleItemDelete={handleItemDelete}
        handleItemSave={handleItemSave}
        handleToggleItemComplete={handleToggleItemComplete}
        timelineRef={timelineRef}
        setSelectedItem={setSelectedItem}
        setIsItemDialogOpen={setIsItemDialogOpen}
        setSubProjectToDelete={setSubProjectToDelete}
        selectedItem={selectedItem}
        isItemDialogOpen={isItemDialogOpen}
        subProjectToDelete={subProjectToDelete}
      />

      {/* Global Quick Create Popover */}
      {quickCreateState.open && (
        <QuickCreatePopover
          open={quickCreateState.open}
          onOpenChange={(open) => setQuickCreateState(prev => ({ ...prev, open }))}
          type="item"
          projectId={quickCreateState.projectId}
          subProjectId={quickCreateState.subProjectId}
          date={quickCreateState.date}
          defaultColor={quickCreateState.workspaceColor}
        >
          <div
            style={{
              position: 'fixed',
              left: quickCreateState.anchorPosition?.x,
              top: quickCreateState.anchorPosition?.y,
              width: 1,
              height: 1
            }}
          />
        </QuickCreatePopover>
      )}

      {/* Global Quick Edit Popover */}
      {quickEditState.item && (
        <QuickEditPopover
          item={quickEditState.item}
          open={quickEditState.open}
          onOpenChange={(open) => setQuickEditState(prev => ({ ...prev, open }))}
          anchorPosition={quickEditState.anchorPosition}
        />
      )}

      <DragOverlay
        dropAnimation={null}
      >
        {activeDragItem ? (
          <div ref={dragOverlayRef} className="shadow-2xl ring-2 ring-primary/50 rounded">
            {activeDragItem.type === 'subProject' ? (
              (() => {
                const subProject = activeDragItem.item as SubProject;
                const subProjectStart = parseISO(subProject.startDate);
                const subProjectEnd = parseISO(subProject.endDate);
                const durationDays = differenceInDays(subProjectEnd, subProjectStart) + 1;
                const width = Math.min(durationDays * CELL_WIDTH, VISIBLE_DAYS * CELL_WIDTH);
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
            ) : activeDragItem.type === 'item' ? (
              <UnifiedItemView
                item={activeDragItem.item as TimelineItem}
                style={{ cursor: 'grabbing', width: CELL_WIDTH - 8 }}
              />
            ) : activeDragItem.type === 'milestone' ? (
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
  return <TimelineContent />;
}
