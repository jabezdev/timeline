import { useCallback } from 'react';
import { useSync } from '@/components/sync/SyncProvider';

/**
 * A hook that returns a track function to wrap mutation promises for the sync indicator.
 * This allows using native Convex .withOptimisticUpdate() easily.
 */
export function useSyncTracker() {
    const { addPending, removePending } = useSync();

    const track = useCallback(async (promise: Promise<any>, description: string) => {
        const syncId = addPending(description);
        try {
            const result = await promise;
            return result;
        } finally {
            setTimeout(() => {
                removePending(syncId);
            }, 300);
        }
    }, [addPending, removePending]);

    return track;
}
