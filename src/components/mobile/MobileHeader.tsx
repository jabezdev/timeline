import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, ChevronsUpDown, Maximize2, Minimize2 } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";

interface MobileHeaderProps {
    activeDate: Date;
    onDateChange: (date: Date) => void;
    onExpandAll: () => void;
    onCollapseAll: () => void;
}

export function MobileHeader({ activeDate, onDateChange, onExpandAll, onCollapseAll }: MobileHeaderProps) {
    return (
        <div className="flex items-center justify-between p-3 border-b border-border bg-background z-10 shrink-0 shadow-sm">
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDateChange(subDays(activeDate, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 px-2 font-semibold">
                            {format(activeDate, 'MMM d, yyyy')}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <CalendarWidget
                            mode="single"
                            selected={activeDate}
                            onSelect={(d) => d && onDateChange(d)}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDateChange(addDays(activeDate, 1))}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDateChange(new Date())} title="Today">
                    <Calendar className="h-4 w-4" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronsUpDown className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onExpandAll}>
                            <Maximize2 className="mr-2 h-4 w-4" />
                            <span>Expand All</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onCollapseAll}>
                            <Minimize2 className="mr-2 h-4 w-4" />
                            <span>Collapse All</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
