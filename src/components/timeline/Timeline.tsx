import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
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
import { QuickCreatePopover } from './QuickCreatePopover';
import { QuickEditPopover } from './QuickEditPopover';
import { generateId } from '@/lib/utils';
import { Scrollbar } from './Scrollbar';
import { useTimelineKeyboard } from '@/hooks/useTimelineKeyboard';

import { useTimelineSelectors } from '@/hooks/useTimelineSelectors';
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
  subProjectToDelete,
  handleItemClick,
  selectedIds,
  onClearSelection
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
  handleItemDelete: (item: TimelineItem | Milestone | SubProject, deleteItems?: boolean) => void;
  handleItemSave: (item: TimelineItem | Milestone | SubProject) => void;
  handleToggleItemComplete: (id: string) => void;
  timelineRef: React.RefObject<HTMLDivElement>;
  setSelectedItem: (item: TimelineItem | Milestone | SubProject | null) => void;
  setIsItemDialogOpen: (open: boolean) => void;
  setSubProjectToDelete: (sp: SubProject | null) => void;
  selectedItem: TimelineItem | Milestone | SubProject | null;
  isItemDialogOpen: boolean;
  subProjectToDelete: SubProject | null;
  handleItemClick: (id: string, multi: boolean) => void;
  selectedIds: Set<string>;
  onClearSelection: () => void;
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
            <SidebarCell height={HEADER_HEIGHT} className="z-[61] border-b border-border pr-2" width={sidebarWidth}>
              <TimelineControls
                startDate={startDate}
                onNavigate={handleNavigate}
                onTodayClick={handleTodayClick}
              >
                <span className="text-xs font-semibold text-muted-foreground/70 tracking-wider">TIMELINE</span>
              </TimelineControls>
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
                    backgroundColor: timelineState.userSettings?.colorMode === 'monochromatic'
                      ? `hsl(var(--primary) / 0.4)`
                      : `hsl(var(--workspace-${workspace.color}) / 0.4)`,
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
                      colorMode={timelineState.userSettings?.colorMode || 'full'}
                      systemAccent={timelineState.userSettings?.systemAccent || '6'}
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
                        backgroundColor: timelineState.userSettings?.colorMode === 'monochromatic'
                          ? `hsl(var(--primary) / 0.1)`
                          : `hsl(var(--workspace-${workspace.color}) / 0.05)`,
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
                          colorMode={timelineState.userSettings?.colorMode || 'full'}
                          systemAccent={timelineState.userSettings?.systemAccent || '6'}
                        />
                      </div>
                    </div>

                    {/* Timeline content (items, subprojects) — z-0 */}
                    <div className="relative z-0 flex">
                      {/* Sidebar Spacer for Content Row */}
                      <div
                        className="sticky left-0 shrink-0 bg-background/50 backdrop-blur-xl border-r border-border z-50 pointer-events-auto"
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
                          selectedIds={selectedIds}
                          onItemClick={handleItemClick}
                          onClearSelection={onClearSelection}
                          colorMode={timelineState.userSettings?.colorMode || 'full'}
                          systemAccent={timelineState.userSettings?.systemAccent || '6'}
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
                  setSubProjectToDelete(null);
                  handleItemDelete(subProjectToDelete, false);
                }
              }}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Keep Items (Unlink)
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                if (subProjectToDelete) {
                  setSubProjectToDelete(null);
                  handleItemDelete(subProjectToDelete, true);
                }
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

  const [selectedItem, setSelectedItem] = useState<TimelineItem | Milestone | SubProject | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [subProjectToDelete, setSubProjectToDelete] = useState<SubProject | null>(null);

  const [quickCreateState, setQuickCreateState] = useState<{
    open: boolean;
    projectId: string;
    subProjectId?: string;
    date: string;
    workspaceColor?: number;
    anchorRect?: DOMRect | { x: number; y: number; width: number; height: number; top: number; left: number; right: number; bottom: number; toJSON: () => any };
  }>({ open: false, projectId: '', date: '', workspaceColor: 1 });

  const [quickEditState, setQuickEditState] = useState<{
    open: boolean;
    item: TimelineItem | Milestone | SubProject | null;
    anchorRect?: DOMRect | { x: number; y: number; width: number; height: number; top: number; left: number; right: number; bottom: number; toJSON: () => any };
  }>({ open: false, item: null });

  /* State */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter subprojects for the item being edited
  const availableSubProjects = useMemo(() => {
    if (!quickEditState.item || !('projectId' in quickEditState.item)) return [];
    const pid = quickEditState.item.projectId;
    return Object.values(timelineState.subProjects || {})
      .filter(sp => sp.projectId === pid)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [quickEditState.item, timelineState.subProjects]);

  // Filter subprojects for the item being created
  const availableSubProjectsForCreate = useMemo(() => {
    if (!quickCreateState.open || !quickCreateState.projectId) return [];
    const pid = quickCreateState.projectId;
    return Object.values(timelineState.subProjects || {})
      .filter(sp => sp.projectId === pid)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [quickCreateState.open, quickCreateState.projectId, timelineState.subProjects]);

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

  // Keyboard Hook - defined after handlers so we can use them
  const { handleSelection, clearSelection } = useTimelineKeyboard({
    selectedIds,
    setSelectedIds,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutations.addSubProject.mutate]);

  const handleItemClick = useCallback((id: string, multi: boolean) => {
    handleSelection(id, multi);
    if (multi) {
      setIsItemDialogOpen(false);
    } else {
      setIsItemDialogOpen(true);
    }
  }, [handleSelection]);

  const handleItemDoubleClick = useCallback((item: TimelineItem | Milestone | SubProject) => {
    // on double click we can open quick edit or full edit? 
    // User wanted "Enter to open QuickEdit", so double click probably same?
    handleQuickEdit(item);
  }, [handleQuickEdit]);

  const handleItemDelete = useCallback((item: TimelineItem | Milestone | SubProject, deleteItems: boolean = false) => {
    if ('completed' in item) {
      mutations.deleteItem.mutate(item.id);
    } else if ('startDate' in item) {
      // logic for subproject delete
      mutations.deleteSubProject.mutate({ id: item.id, deleteItems });
    } else {
      mutations.deleteMilestone.mutate(item.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutations.deleteItem.mutate, mutations.deleteMilestone.mutate, mutations.deleteSubProject.mutate]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutations.updateItem.mutate]);

  return (
    <>
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
        handleItemClick={handleItemClick} // New prop
        handleItemDelete={handleItemDelete}
        handleItemSave={handleItemSave}
        handleToggleItemComplete={handleToggleItemComplete}
        timelineRef={timelineRef}
        selectedIds={selectedIds}
        onClearSelection={clearSelection}
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
          availableSubProjects={availableSubProjectsForCreate}
          date={quickCreateState.date}
          defaultColor={quickCreateState.workspaceColor}
          anchorRect={quickCreateState.anchorRect}
        />
      )}

      {/* Global Quick Edit Popover */}
      {quickEditState.item && (
        <QuickEditPopover
          item={quickEditState.item}
          availableSubProjects={availableSubProjects}
          open={quickEditState.open}
          onOpenChange={(open) => setQuickEditState(prev => ({ ...prev, open }))}
          anchorRect={quickEditState.anchorRect}
        />
      )}
    </>
  );
}

export function Timeline() {
  return <TimelineContent />;
}
