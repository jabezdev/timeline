import { format, addDays, isToday } from 'date-fns';
import { HEADER_HEIGHT } from '@/lib/timelineUtils';

interface TimelineHeaderProps {
  startDate: Date;
  visibleDays: number;
}

export const SIDEBAR_WIDTH = 260;
export const CELL_WIDTH = 180;

export function TimelineHeader({ startDate, visibleDays }: TimelineHeaderProps) {
  const days = Array.from({ length: visibleDays }, (_, i) => addDays(startDate, i));

  return (
    <div 
      className="flex sticky top-0 z-40 bg-background border-b border-border"
      style={{ height: HEADER_HEIGHT }}
    >
      {/* Date columns - fixed width */}
      {days.map((day) => (
        <div
          key={day.toISOString()}
          className={`shrink-0 px-1 flex flex-col items-center justify-center text-center border-r border-border last:border-r-0 transition-colors ${
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
