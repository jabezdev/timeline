import { format, addDays, isToday, isSameDay } from 'date-fns';

interface TimelineHeaderProps {
  startDate: Date;
  visibleDays: number;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export function TimelineHeader({ startDate, visibleDays, onNavigate }: TimelineHeaderProps) {
  const days = Array.from({ length: visibleDays }, (_, i) => addDays(startDate, i));

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex">
        {/* Sidebar spacer */}
        <div className="w-72 shrink-0 flex items-center justify-between px-4 py-3 border-r border-border">
          <button 
            onClick={() => onNavigate('prev')}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            ←
          </button>
          <span className="text-sm font-medium text-muted-foreground">
            {format(startDate, 'MMM yyyy')}
          </span>
          <button 
            onClick={() => onNavigate('next')}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            →
          </button>
        </div>
        
        {/* Date columns */}
        <div className="flex flex-1 overflow-hidden">
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`flex-1 min-w-[120px] px-2 py-3 text-center border-r border-border last:border-r-0 transition-colors ${
                isToday(day) ? 'bg-primary/10' : ''
              }`}
            >
              <div className={`text-xs font-medium uppercase tracking-wider ${
                isToday(day) ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {format(day, 'EEE')}
              </div>
              <div className={`text-lg font-semibold mt-0.5 ${
                isToday(day) ? 'text-primary' : 'text-foreground'
              }`}>
                {format(day, 'd')}
              </div>
              {isToday(day) && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
