import { format, addDays, isToday } from 'date-fns';
import { HEADER_HEIGHT } from '@/lib/constants';

interface TimelineHeaderProps {
  startDate: Date;
  visibleDays: number;
}

export function TimelineHeader({ startDate, visibleDays }: TimelineHeaderProps) {
  const days = Array.from({ length: visibleDays }, (_, i) => addDays(startDate, i));

  return (
    <div
      className="flex sticky top-0 z-40 bg-background border-b border-border w-full"
      style={{ height: HEADER_HEIGHT }}
    >
      {/* Date columns - flex to fill available space */}
      {days.map((day) => (
        <div
          key={day.toISOString()}
          className={`flex-1 min-w-0 px-1 flex flex-col items-center justify-center text-center border-r border-border/50 last:border-r-0 transition-colors ${isToday(day) ? 'bg-primary/10' : ''
            }`}
        >
          <div className={`text-[10px] font-medium uppercase tracking-wider ${isToday(day) ? 'text-primary' : 'text-muted-foreground'
            }`}>
            {format(day, 'EEE')}
          </div>
          <div className={`text-sm font-semibold ${isToday(day) ? 'text-primary' : 'text-foreground'
            }`}>
            {format(day, 'd')}
          </div>
        </div>
      ))}
    </div>
  );
}
