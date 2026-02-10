import { memo } from 'react';
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
import { TimelineHeader } from './TimelineHeader';
import { WorkspaceHeaderRow } from './WorkspaceSection';
import { ProjectRow, MilestoneHeaderRow } from '../rows/ProjectRow';
import { TimelineControls, WorkspaceSidebarCell, ProjectSidebarCell, SidebarCell } from './Sidebar';
import { CreateItemPopover } from '../popovers/CreateItemPopover';
import { ItemSheet } from '../modals/ItemSheet';
import { TimelineItem, Milestone, SubProject, TimelineState } from '@/types/timeline';
import { HEADER_HEIGHT, WORKSPACE_HEADER_HEIGHT, PROJECT_HEADER_HEIGHT } from '@/lib/constants';
import { QuickCreatePopover } from '../popovers/QuickCreatePopover';
import { QuickEditPopover } from '../popovers/QuickEditPopover';
import { Scrollbar } from './Scrollbar';
import { useTimelineSelectors } from '@/hooks/useTimelineSelectors';
import '@/scrollbar-hide.css';

interface TimelineViewProps {
    timelineState: TimelineState;
    handleResizeStart: (e: React.MouseEvent) => void;
    startDate: Date;
    visibleDays: number;
    handleNavigate: (dir: 'prev' | 'next') => void;
    handleTodayClick: () => void;
    handleQuickCreate: (type: 'item' | 'milestone', projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
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
    handleItemClick?: (id: string, multi: boolean, e: React.MouseEvent) => void;
    handleItemContextMenu?: (id: string, type: 'item' | 'milestone' | 'subproject', e: React.MouseEvent) => void;
    onClearSelection: () => void;

    // Props for global popovers state passed from parent
    quickCreateState: {
        open: boolean;
        type: 'item' | 'milestone';
        projectId: string;
        subProjectId?: string;
        date: string;
        workspaceColor?: number;
        anchorRect?: DOMRect | { x: number; y: number; width: number; height: number; top: number; left: number; right: number; bottom: number; toJSON: () => unknown };
    };
    setQuickCreateState: React.Dispatch<React.SetStateAction<{
        open: boolean;
        type: 'item' | 'milestone';
        projectId: string;
        subProjectId?: string;
        date: string;
        workspaceColor?: number;
        anchorRect?: DOMRect | { x: number; y: number; width: number; height: number; top: number; left: number; right: number; bottom: number; toJSON: () => unknown };
    }>>;
    quickEditState: {
        open: boolean;
        item: TimelineItem | Milestone | SubProject | null;
        anchorRect?: DOMRect | { x: number; y: number; width: number; height: number; top: number; left: number; right: number; bottom: number; toJSON: () => unknown };
    };
    setQuickEditState: React.Dispatch<React.SetStateAction<{
        open: boolean;
        item: TimelineItem | Milestone | SubProject | null;
        anchorRect?: DOMRect | { x: number; y: number; width: number; height: number; top: number; left: number; right: number; bottom: number; toJSON: () => unknown };
    }>>;
    availableSubProjectsForCreate: SubProject[];
    availableSubProjects: SubProject[];
    allProjects: import('@/types/timeline').Project[];
    allSubProjects: SubProject[];
}

export const TimelineView = memo(function TimelineView({
    timelineState,
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
    setSubProjectToDelete,
    selectedItem,
    isItemDialogOpen,
    subProjectToDelete,
    setIsItemDialogOpen,
    handleItemClick,
    handleItemContextMenu,
    onClearSelection,
    quickCreateState,
    setQuickCreateState,
    quickEditState,
    setQuickEditState,
    availableSubProjectsForCreate,
    availableSubProjects,
    allProjects,
    allSubProjects
}: TimelineViewProps) {


    const {
        projectsItems,
        projectsMilestones,
        projectsSubProjects,
        workspaceProjects,
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
                        <SidebarCell height={HEADER_HEIGHT} className="z-[61] border-b border-border" innerClassName="pl-4 pr-1">
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
                                    <WorkspaceSidebarCell workspace={workspace} projects={projects} />

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
                                                    onItemClick={handleItemClick!}
                                                    onItemContextMenu={handleItemContextMenu!}
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
                                                    onItemClick={handleItemClick!}
                                                    onItemContextMenu={handleItemContextMenu!}
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
                projects={allProjects}
                subProjects={allSubProjects}
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

            {/* Global Quick Create Popover */}
            {quickCreateState.open && (
                <QuickCreatePopover
                    open={quickCreateState.open}
                    onOpenChange={(open) => setQuickCreateState((prev) => ({ ...prev, open }))}
                    type={quickCreateState.type}
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
                    onOpenChange={(open) => setQuickEditState((prev) => ({ ...prev, open }))}
                    anchorRect={quickEditState.anchorRect}
                />
            )}
        </div>
    );
});
