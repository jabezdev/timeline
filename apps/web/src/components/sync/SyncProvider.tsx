import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface PendingMutation {
    id: string;
    description: string;
    timestamp: number;
}

interface SyncContextType {
    pendingMutations: PendingMutation[];
    addPending: (description: string) => string;
    removePending: (id: string) => void;
    isOnline: boolean;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: React.ReactNode }) {
    const [pendingMutations, setPendingMutations] = useState<PendingMutation[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const offlineTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const addPending = useCallback((description: string) => {
        const id = Math.random().toString(36).substring(2, 9);
        setPendingMutations((prev) => [...prev, { id, description, timestamp: Date.now() }]);
        return id;
    }, []);

    const removePending = useCallback((id: string) => {
        setPendingMutations((prev) => prev.filter((m) => m.id !== id));
    }, []);

    const pendingCount = pendingMutations.length;

    useEffect(() => {
        const handleOnline = () => {
            if (offlineTimeoutRef.current) {
                clearTimeout(offlineTimeoutRef.current);
                offlineTimeoutRef.current = null;
            }
            setIsOnline(true);
        };

        const handleOffline = () => {
            // Delay showing "offline" for 60 seconds to avoid unnecessary noise
            if (!offlineTimeoutRef.current) {
                offlineTimeoutRef.current = setTimeout(() => {
                    setIsOnline(false);
                    offlineTimeoutRef.current = null;
                }, 60000);
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (offlineTimeoutRef.current) clearTimeout(offlineTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (pendingMutations.length > 0) {
                e.preventDefault();
                e.returnValue = ''; // Required for Chrome
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [pendingMutations.length]);

    return (
        <SyncContext.Provider value={{ pendingMutations, addPending, removePending, isOnline }}>
            {children}
        </SyncContext.Provider>
    );
}

export function useSync() {
    const context = useContext(SyncContext);
    if (context === undefined) {
        throw new Error('useSync must be used within a SyncProvider');
    }
    return context;
}
