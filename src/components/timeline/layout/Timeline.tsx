import { TimelineView } from '@/features/timeline/components/layout/TimelineView';
import { VISIBLE_DAYS } from '@/lib/constants';
import { useTimelineData } from '@/hooks/useTimelineData';
import { useTimelineScroll } from '../hooks/useTimelineScroll';
import { useTimelineHandlers } from '../hooks/useTimelineHandlers';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { memo } from 'react';

export function Timeline() {
  const visibleDays = VISIBLE_DAYS;

  const {
    startDate,
    timelineRef,
    handleNavigate,
    handleTodayClick,
  } = useTimelineScroll(visibleDays);

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
}

const TimelineContainer = memo(function TimelineContainer({
  timelineState,
  startDate,
  visibleDays,
  timelineRef,
  handleNavigate,
  handleTodayClick,
  handlers
}: TimelineContainerProps) {
  const { allProjects, allSubProjects } = useTimelineSelectors(timelineState);

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
      handleItemContextMenu={handlers.handleItemContextMenu}
      onClearSelection={handlers.clearSelection}

      // State
      setSelectedItem={handlers.setSelectedItem}
      setIsItemDialogOpen={handlers.setIsItemDialogOpen}
      setSubProjectToDelete={handlers.setSubProjectToDelete}
      selectedItem={handlers.selectedItem}
      isItemDialogOpen={handlers.isItemDialogOpen}
      subProjectToDelete={handlers.subProjectToDelete}

      quickCreateState={handlers.quickCreateState}
      setQuickCreateState={handlers.setQuickCreateState}
      quickEditState={handlers.quickEditState}
      setQuickEditState={handlers.setQuickEditState}
      availableSubProjectsForCreate={handlers.availableSubProjectsForCreate}
      availableSubProjects={handlers.availableSubProjects}

      // Data
      allProjects={allProjects}
      allSubProjects={allSubProjects}
    />
  );
});
