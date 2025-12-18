import { format, addDays, isToday } from 'date-fns';
import { ModeToggle } from '../mode-toggle';
import { Button } from '../ui/button';
import { Calendar, ChevronsDown } from 'lucide-react';

interface TimelineHeaderProps {
  startDate: Date;
  visibleDays: number;
  onNavigate: (direction: 'prev' | 'next') => void;
  onTodayClick: () => void;
  onExpandAll: () => void;
}

export const SIDEBAR_WIDTH = 260;
export const CELL_WIDTH = 180;

export function TimelineHeader({ startDate, visibleDays, onNavigate, onTodayClick, onExpandAll }: TimelineHeaderProps) {
  const days = Array.from({ length: visibleDays }, (_, i) => addDays(startDate, i));

  return (
    <div className="flex sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
      {/* Sticky navigation */}
      <div 
        className="shrink-0 flex items-center justify-between px-2 py-1.5 border-r border-border bg-background/95 sticky left-0 z-30"
        style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onExpandAll} title="Expand All Workspaces">
            <ChevronsDown className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">Expand All Workspaces</span>
          </Button>
          <ModeToggle />
          <Button variant="outline" size="icon" onClick={onTodayClick} title="Go to Today">
            <Calendar className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">Go to Today</span>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onNavigate('prev'); }}
            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground text-sm"
          >
            ←
          </button>
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {format(startDate, 'MMM yyyy')}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); onNavigate('next'); }}
            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground text-sm"
          >
            →
          </button>
        </div>
      </div>
      
      {/* Date columns - fixed width */}
      {days.map((day) => (
        <div
          key={day.toISOString()}
          className={`shrink-0 px-1 py-1 text-center border-r border-border last:border-r-0 transition-colors ${
            isToday(day) ? 'bg-primary/10' : ''
          }`}
          style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
        >
          <div className={`text-[10px] font-medium uppercase tracking-wider ${
            isToday(day) ? 'text-primary' : 'text-muted-foreground'
          }`}>
            {format(day, 'EEE')}
          </div>
          <div className={`text-sm font-semibold ${
            isToday(day) ? 'text-primary' : 'text-foreground'
          }`}>
            {format(day, 'd')}
          </div>
        </div>
      ))}
    </div>
  );
}
