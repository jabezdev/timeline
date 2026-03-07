import { Check, ChevronLeft, ChevronRight, LayoutGrid, Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Workspace } from '@/types/timeline';
import { useEffect, useMemo, useState } from 'react';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import {
    addDays,
    addMonths,
    addWeeks,
    differenceInCalendarDays,
    endOfMonth,
    endOfWeek,
    format,
    getISOWeek,
    getISOWeekYear,
    startOfMonth,
    startOfWeek,
} from 'date-fns';

import { PreferencesContent } from '@/features/settings/components/Preferences';
import { WorkspaceManager } from '@/features/workspace/components/WorkspaceManager';

type FocusMatrix = Record<string, string[]>;

interface WeekColumn {
    key: string;
    weekStart: Date;
    isoWeek: number;
    isoWeekYear: number;
}

function buildWeekColumns(extraMonths: number): WeekColumn[] {
    const today = new Date();
    const rangeStart = startOfWeek(startOfMonth(today), { weekStartsOn: 1 });
    const rangeEnd = endOfWeek(endOfMonth(addMonths(today, 3 + extraMonths)), { weekStartsOn: 1 });

    const columns: WeekColumn[] = [];
    let cursor = rangeStart;

    while (cursor <= rangeEnd) {
        columns.push({
            key: format(cursor, 'yyyy-MM-dd'),
            weekStart: cursor,
            isoWeek: getISOWeek(cursor),
            isoWeekYear: getISOWeekYear(cursor),
        });
        cursor = addWeeks(cursor, 1);
    }

    return columns;
}

function toggleCellInMatrix(matrix: FocusMatrix, workspaceId: string, weekKey: string, shouldSelect: boolean): FocusMatrix {
    const currentWeeks = matrix[workspaceId] || [];
    const hasWeek = currentWeeks.includes(weekKey);

    if (shouldSelect && hasWeek) return matrix;
    if (!shouldSelect && !hasWeek) return matrix;

    const nextMatrix = { ...matrix };
    const nextWeeks = shouldSelect
        ? [...currentWeeks, weekKey].sort((a, b) => a.localeCompare(b))
        : currentWeeks.filter(w => w !== weekKey);

    if (nextWeeks.length === 0) {
        delete nextMatrix[workspaceId];
    } else {
        nextMatrix[workspaceId] = nextWeeks;
    }

    return nextMatrix;
}

function setRowInMatrix(matrix: FocusMatrix, workspaceId: string, weekKeys: string[], shouldSelect: boolean): FocusMatrix {
    const rowSet = new Set(matrix[workspaceId] || []);
    weekKeys.forEach(weekKey => {
        if (shouldSelect) rowSet.add(weekKey);
        else rowSet.delete(weekKey);
    });

    const nextMatrix = { ...matrix };
    const nextWeeks = [...rowSet].sort((a, b) => a.localeCompare(b));
    if (nextWeeks.length === 0) delete nextMatrix[workspaceId];
    else nextMatrix[workspaceId] = nextWeeks;

    return nextMatrix;
}

function setColumnInMatrix(matrix: FocusMatrix, workspaceIds: string[], weekKey: string, shouldSelect: boolean): FocusMatrix {
    let nextMatrix = matrix;
    workspaceIds.forEach(workspaceId => {
        nextMatrix = toggleCellInMatrix(nextMatrix, workspaceId, weekKey, shouldSelect);
    });
    return nextMatrix;
}

interface TimelineControlsProps {
    onNavigate: (direction: 'prev' | 'next') => void;
    onTodayClick: () => void;
    blurEffectsEnabled?: boolean;
    workspaces: Workspace[];
    children?: React.ReactNode;
}

export function TimelineControls({ onNavigate, onTodayClick, blurEffectsEnabled = true, workspaces, children }: TimelineControlsProps) {
    const focusMode = useTimelineStore(state => state.focusMode);
    const setFocusMode = useTimelineStore(state => state.setFocusMode);
    const focusModeExtraMonths = useTimelineStore(state => state.focusModeExtraMonths);
    const setFocusModeExtraMonths = useTimelineStore(state => state.setFocusModeExtraMonths);
    const resetFocusModeConfig = useTimelineStore(state => state.resetFocusModeConfig);

    const [isFocusDialogOpen, setIsFocusDialogOpen] = useState(false);
    const [extraMonths, setExtraMonths] = useState(focusModeExtraMonths);
    const [draftEnabled, setDraftEnabled] = useState(focusMode.enabled);
    const [draftMatrix, setDraftMatrix] = useState<FocusMatrix>(focusMode.matrix);
    const [dragMode, setDragMode] = useState<{
        type: 'cell' | 'row' | 'column';
        selecting: boolean;
    } | null>(null);

    const weeks = useMemo(() => buildWeekColumns(extraMonths), [extraMonths]);
    const weekKeys = useMemo(() => weeks.map(week => week.key), [weeks]);
    const workspaceIds = useMemo(() => workspaces.map(workspace => workspace.id), [workspaces]);
    const currentWeekKey = useMemo(
        () => format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        []
    );
    const defaultWeekKeys = useMemo(() => {
        const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        return weeks
            .filter(week => {
                const diffWeeks = differenceInCalendarDays(week.weekStart, currentWeekStart) / 7;
                return diffWeeks >= -1 && diffWeeks <= 3;
            })
            .map(week => week.key);
    }, [weeks]);

    const effectiveMatrix = useMemo(() => {
        if (!draftEnabled) {
            const defaultMatrix: FocusMatrix = {};
            workspaces.forEach(workspace => {
                defaultMatrix[workspace.id] = defaultWeekKeys;
            });
            return defaultMatrix;
        }
        return draftMatrix;
    }, [draftEnabled, draftMatrix, workspaces, defaultWeekKeys]);

    useEffect(() => {
        if (!isFocusDialogOpen) {
            setDragMode(null);
            setDraftEnabled(focusMode.enabled);
            setDraftMatrix(focusMode.matrix);
            setExtraMonths(focusModeExtraMonths);
        }
    }, [isFocusDialogOpen, focusMode.enabled, focusMode.matrix, focusModeExtraMonths]);

    useEffect(() => {
        const handlePointerUp = () => setDragMode(null);
        window.addEventListener('pointerup', handlePointerUp);
        return () => window.removeEventListener('pointerup', handlePointerUp);
    }, []);

    const selectionInfo = useMemo(() => {
        const selectedEntries = Object.entries(draftMatrix).filter(([, selectedWeeks]) => selectedWeeks.length > 0);
        const selectedWorkspaceCount = selectedEntries.length;
        const allWeeks = [...new Set(selectedEntries.flatMap(([, selectedWeeks]) => selectedWeeks))].sort((a, b) => a.localeCompare(b));

        return {
            selectedWorkspaceCount,
            selectedWeeks: allWeeks.length,
            hasSelections: selectedWorkspaceCount > 0,
        };
    }, [draftMatrix]);

    const handleCellPointerDown = (workspaceId: string, weekKey: string) => {
        if (!draftEnabled) return;
        const currentlyChecked = (effectiveMatrix[workspaceId] || []).includes(weekKey);
        const selecting = !currentlyChecked;
        setDragMode({ type: 'cell', selecting });
        setDraftMatrix(prev => toggleCellInMatrix(prev, workspaceId, weekKey, selecting));
    };

    const handleCellEnter = (workspaceId: string, weekKey: string) => {
        if (!draftEnabled || !dragMode || dragMode.type !== 'cell') return;
        setDraftMatrix(prev => toggleCellInMatrix(prev, workspaceId, weekKey, dragMode.selecting));
    };

    const handleRowToggle = (workspaceId: string) => {
        if (!draftEnabled) return;
        const selectedCount = weekKeys.filter(weekKey => (effectiveMatrix[workspaceId] || []).includes(weekKey)).length;
        const shouldSelect = selectedCount !== weekKeys.length;
        setDraftMatrix(prev => setRowInMatrix(prev, workspaceId, weekKeys, shouldSelect));
    };

    const handleColumnToggle = (weekKey: string) => {
        if (!draftEnabled) return;
        const selectedCount = workspaceIds.filter(workspaceId => (effectiveMatrix[workspaceId] || []).includes(weekKey)).length;
        const shouldSelect = selectedCount !== workspaceIds.length;
        setDraftMatrix(prev => setColumnInMatrix(prev, workspaceIds, weekKey, shouldSelect));
    };

    const handleRowPointerDown = (workspaceId: string) => {
        if (!draftEnabled) return;
        const selectedCount = weekKeys.filter(weekKey => (effectiveMatrix[workspaceId] || []).includes(weekKey)).length;
        const shouldSelect = selectedCount !== weekKeys.length;
        setDragMode({ type: 'row', selecting: shouldSelect });
        setDraftMatrix(prev => setRowInMatrix(prev, workspaceId, weekKeys, shouldSelect));
    };

    const handleRowPointerEnter = (workspaceId: string) => {
        if (!draftEnabled || !dragMode || dragMode.type !== 'row') return;
        setDraftMatrix(prev => setRowInMatrix(prev, workspaceId, weekKeys, dragMode.selecting));
    };

    const handleColumnPointerDown = (weekKey: string) => {
        if (!draftEnabled) return;
        const selectedCount = workspaceIds.filter(workspaceId => (effectiveMatrix[workspaceId] || []).includes(weekKey)).length;
        const shouldSelect = selectedCount !== workspaceIds.length;
        setDragMode({ type: 'column', selecting: shouldSelect });
        setDraftMatrix(prev => setColumnInMatrix(prev, workspaceIds, weekKey, shouldSelect));
    };

    const handleColumnPointerEnter = (weekKey: string) => {
        if (!draftEnabled || !dragMode || dragMode.type !== 'column') return;
        setDraftMatrix(prev => setColumnInMatrix(prev, workspaceIds, weekKey, dragMode.selecting));
    };

    const handleSave = () => {
        setFocusModeExtraMonths(extraMonths);

        if (!draftEnabled) {
            setFocusMode({ enabled: false, matrix: {} });
            setIsFocusDialogOpen(false);
            return;
        }

        setFocusMode({
            enabled: true,
            matrix: draftMatrix,
        });
        setIsFocusDialogOpen(false);
    };

    const handleReset = () => {
        resetFocusModeConfig();
        setDraftEnabled(false);
        setDraftMatrix({});
        setExtraMonths(0);
        setDragMode(null);
    };

    return (
        <div className="flex items-center w-full gap-2">
            {/* Left: Label (passed as children) */}
            <div className="shrink-0 min-w-0">
                {children}
            </div>

            {/* Center: Date Controls */}
            <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-0.5 bg-secondary/30 p-0.5 rounded-md">
                    <Dialog open={isFocusDialogOpen} onOpenChange={setIsFocusDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="Focus Workspaces & Weeks">
                                <LayoutGrid className="h-3.5 w-3.5 opacity-70" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent
                            className={cn(
                                'z-[1100] w-[95vw] max-w-[1400px] h-[88vh] min-w-0 p-0 border-border/60 bg-background/95 shadow-2xl overflow-hidden',
                                blurEffectsEnabled && 'backdrop-blur-xl'
                            )}
                        >
                            <div className="relative h-full min-h-0 min-w-0 flex flex-col overflow-hidden">
                                <DialogHeader className="px-6 pt-6 pb-2 text-left">
                                    <DialogTitle className="text-base">Workspace Focus Matrix</DialogTitle>
                                    <DialogDescription>
                                        Choose workspace/week visibility and save to apply. Focus starts with this month plus 3 months.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="px-6 pb-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted-foreground">Focus mode</span>
                                        <Switch
                                            checked={draftEnabled}
                                            onCheckedChange={(checked) => {
                                                setDraftEnabled(checked);
                                                if (!checked) {
                                                    setDraftMatrix({});
                                                }
                                            }}
                                            aria-label="Toggle focus mode"
                                        />
                                        <span className="text-xs font-medium text-foreground/80">
                                            {draftEnabled ? 'On' : 'Off (last week + this week + 3 weeks ahead)'}
                                        </span>
                                    </div>

                                    <div className="text-xs text-muted-foreground">
                                        {draftEnabled
                                            ? selectionInfo.hasSelections
                                                ? `${selectionInfo.selectedWorkspaceCount} workspace(s) · ${selectionInfo.selectedWeeks} selected week(s)`
                                                : 'No selections yet'
                                            : 'Editing disabled while focus mode is off'}
                                </div>
                                </div>

                                <div className="px-6 pb-2">
                                    <div className="rounded-md border border-border/60 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
                                        Matrix grid is isolated below. Row/column selectors are frozen while scrolling.
                                    </div>
                                </div>

                                <div className="px-6 pb-[86px] flex-1 min-h-0 min-w-0 overflow-hidden">
                                    <div className="h-full w-full min-w-0 max-w-full rounded-md border border-border/50 bg-muted/20 p-3 overflow-hidden">
                                        <div className="h-full w-full min-w-0 max-w-full overflow-x-scroll overflow-y-auto pr-2 pb-2">
                                            <div
                                                className="grid gap-1 w-max"
                                                style={{ gridTemplateColumns: `320px repeat(${weeks.length}, 32px) 32px` }}
                                            >
                                            <div className="h-40 sticky top-0 left-0 z-50 bg-background rounded border border-border/40" />
                                            {weeks.map(week => {
                                                const isCurrentWeek = week.key === currentWeekKey;
                                                return (
                                                    <button
                                                        key={`week-header-${week.key}`}
                                                        type="button"
                                                        disabled={!draftEnabled}
                                                        onPointerDown={() => handleColumnPointerDown(week.key)}
                                                        onPointerEnter={() => handleColumnPointerEnter(week.key)}
                                                        className={cn(
                                                            'h-40 w-8 rounded border flex items-center justify-center text-center sticky top-0 z-40 bg-background',
                                                            draftEnabled ? 'border-primary/30 hover:bg-primary/10' : 'border-border/40',
                                                            isCurrentWeek && 'border-primary bg-primary/15 ring-1 ring-primary/60'
                                                        )}
                                                        title={`W${week.isoWeek} · ${week.isoWeekYear} · ${format(week.weekStart, 'MMM d')} - ${format(addDays(week.weekStart, 6), 'MMM d')}`}
                                                    >
                                                        <span className={cn(
                                                            'origin-center -rotate-90 text-[10px] font-semibold leading-tight whitespace-nowrap',
                                                            isCurrentWeek ? 'text-primary' : 'text-muted-foreground'
                                                        )}>
                                                            W{week.isoWeek} · {week.isoWeekYear} · {format(week.weekStart, 'MMM d')} - {format(addDays(week.weekStart, 6), 'MMM d')}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-40 w-8 sticky top-0 z-40 bg-background"
                                                onClick={() => {
                                                    const next = extraMonths + 1;
                                                    setExtraMonths(next);
                                                    setFocusModeExtraMonths(next);
                                                }}
                                                title="Show one more month"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                            </Button>

                                            {workspaces.map(workspace => (
                                                <div key={`row-${workspace.id}`} className="contents">
                                                    <button
                                                        type="button"
                                                        disabled={!draftEnabled}
                                                        onPointerDown={() => handleRowPointerDown(workspace.id)}
                                                        onPointerEnter={() => handleRowPointerEnter(workspace.id)}
                                                        className={cn(
                                                            'h-8 pr-3 pl-2 flex items-center text-[12px] font-medium truncate text-foreground/90 sticky left-0 z-30 bg-background rounded border border-border/30 text-left',
                                                            draftEnabled ? 'hover:border-primary/50 hover:bg-primary/5' : 'opacity-80'
                                                        )}
                                                        title={workspace.name}
                                                    >
                                                        {workspace.name}
                                                    </button>
                                                    {weeks.map(week => {
                                                        const checked = (effectiveMatrix[workspace.id] || []).includes(week.key);

                                                        return (
                                                            <button
                                                                key={`cell-${workspace.id}-${week.key}`}
                                                                type="button"
                                                                disabled={!draftEnabled}
                                                                onPointerDown={() => handleCellPointerDown(workspace.id, week.key)}
                                                                onPointerEnter={() => handleCellEnter(workspace.id, week.key)}
                                                                className={cn(
                                                                    'h-8 w-8 rounded-md border transition-colors flex items-center justify-center justify-self-center',
                                                                    checked
                                                                        ? 'border-primary bg-primary text-primary-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]'
                                                                        : 'border-border/60 bg-background/60',
                                                                    week.key === currentWeekKey && !checked && 'bg-primary/10 border-primary/40',
                                                                    draftEnabled ? 'hover:border-primary/60' : 'opacity-70'
                                                                )}
                                                                aria-label={`${workspace.name}, ISO week ${week.isoWeek}`}
                                                            >
                                                                {checked ? <Check className="h-3.5 w-3.5" /> : null}
                                                            </button>
                                                        );
                                                    })}
                                                    <div className="h-8" />
                                                </div>
                                            ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <DialogFooter className="absolute bottom-0 left-0 right-0 z-30 w-full shrink-0 px-6 py-4 border-t border-border/50 bg-background/95 flex items-center justify-between gap-2 sm:justify-between sm:space-x-0">
                                    <div className="min-w-0 text-xs text-muted-foreground">
                                        Week labels are ISO week numbers. Added months are temporary and reset when this dialog closes.
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleReset}
                                        >
                                            Reset
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setDraftEnabled(focusMode.enabled);
                                                setDraftMatrix(focusMode.matrix);
                                                setExtraMonths(focusModeExtraMonths);
                                                setIsFocusDialogOpen(false);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button size="sm" onClick={handleSave}>
                                            Save
                                        </Button>
                                    </div>
                                </DialogFooter>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onTodayClick} title="Today">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onNavigate('prev')} title="Previous Week">
                        <ChevronLeft className="h-3.5 w-3.5 opacity-70" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onNavigate('next')} title="Next Week">
                        <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                    </Button>
                </div>
            </div>

            {/* Right: Settings */}
            <div className="shrink-0 flex justify-end">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                            <Settings2 className="w-4 h-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        className={cn(
                            "z-[900] w-[700px] p-0 overflow-hidden bg-background/80 border-border/50 shadow-2xl",
                            blurEffectsEnabled && "backdrop-blur-xl"
                        )}
                        align="start"
                        side="bottom"
                        sideOffset={8}
                    >
                        <div className="grid grid-cols-[280px_1fr] h-[600px]">

                            {/* Left Column: Preferences */}
                            <div className="border-r border-border/40 bg-muted/30 flex flex-col overflow-y-auto">
                                <div className="p-4 flex flex-col gap-6 min-h-0">
                                    <PreferencesContent />
                                </div>
                            </div>

                            {/* Right Column: Workspaces */}
                            <div className="p-4 flex flex-col h-full overflow-hidden">
                                <WorkspaceManager />
                            </div>

                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
