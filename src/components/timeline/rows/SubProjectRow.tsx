import React from 'react';
import { SubProject, TimelineItem } from '@/types/timeline';
import { SubProjectLane } from './SubProjectLane';

interface SubProjectSectionProps {
  projectId: string;
  subProjectLanes: SubProject[][];
  itemsBySubProject: Map<string, Map<string, TimelineItem[]>>;
  days: { date: Date; dateStr: string }[];
  workspaceColor: number;
  onToggleItemComplete: (itemId: string) => void;
  onItemDoubleClick: (item: TimelineItem) => void;
  onSubProjectDoubleClick: (subProject: SubProject) => void;
  onQuickCreate: (type: 'item' | 'milestone', projectId: string, date: string, subProjectId?: string, workspaceColor?: number, anchorElement?: HTMLElement) => void;
  onQuickEdit: (item: TimelineItem | SubProject, anchorElement?: HTMLElement) => void;
  onItemClick: (id: string, multi: boolean, e: React.MouseEvent) => void;
  onItemContextMenu: (id: string, type: 'item' | 'milestone' | 'subproject', e: React.MouseEvent) => void;
  colorMode?: 'full' | 'monochromatic';
  systemAccent?: string;
}

// Wrapper component for all SubProject lanes
export function SubProjectSection({
  projectId,
  subProjectLanes,
  itemsBySubProject,
  days,
  workspaceColor,
  onToggleItemComplete,
  onItemDoubleClick,
  onSubProjectDoubleClick,
  onQuickCreate,
  onQuickEdit,
  onItemClick,
  onItemContextMenu,
  colorMode,
  systemAccent
}: SubProjectSectionProps) {

  if (subProjectLanes.length === 0) return null;

  return (
    <div className="relative">
      {subProjectLanes.map((lane, index) => (
        <SubProjectLane
          key={index}
          subProjects={lane}
          itemsBySubProject={itemsBySubProject}
          days={days}
          workspaceColor={workspaceColor}
          onToggleItemComplete={onToggleItemComplete}
          onItemDoubleClick={onItemDoubleClick}
          onSubProjectDoubleClick={onSubProjectDoubleClick}
          laneIndex={index}
          projectId={projectId}
          onQuickCreate={onQuickCreate}
          onQuickEdit={onQuickEdit}
          onItemClick={onItemClick}
          onItemContextMenu={onItemContextMenu}
          colorMode={colorMode}
          systemAccent={systemAccent}
        />
      ))}
    </div>
  );
}

export { SubProjectLane } from './SubProjectLane';
export { SubProjectBar } from './SubProjectBar';
export { StaticSubProjectBar } from './StaticSubProjectBar';
export { SubProjectCell } from './SubProjectCell';
