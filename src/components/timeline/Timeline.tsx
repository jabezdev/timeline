import { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { addDays, subDays, startOfWeek } from 'date-fns';
import { TimelineHeader } from './TimelineHeader';
import { WorkspaceSection } from './WorkspaceSection';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { Plus } from 'lucide-react';
import { AddItemDialog } from './AddItemDialog';
import { ItemDialog } from './ItemDialog';
import { TimelineItem, Milestone } from '@/types/timeline';

export function Timeline() {
  const [startDate, setStartDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | Milestone | null>(null);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const visibleDays = 14;
  
  const { 
    workspaces, 
    openProjectIds, 
    toggleWorkspace, 
    toggleProject,
    updateItemDate,
    updateMilestoneDate,
    toggleItemComplete,
    addItem,
    updateItem,
    updateMilestone,
    addWorkspace,
    addProject,
    expandAllWorkspaces,
  } = useTimelineStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleNavigate = (direction: 'prev' | 'next') => {
    setStartDate(prev => 
      direction === 'next' 
        ? addDays(prev, 7) 
        : subDays(prev, 7)
    );
  };

  const handleTodayClick = () => {
    setStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const dropData = over.data.current as { projectId: string; date: string } | undefined;
    if (!dropData) return;
    
    const dragData = active.data.current as { type: string; item: any } | undefined;
    if (!dragData) return;
    
    const newDate = dropData.date;
    
    switch (dragData.type) {
      case 'item':
        updateItemDate(dragData.item.id, newDate);
        break;
      case 'milestone':
        updateMilestoneDate(dragData.item.id, newDate);
        break;
    }
  };

  const handleAddItem = (title: string, date: string, projectId: string) => {
    addItem(projectId, title, date);
  };

  const handleItemClick = (item: TimelineItem | Milestone) => {
    setSelectedItem(item);
    setIsItemDialogOpen(true);
  };

  const handleItemSave = (updatedItem: TimelineItem | Milestone) => {
    if ('completed' in updatedItem) {
      updateItem(updatedItem.id, updatedItem as TimelineItem);
    } else {
      updateMilestone(updatedItem.id, updatedItem as Milestone);
    }
  };

  const allProjects = workspaces.flatMap(ws => 
    ws.projects.map(p => ({ ...p, workspaceName: ws.name }))
  );

  // Sort: active workspaces (with open projects) first, then expanded, then collapsed
  const sortedWorkspaces = useMemo(() => {
    const hasOpenProject = (ws: typeof workspaces[0]) => 
      ws.projects.some(p => openProjectIds.has(p.id));
    
    const activeWorkspaces = workspaces.filter(ws => !ws.isCollapsed && hasOpenProject(ws));
    const expandedWorkspaces = workspaces.filter(ws => !ws.isCollapsed && !hasOpenProject(ws));
    const collapsedWorkspaces = workspaces.filter(ws => ws.isCollapsed);
    
    return [...activeWorkspaces, ...expandedWorkspaces, ...collapsedWorkspaces];
  }, [workspaces, openProjectIds]);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col bg-background">
        {/* Single scroll container for everything */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-fit">
            {/* Timeline Header - sticky at top */}
            <TimelineHeader 
              startDate={startDate} 
              visibleDays={visibleDays}
              onNavigate={handleNavigate}
              onTodayClick={handleTodayClick}
              onExpandAll={expandAllWorkspaces}
            />
            
            {/* Workspaces and projects */}
            {sortedWorkspaces.map(workspace => (
              <WorkspaceSection
                key={workspace.id}
                workspace={workspace}
                openProjectIds={openProjectIds}
                onToggleWorkspace={() => toggleWorkspace(workspace.id)}
                onToggleProject={toggleProject}
                startDate={startDate}
                visibleDays={visibleDays}
                onToggleItemComplete={toggleItemComplete}
                onItemClick={handleItemClick}
              />
            ))}
          </div>
        </div>
        
        {/* Floating Add Button */}
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="fixed bottom-4 right-4 w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center z-30"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
      
      <AddItemDialog 
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAddItem={handleAddItem}
        onAddWorkspace={addWorkspace}
        onAddProject={addProject}
        projects={allProjects}
        workspaces={workspaces}
      />

      <ItemDialog
        item={selectedItem}
        open={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        onSave={handleItemSave}
      />
    </DndContext>
  );
}
