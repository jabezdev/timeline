import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

import { PreferencesContent } from '@/features/settings/components/Preferences';
import { WorkspaceManager } from '@/features/workspace/components/WorkspaceManager';

interface TimelineControlsProps {
    startDate: Date;
    onNavigate: (direction: 'prev' | 'next') => void;
    onTodayClick: () => void;
    children?: React.ReactNode;
}

export function TimelineControls({ startDate, onNavigate, onTodayClick, children }: TimelineControlsProps) {
    const queryClient = useQueryClient();

    return (
        <div className="flex items-center w-full gap-2">
            {/* Left: Label (passed as children) */}
            <div className="shrink-0 min-w-0">
                {children}
            </div>

            {/* Center: Date Controls */}
            <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-0.5 bg-secondary/30 p-0.5 rounded-md">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onNavigate('prev')} title="Previous Week">
                        <ChevronLeft className="h-3.5 w-3.5 opacity-70" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onTodayClick} title="Today">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/70" />
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
                        className="w-[700px] p-0 overflow-hidden bg-background/80 backdrop-blur-xl border-border/50 shadow-2xl"
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
