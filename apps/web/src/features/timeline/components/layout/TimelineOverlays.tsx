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
import { CreateItemPopover } from '@/components/timeline/popovers/CreateItemPopover';
import { ItemSheet } from '@/components/timeline/modals/ItemSheet';
import { QuickCreatePopover } from '@/components/timeline/popovers/QuickCreatePopover';
import { QuickEditPopover } from '@/components/timeline/popovers/QuickEditPopover';
import { TimelineItem, Milestone, SubProject, Project } from '@/types/timeline';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { useEffect, useMemo } from 'react';

interface TimelineOverlaysProps {
    handleAddItem: (title: string, date: string, projectId: string, subProjectId?: string, color?: number) => void;
    handleAddMilestone: (projectId: string, title: string, date: string, color?: number) => void;
    handleAddSubProject: (projectId: string, title: string, startDate: string, endDate: string, color?: number) => void;
    handleItemSave: (item: TimelineItem | Milestone | SubProject) => void;
    handleItemDelete: (item: TimelineItem | Milestone | SubProject, deleteItems?: boolean) => void;
    allProjects: Project[];
    allSubProjects: SubProject[];
    timelineState: import('@/types/timeline').TimelineState;
    blurEffectsEnabled?: boolean;
}

export function TimelineOverlays({
    handleAddItem,
    handleAddMilestone,
    handleAddSubProject,
    handleItemSave,
    handleItemDelete,
    allProjects,
    allSubProjects,
    timelineState,
    blurEffectsEnabled = true,
}: TimelineOverlaysProps) {
    const selectedItem = useTimelineStore(state => state.selectedItem);
    const isItemDialogOpen = useTimelineStore(state => state.isItemDialogOpen);
    const setIsItemDialogOpen = useTimelineStore(state => state.setIsItemDialogOpen);
    const quickCreateState = useTimelineStore(state => state.quickCreateState);
    const setQuickCreateState = useTimelineStore(state => state.setQuickCreateState);
    const quickEditState = useTimelineStore(state => state.quickEditState);
    const setQuickEditState = useTimelineStore(state => state.setQuickEditState);
    const subProjectToDelete = useTimelineStore(state => state.subProjectToDelete);
    const setSubProjectToDelete = useTimelineStore(state => state.setSubProjectToDelete);

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
    return (
        <>
            <CreateItemPopover
                onAddItem={handleAddItem}
                onAddMilestone={handleAddMilestone}
                onAddSubProject={handleAddSubProject}
                projects={allProjects}
                subProjects={allSubProjects}
                activeProjectId={allProjects[0]?.id}
            />

            <ItemSheet
                item={selectedItem}
                open={isItemDialogOpen}
                onOpenChange={setIsItemDialogOpen}
                onSave={handleItemSave}
                onDelete={handleItemDelete}
                projects={allProjects}
                subProjects={allSubProjects}
                blurEffectsEnabled={blurEffectsEnabled}
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
                    blurEffectsEnabled={blurEffectsEnabled}
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
        </>
    );
}
