import { useSync } from './SyncProvider';
import { WifiOff, Loader2, CheckCircle2, ChevronUp, ChevronDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';

export function SyncStatusIndicator() {
    const { pendingMutations, isOnline } = useSync();
    const pendingCount = pendingMutations.length;
    const [showSynced, setShowSynced] = useState(false);
    const [prevPendingCount, setPrevPendingCount] = useState(pendingCount);
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (prevPendingCount > 0 && pendingCount === 0 && isOnline) {
            setShowSynced(true);
            const timer = setTimeout(() => setShowSynced(false), 2000);
            return () => clearTimeout(timer);
        }
        setPrevPendingCount(pendingCount);
    }, [pendingCount, isOnline, prevPendingCount]);

    const handleMouseLeave = () => {
        if (isExpanded) {
            setIsExpanded(false);
        }
    };

    if (isOnline && pendingCount === 0 && !showSynced) return null;

    return (
        <div
            ref={containerRef}
            onMouseLeave={handleMouseLeave}
            className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2"
        >
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-full border shadow-lg transition-all duration-300 transform pointer-events-auto group",
                    !isOnline
                        ? "bg-destructive/10 border-destructive/20 text-destructive"
                        : pendingCount > 0
                            ? "bg-primary/10 border-primary/20 text-primary"
                            : "bg-green-500/10 border-green-500/20 text-green-600",
                    isOnline && pendingCount === 0 && !showSynced ? "translate-y-4 opacity-0 scale-95" : "translate-y-0 opacity-100 scale-100"
                )}
            >
                {!isOnline ? (
                    <>
                        <WifiOff className="h-4 w-4" />
                        <span className="text-xs font-medium">
                            {pendingCount > 0
                                ? `Offline - ${pendingCount} change${pendingCount > 1 ? 's' : ''} pending`
                                : 'Offline'}
                        </span>
                    </>
                ) : pendingCount > 0 ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-xs font-medium">
                            Syncing {pendingCount} change{pendingCount > 1 ? 's' : ''}...
                        </span>
                    </>
                ) : (
                    <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-medium">All synced</span>
                    </>
                )}
                {pendingCount > 0 && (
                    <div className="ml-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                    </div>
                )}
            </button>

            {/* List of changes */}
            {isExpanded && pendingCount > 0 && (
                <div className="bg-background/95 backdrop-blur-sm border rounded-xl shadow-2xl overflow-hidden w-64 animate-in slide-in-from-bottom-2 duration-200">
                    <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Changes</span>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto overflow-x-hidden">
                        {pendingMutations.map((m) => (
                            <div key={m.id} className="p-3 border-b last:border-0 hover:bg-muted/50 transition-colors group">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">{m.description}</p>
                                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                                            <Clock className="h-2.5 w-2.5" />
                                            <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {!isOnline && (
                        <div className="p-2 px-3 bg-destructive/5 text-destructive text-[10px] border-t border-destructive/10">
                            Waiting for connection to resume sync...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
