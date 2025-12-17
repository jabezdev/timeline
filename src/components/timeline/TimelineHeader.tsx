import { format, addDays, isToday } from 'date-fns';
import { RefObject } from 'react';

interface TimelineHeaderProps {
  startDate: Date;
  visibleDays: number;
  onNavigate: (direction: 'prev' | 'next') => void;
  scrollRef: RefObject<HTMLDivElement>;
}

export function TimelineHeader({ startDate, visibleDays, onNavigate, scrollRef }: TimelineHeaderProps) {
  const days = Array.from({ length: visibleDays }, (_, i) => addDays(startDate, i));

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex">
        {/* Sticky sidebar spacer */}
        <div className="w-72 shrink-0 flex items-center justify-between px-2 py-1.5 border-r border-border bg-background/95 sticky left-0 z-10">
          <button 
            onClick={() => onNavigate('prev')}
            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground text-sm"
          >
            ←
          </button>
          <span className="text-xs font-medium text-muted-foreground">
            {format(startDate, 'MMM yyyy')}
          </span>
          <button 
            onClick={() => onNavigate('next')}
            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground text-sm"
          >
            →
          </button>
        </div>
        
        {/* Date columns - scrollable */}
        <div 
          ref={scrollRef}
          className="flex flex-1 overflow-hidden"
        >
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`flex-1 min-w-[80px] px-1 py-1 text-center border-r border-border last:border-r-0 transition-colors ${
                isToday(day) ? 'bg-primary/10' : ''
              }`}
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
      </div>
    </div>
  );
}
