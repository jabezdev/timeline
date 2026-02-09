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
import { addDays, parseISO, format, differenceInDays } from 'date-fns';
import { TimelineHeader } from './TimelineHeader';
import { WorkspaceHeaderRow } from './WorkspaceSection';
import { ProjectRow, MilestoneHeaderRow } from './ProjectRow';
import { TimelineControls, WorkspaceSidebarCell, ProjectSidebarCell, SidebarCell } from './Sidebar';
import { CreateItemPopover } from './CreateItemPopover';
import { ItemSheet } from './ItemSheet';
import { TimelineItem, Milestone, SubProject, Project } from '@/types/timeline';
import { CELL_WIDTH, VISIBLE_DAYS, HEADER_HEIGHT, WORKSPACE_HEADER_HEIGHT, PROJECT_HEADER_HEIGHT, SIDEBAR_WIDTH } from '@/lib/constants';
import { SubProjectBar } from './SubProjectRow';
import { UnifiedItemView } from './UnifiedItem';
import { MilestoneItemView } from './MilestoneItem';
import { generateId } from '@/lib/utils';
import { Scrollbar } from './Scrollbar';

import { useTimelineSelectors } from '@/hooks/useTimelineSelectors';
import { useTimelineDragDrop } from './hooks/useTimelineDragDrop';
import { useTimelineScroll } from './hooks/useTimelineScroll';
import { useTimelineData } from '@/hooks/useTimelineData';
import { useTimelineMutations } from '@/hooks/useTimelineMutations';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import '@/scrollbar-hide.css';

function TimelineContent() {
  const visibleDays = VISIBLE_DAYS;
  const { sidebarWidth, setSidebarWidth } = useTimelineStore();
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        // Cancel any pending frame to ensure we only have one update queued
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }

        animationFrameId = requestAnimationFrame(() => {
          const newWidth = Math.max(250, Math.min(600, e.clientX));
          setSidebarWidth(newWidth);
        });
      }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none'; // Prevent text selection
    } else {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      document.body.style.cursor = 'default';
      document.body.style.userSelect = '';
    };
  }, [isResizing, setSidebarWidth]);

  const {
    startDate,
    timelineRef,
    handleNavigate,
    handleTodayClick,
  } = useTimelineScroll(visibleDays);

  const { data: timelineState, isLoading } = useTimelineData(startDate, visibleDays);
  const mutations = useTimelineMutations();

  const {
    projectsItems,
    projectsMilestones,
    projectsSubProjects,
    allProjects,
    workspaceProjects,
    allSubProjects,
    sortedWorkspaceIds,
  } = useTimelineSelectors(timelineState);

  const {
    activeDragItem,
    dragOverlayRef,
    sensors,
    handleDragStart,
    handleDragEnd,
  } = useTimelineDragDrop();

  const { workspaces: workspacesMap } = timelineState;

  const [selectedItem, setSelectedItem] = useState<TimelineItem | Milestone | SubProject | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [subProjectToDelete, setSubProjectToDelete] = useState<SubProject | null>(null);

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
                            onItemClick={handleItemClick}
                          />
                        </div>
                      </div>

                      {/* Timeline content (items, subprojects) — z-0 */}
                      <div className="relative z-0 flex">
                        {/* Sidebar Spacer for Content Row */}
                        <div
                          className="sticky left-0 shrink-0 bg-background/50 backdrop-blur-xl border-r border-border z-50 pointer-events-none"
                          style={{
                            width: sidebarWidth,
                            minWidth: sidebarWidth
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
                            onItemClick={handleItemClick}
                            onSubProjectClick={handleItemClick}
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
          className={`absolute top-0 bottom-0 z-[100] w-1 hover:bg-primary/50 cursor-col-resize transition-colors ${isResizing ? 'bg-primary/50' : ''
            }`}
          style={{ left: sidebarWidth - 2 }} // -2 to center the 4px handle on the border
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
        />

        <CreateItemPopover
          onAddItem={handleAddItem}
          onAddMilestone={handleAddMilestone}
          onAddSubProject={handleAddSubProject}
          projects={allProjects}
          subProjects={allSubProjects}
          activeProjectId={allProjects[0]?.id}
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

      <DragOverlay modifiers={[]} dropAnimation={null}>
        {activeDragItem ? (
          <div ref={dragOverlayRef}>
            {activeDragItem.type === 'subProject' ? (
              (() => {
                const subProject = activeDragItem.item as SubProject;
                const subProjectStart = parseISO(subProject.startDate);
                const subProjectEnd = parseISO(subProject.endDate);
                const durationDays = differenceInDays(subProjectEnd, subProjectStart) + 1;
                // Clamp width to visible area to prevent huge overlays
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
