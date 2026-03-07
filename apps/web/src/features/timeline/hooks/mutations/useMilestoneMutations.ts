import { useSyncTracker } from '@/hooks/useSyncTracker';
import { Milestone } from '@/types/timeline';
import { toast } from 'sonner';
import { useReplicache } from '@/hooks/useReplicache';

export function useMilestoneMutations() {
    const track = useSyncTracker();
    const rep = useReplicache();

    const addMilestone = {
        mutate: (m: Omit<Milestone, 'id'>) => {
            const description = `Adding milestone "${m.title}"`;
            if (!rep) return;

            const tempId = `temp-${Math.random().toString(36).substring(2, 9)}`;
            track(
                rep.mutate.createMilestone({
                    id: tempId,
                    projectId: m.projectId,
                    title: m.title,
                    date: m.date,
                    content: m.content ?? '',
                    color: m.color,
                    position: m.position,
                }),
                description
            ).catch(err => toast.error('Failed to add milestone', { description: err?.message }));
        },
    };

    const updateMilestone = {
        mutate: ({ id, updates }: { id: string; updates: Partial<Milestone> }) => {
            const description = `Updating milestone "${updates.title || 'details'}"`;
            if (!rep) return;

            track(
                rep.mutate.updateMilestone({ id, updates }),
                description
            ).catch(err => toast.error('Failed to update milestone', { description: err?.message }));
        },
    };

    const deleteMilestone = {
        mutate: (id: string) => {
            const description = 'Deleting milestone';
            if (!rep) return;

            track(
                rep.mutate.deleteMilestone({ id }),
                description
            ).catch(err => toast.error('Failed to delete milestone', { description: err?.message }));
        },
    };

    const reorderMilestones = {
        mutate: (milestones: Array<{ id: string; key: string }>) => {
            const description = 'Reordering milestones';
            if (!rep) return;

            track(
                rep.mutate.reorderMilestones({ milestones }),
                description
            ).catch(err => toast.error('Failed to reorder milestones', { description: err?.message }));
        },
    };

    return { addMilestone, updateMilestone, deleteMilestone, reorderMilestones };
}
