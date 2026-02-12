import { memo, useMemo } from 'react';
import { addDays, format } from 'date-fns';
import { TimelineHeader } from '@/components/timeline/layout/TimelineHeader';
import { WorkspaceHeaderRow } from '@/components/timeline/layout/WorkspaceSection';
import { ProjectRow, MilestoneHeaderRow } from '@/components/timeline/rows/ProjectRow';
import { TimelineControls } from '@/features/timeline/components/layout/TimelineControls';
import { WorkspaceSidebarCell, ProjectSidebarCell, SidebarCell } from '@/features/timeline/components/sidebar/SidebarCells';
import { TimelineOverlays } from '@/features/timeline/components/layout/TimelineOverlays';
import { TimelineItem, Milestone, SubProject, TimelineState } from '@/types/timeline';
import { HEADER_HEIGHT, WORKSPACE_HEADER_HEIGHT, PROJECT_HEADER_HEIGHT } from '@/lib/constants';
import { Scrollbar } from '@/components/timeline/layout/Scrollbar';
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

export const TimelineView = memo(function TimelineView(props: TimelineViewProps) {
    const {
        timelineState,
        handleResizeStart,
        startDate,
        visibleDays,
        handleNavigate,
        handleTodayClick,
        handleQuickCreate,
        handleQuickEdit,
        handleItemDoubleClick,
        handleToggleItemComplete,
        timelineRef,
        handleItemClick,
        handleItemContextMenu,
        onClearSelection,
        // Props extracted to overlays
        handleAddItem,
        handleAddMilestone,
        handleAddSubProject,
        handleItemSave,
        handleItemDelete,
        allProjects,
        allSubProjects,
        selectedItem,
        isItemDialogOpen,
        setIsItemDialogOpen,
        subProjectToDelete,
        setSubProjectToDelete,
        quickCreateState,
        setQuickCreateState,
        quickEditState,
        setQuickEditState,
        availableSubProjectsForCreate,
        availableSubProjects,
    } = props;


    const {
        projectsItems,
        projectsMilestones,
        projectsSubProjects,
        workspaceProjects,
        sortedWorkspaceIds,
    } = useTimelineSelectors(timelineState);

    const { workspaces: workspacesMap } = timelineState;

    const daysWithStrings = useMemo(() => {
        return Array.from({ length: visibleDays }, (_, i) => {
            const date = addDays(startDate, i);
            return {
                date,
                dateStr: format(date, 'yyyy-MM-dd')
            };
        });
    }, [startDate, visibleDays]);

    return (
        <div className="h-screen flex bg-background overflow-hidden relative">
            <div
                ref={timelineRef}
                className="flex-1 overflow-auto scrollbar-hide w-full h-full"
                id="timeline-scroll-container"
                onClick={(e) => {
                    // Only handle clicks on the container itself (empty space)
                    if (e.target === e.currentTarget ||
                        (e.target as HTMLElement).classList?.contains('min-w-max') ||
                        (e.target as HTMLElement).id === 'timeline-scroll-container') {
                        onClearSelection();
                        // Also close quick edit popover
                        setQuickEditState(prev => ({ ...prev, open: false }));
                    }
                }}
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
                            days={daysWithStrings}
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
                                            days={daysWithStrings}
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
                                                    days={daysWithStrings}
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
                                                    days={daysWithStrings}
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

            <TimelineOverlays
                handleAddItem={handleAddItem}
                handleAddMilestone={handleAddMilestone}
                handleAddSubProject={handleAddSubProject}
                handleItemSave={handleItemSave}
                handleItemDelete={handleItemDelete}
                allProjects={allProjects}
                allSubProjects={allSubProjects}
                selectedItem={selectedItem}
                isItemDialogOpen={isItemDialogOpen}
                setIsItemDialogOpen={setIsItemDialogOpen}
                subProjectToDelete={subProjectToDelete}
                setSubProjectToDelete={setSubProjectToDelete}
                quickCreateState={quickCreateState}
                setQuickCreateState={setQuickCreateState}
                quickEditState={quickEditState}
                setQuickEditState={setQuickEditState}
                availableSubProjectsForCreate={availableSubProjectsForCreate}
                availableSubProjects={availableSubProjects}
            />

            <Scrollbar containerRef={timelineRef} orientation="horizontal" />
            <Scrollbar containerRef={timelineRef} orientation="vertical" />
        </div>
    );
});
