import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { TimelineItem, SubProject } from '@/types/timeline';

export function useItemMutations() {
    const createFn = useMutation(api.timelineItems.create);
    const updateFn = useMutation(api.timelineItems.update);
    const removeFn = useMutation(api.timelineItems.remove);
    const reorderFn = useMutation(api.timelineItems.reorder);
    const batchUpdateFn = useMutation(api.timelineItems.batchUpdate);
    const createSPFn = useMutation(api.subProjects.create);
    const updateSPFn = useMutation(api.subProjects.update);
    const removeSPFn = useMutation(api.subProjects.remove);

    const addItem = {
        mutate: (i: Omit<TimelineItem, 'id'>) => {
            createFn({
                projectId: i.projectId as Id<'projects'>,
                title: i.title,
                date: i.date,
                content: i.content,
                completed: i.completed ?? false,
                subProjectId: i.subProjectId as Id<'subProjects'> | undefined,
                color: i.color,
                position: i.position,
            }).catch(err => console.error('addItem failed:', err));
        },
    };

    const updateItem = {
        mutate: ({ id, updates }: { id: string; updates: Partial<TimelineItem> }) => {
            updateFn({
                id: id as Id<'timelineItems'>,
                title: updates.title,
                content: updates.content,
                date: updates.date,
                completed: updates.completed,
                subProjectId: updates.subProjectId as Id<'subProjects'> | undefined,
                color: updates.color,
                position: updates.position,
                completedAt: updates.completedAt,
            }).catch(err => console.error('updateItem failed:', err));
        },
    };

    const deleteItem = {
        mutate: (id: string) => {
            removeFn({ id: id as Id<'timelineItems'> })
                .catch(err => console.error('deleteItem failed:', err));
        },
    };

    const reorderItems = {
        mutate: (items: Partial<TimelineItem>[]) => {
            reorderFn({
                items: items.map(i => ({ id: i.id as string, position: i.position ?? 0 })),
            }).catch(err => console.error('reorderItems failed:', err));
        },
    };

    const batchUpdateItems = {
        mutate: (items: Partial<TimelineItem>[]) => {
            batchUpdateFn({
                updates: items.map(({ id, ...fields }) => ({
                    id: id as string,
                    title: fields.title,
                    content: fields.content,
                    date: fields.date,
                    completed: fields.completed,
                    color: fields.color,
                    position: fields.position,
                    completedAt: fields.completedAt,
                })),
            }).catch(err => console.error('batchUpdateItems failed:', err));
        },
    };

    const addSubProject = {
        mutate: (s: Omit<SubProject, 'id'>) => {
            createSPFn({
                projectId: s.projectId as Id<'projects'>,
                title: s.title,
                startDate: s.startDate,
                endDate: s.endDate,
                color: s.color,
                description: s.description,
            }).catch(err => console.error('addSubProject failed:', err));
        },
    };

    const updateSubProject = {
        mutate: ({ id, updates, childItemsToUpdate }: { id: string; updates: Partial<SubProject>; childItemsToUpdate?: Partial<TimelineItem>[] }) => {
            updateSPFn({
                id: id as Id<'subProjects'>,
                title: updates.title,
                startDate: updates.startDate,
                endDate: updates.endDate,
                color: updates.color,
                description: updates.description,
            }).catch(err => console.error('updateSubProject failed:', err));
            if (childItemsToUpdate && childItemsToUpdate.length > 0) {
                batchUpdateFn({
                    updates: childItemsToUpdate.map(({ id: itemId, ...fields }) => ({
                        id: itemId as string,
                        date: fields.date,
                        completedAt: fields.completedAt,
                    })),
                }).catch(err => console.error('batchUpdateItems (for SP) failed:', err));
            }
        },
    };

    const deleteSubProject = {
        mutate: ({ id, deleteItems }: { id: string; deleteItems?: boolean }) => {
            removeSPFn({ id: id as Id<'subProjects'>, deleteItems })
                .catch(err => console.error('deleteSubProject failed:', err));
        },
    };

    return {
        addItem, updateItem, deleteItem, reorderItems, batchUpdateItems,
        addSubProject, updateSubProject, deleteSubProject,
    };
}
