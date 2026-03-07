import { useSyncTracker } from '@/hooks/useSyncTracker';
import { TimelineItem, SubProject } from '@/types/timeline';
import { toast } from 'sonner';
import { useReplicache } from '@/hooks/useReplicache';

export function useItemMutations() {
    const track = useSyncTracker();
    const rep = useReplicache();

    const addItem = {
        mutate: (i: Omit<TimelineItem, 'id'>) => {
            const description = `Adding item "${i.title}"`;
            if (!rep) return;

            const tempId = `temp-${Math.random().toString(36).substring(2, 9)}`;
            track(
                rep.mutate.createTimelineItem({
                    id: tempId,
                    projectId: i.projectId,
                    title: i.title,
                    date: i.date,
                    content: i.content ?? '',
                    completed: i.completed ?? false,
                    subProjectId: i.subProjectId,
                    color: i.color,
                    position: i.position,
                }),
                description
            ).catch(err => toast.error('Failed to add item', { description: err?.message }));
        },
    };

    const updateItem = {
        mutate: ({ id, updates }: { id: string; updates: Partial<TimelineItem> }) => {
            const description = `Updating item "${updates.title || 'details'}"`;
            if (!rep) return;

            track(
                rep.mutate.updateTimelineItem({ id, updates }),
                description
            ).catch(err => toast.error('Failed to update item', { description: err?.message }));
        },
    };

    const deleteItem = {
        mutate: (id: string) => {
            const description = 'Deleting item';
            if (!rep) return;

            track(
                rep.mutate.deleteTimelineItem({ id }),
                description
            ).catch(err => toast.error('Failed to delete item', { description: err?.message }));
        },
    };

    const reorderItems = {
        mutate: (items: Array<{ id: string; key: string }>) => {
            const description = 'Reordering items';
            if (!rep) return;

            track(
                rep.mutate.reorderTimelineItems({ items }),
                description
            ).catch(err => toast.error('Failed to reorder items', { description: err?.message }));
        },
    };

    const batchUpdateItems = {
        mutate: (items: Partial<TimelineItem>[]) => {
            if (!rep) return;
            track(
                rep.mutate.batchUpdateTimelineItems({ items }),
                `Updating ${items.length} items`
            ).catch(err => toast.error('Failed to update items', { description: err?.message }));
        },
    };

    const addSubProject = {
        mutate: (s: Omit<SubProject, 'id'>) => {
            const description = `Adding sub-project "${s.title}"`;
            if (!rep) return;

            const tempId = `temp-${Math.random().toString(36).substring(2, 9)}`;
            track(
                rep.mutate.createSubProject({
                    id: tempId,
                    projectId: s.projectId,
                    title: s.title,
                    startDate: s.startDate,
                    endDate: s.endDate,
                    description: s.description,
                    color: s.color,
                }),
                description
            ).catch(err => toast.error('Failed to add sub-project', { description: err?.message }));
        },
    };

    const updateSubProject = {
        mutate: ({ id, updates, childItemsToUpdate }: { id: string; updates: Partial<SubProject>; childItemsToUpdate?: Partial<TimelineItem>[] }) => {
            const description = `Updating sub-project "${updates.title || 'details'}"`;
            if (!rep) return;

            const repPromises = [rep.mutate.updateSubProject({ id, updates })];

            if (childItemsToUpdate && childItemsToUpdate.length > 0) {
                repPromises.push(rep.mutate.batchUpdateTimelineItems({ items: childItemsToUpdate }));
            }

            track(
                Promise.all(repPromises),
                description
            ).catch(err => toast.error('Failed to update sub-project', { description: err?.message }));
        },
    };

    const deleteSubProject = {
        mutate: ({ id, deleteItems }: { id: string; deleteItems?: boolean }) => {
            const description = 'Deleting sub-project';
            if (!rep) return;

            track(
                rep.mutate.deleteSubProject({ id, deleteItems }),
                description
            ).catch(err => toast.error('Failed to delete sub-project', { description: err?.message }));
        },
    };

    return {
        addItem, updateItem, deleteItem, reorderItems, batchUpdateItems,
        addSubProject, updateSubProject, deleteSubProject,
    };
}
