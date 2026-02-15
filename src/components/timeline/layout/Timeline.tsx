import { TimelineView } from '@/features/timeline/components/layout/TimelineView';
import { VISIBLE_DAYS } from '@/lib/constants';
import { useTimelineData } from '@/hooks/useTimelineData';
import { useTimelineScroll } from '../hooks/useTimelineScroll';
import { useTimelineHandlers } from '../hooks/useTimelineHandlers';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { memo, useMemo } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export function Timeline() {
  const focusMode = useTimelineStore(state => state.focusMode);

  const {
    startDate,
    timelineRef,
    handleNavigate,
    handleTodayClick,
  } = useTimelineScroll(VISIBLE_DAYS);

  const { visibleDays, visibleWorkspaceIds } = useMemo(() => {
    const selectedEntries = Object.entries(focusMode.matrix || {}).filter(([, weeks]) => weeks.length > 0);
    const selectedWorkspaceIds = selectedEntries.map(([workspaceId]) => workspaceId);
    const selectedWeekKeys = [...new Set(selectedEntries.flatMap(([, weeks]) => weeks))];

    const isFocusActive = focusMode.enabled && selectedWorkspaceIds.length > 0 && selectedWeekKeys.length > 0;

    const furthestSelectedDayOffset = selectedWeekKeys.reduce((maxOffset, weekKey) => {
      const parsed = parseISO(weekKey);
      if (Number.isNaN(parsed.getTime())) return maxOffset;
      const offset = differenceInCalendarDays(parsed, startDate) + 7;
      return Math.max(maxOffset, offset);
    }, VISIBLE_DAYS);

    return {
      visibleDays: isFocusActive ? Math.max(VISIBLE_DAYS, furthestSelectedDayOffset) : VISIBLE_DAYS,
      visibleWorkspaceIds: isFocusActive ? selectedWorkspaceIds : undefined,
    };
  }, [focusMode, startDate]);

  const { data: timelineState } = useTimelineData(startDate, visibleDays);

  // Handlers and State
  const handlers = useTimelineHandlers({ timelineState });

  return (
    <TimelineContainer
      timelineState={timelineState}
      startDate={startDate}
      visibleDays={visibleDays}
      timelineRef={timelineRef}
      handleNavigate={handleNavigate}
      handleTodayClick={handleTodayClick}
      handlers={handlers}
      visibleWorkspaceIds={visibleWorkspaceIds}
    />
  );
}

import { useTimelineSelectors } from '@/hooks/useTimelineSelectors';

interface TimelineContainerProps {
  timelineState: import('@/types/timeline').TimelineState;
  startDate: Date;
  visibleDays: number;
  timelineRef: React.RefObject<HTMLDivElement>;
  handleNavigate: (dir: 'prev' | 'next') => void;
  handleTodayClick: () => void;
  handlers: ReturnType<typeof useTimelineHandlers>;
  visibleWorkspaceIds?: string[];
}

const TimelineContainer = memo(function TimelineContainer({
  timelineState,
  startDate,
  visibleDays,
  timelineRef,
  handleNavigate,
  handleTodayClick,
  handlers,
  visibleWorkspaceIds,
}: TimelineContainerProps) {
  const visibleWorkspaceSet = useMemo(
    () => visibleWorkspaceIds ? new Set(visibleWorkspaceIds) : undefined,
    [visibleWorkspaceIds]
  );

  const { allProjects, allSubProjects } = useTimelineSelectors(timelineState, {
    visibleWorkspaceIds: visibleWorkspaceSet,
  });

  return (
    <TimelineView
      timelineState={timelineState}
      startDate={startDate}
      visibleDays={visibleDays}
      timelineRef={timelineRef}
      handleNavigate={handleNavigate}
      handleTodayClick={handleTodayClick}

      // Handlers
      handleResizeStart={handlers.handleResizeStart}
      handleQuickCreate={handlers.handleQuickCreate}
      handleQuickEdit={handlers.handleQuickEdit}
      handleAddItem={handlers.handleAddItem}
      handleAddMilestone={handlers.handleAddMilestone}
      handleAddSubProject={handlers.handleAddSubProject}
      handleItemDoubleClick={handlers.handleItemDoubleClick}
      handleItemDelete={handlers.handleItemDelete}
      handleItemSave={handlers.handleItemSave}
      handleToggleItemComplete={handlers.handleToggleItemComplete}
      handleItemClick={handlers.handleItemClick}
      handleItemDragSelectStart={handlers.handleItemDragSelectStart}
      handleItemDragSelectEnter={handlers.handleItemDragSelectEnter}
      handleItemContextMenu={handlers.handleItemContextMenu}
      onClearSelection={handlers.handleClearSelection}

      // Data
      allProjects={allProjects}
      allSubProjects={allSubProjects}
      visibleWorkspaceIds={visibleWorkspaceSet}
    />
  );
});
