import { format, addDays, isToday, isWeekend } from 'date-fns';
import { HEADER_HEIGHT, CELL_WIDTH } from '@/lib/constants';
import { TimelineItem } from '@/types/timeline';
import { useMemo } from 'react';

interface TimelineHeaderProps {
  days: { date: Date; dateStr: string }[];
  projectsItems: Map<string, TimelineItem[]>;
}

// ... imports
import { memo } from 'react';

// ... interface

export const TimelineHeader = memo(function TimelineHeader({ days, projectsItems }: TimelineHeaderProps) {
  const dailyCounts = useMemo(() => {
    const counts = new Map<string, number>();

    // Iterate through all projects' items
    for (const items of projectsItems.values()) {
      for (const item of items) {
        if (!item.completed) {
          const date = item.date;
          counts.set(date, (counts.get(date) || 0) + 1);
        }
      }
    }
    return counts;
  }, [projectsItems]);

  return (
    <div
      className="flex sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border"
      style={{ height: HEADER_HEIGHT }}
    >
      {/* Date columns - fixed width */}
      {days.map(({ date, dateStr }) => {
        const count = dailyCounts.get(dateStr) || 0;
        const isDayToday = isToday(date);
        const isDayWeekend = isWeekend(date);

        return (
          <div
            key={dateStr}
            className={`shrink-0 flex items-stretch justify-between text-left border-r border-border last:border-r-0 transition-colors cursor-default select-none
               ${isDayToday ? 'bg-primary text-primary-foreground' : isDayWeekend ? 'bg-secondary' : 'bg-background'}
            `}
            style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
          >
            {/* Left: Date and Day */}
            <div className="flex flex-col justify-center px-2 min-w-0 flex-1 pt-1.5">
              <div className={`text-sm font-bold leading-none ${isDayToday ? 'text-primary-foreground' : 'text-foreground'}`}>
                {format(date, 'MMM d')}
              </div>
              <div className={`text-[10px] uppercase font-medium mt-0.5 opacity-80 ${isDayToday ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {format(date, 'EEE')}
              </div>
            </div>

            {/* Right: Task Count Square */}
            {count > 0 && (
              <div
                className="shrink-0 flex items-center justify-center font-bold text-xs"
                style={{ width: HEADER_HEIGHT, height: '100%' }} // Square, flush to right
              >
                <span className={`flex items-center justify-center rounded-full h-5 min-w-[20px] px-1.5 
                    ${isDayToday ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-secondary text-secondary-foreground'}
                  `}>
                  {count}
                </span>
              </div>
            )}
            {/* If no count, we still keep the spacing or just leave empty? User said "aligned to the right: a flushed square area". 
                If count is 0, arguably we don't show the square or the number. 
            */}
          </div>
        );
      })}
    </div>
  );
});
