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

interface TimelineOverlaysProps {
    handleAddItem: (title: string, date: string, projectId: string, subProjectId?: string, color?: number) => void;
    handleAddMilestone: (projectId: string, title: string, date: string, color?: number) => void;
    handleAddSubProject: (projectId: string, title: string, startDate: string, endDate: string, color?: number) => void;
    handleItemSave: (item: TimelineItem | Milestone | SubProject) => void;
    handleItemDelete: (item: TimelineItem | Milestone | SubProject, deleteItems?: boolean) => void;
    allProjects: Project[];
    allSubProjects: SubProject[];
    selectedItem: TimelineItem | Milestone | SubProject | null;
    isItemDialogOpen: boolean;
    setIsItemDialogOpen: (open: boolean) => void;
    subProjectToDelete: SubProject | null;
    setSubProjectToDelete: (sp: SubProject | null) => void;

    // Quick Action States
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
}

export function TimelineOverlays({
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
}: TimelineOverlaysProps) {
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
        </>
    );
}
