import { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { addDays, subDays, startOfWeek } from 'date-fns';
import { TimelineHeader } from './TimelineHeader';
import { WorkspaceSection } from './WorkspaceSection';
import { useTimelineStore } from '@/hooks/useTimelineStore';
import { Plus } from 'lucide-react';
import { AddItemDialog } from './AddItemDialog';

export function Timeline() {
  const [startDate, setStartDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const visibleDays = 14;
  
  const { 
    workspaces, 
    openProjectIds, 
    toggleWorkspace, 
    toggleProject,
    updateTaskDate,
    updateNoteDate,
    updateMilestoneDate,
    toggleTaskComplete,
    addTask,
    addNote,
    addWorkspace,
    addProject,
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const dropData = over.data.current as { projectId: string; date: string } | undefined;
    if (!dropData) return;
    
    const dragData = active.data.current as { type: string; item: any } | undefined;
    if (!dragData) return;
    
    const newDate = dropData.date;
    
    switch (dragData.type) {
      case 'task':
        updateTaskDate(dragData.item.id, newDate);
        break;
      case 'note':
        updateNoteDate(dragData.item.id, newDate);
        break;
      case 'milestone':
        updateMilestoneDate(dragData.item.id, newDate);
        break;
    }
  };

  const handleAddItem = (type: 'task' | 'note' | 'diary', content: string, date: string, projectId: string) => {
    if (type === 'task') {
      addTask(projectId, content, date);
    } else {
      addNote(projectId, content, date, type);
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
        {/* Timeline */}
        <TimelineHeader 
          startDate={startDate} 
          visibleDays={visibleDays}
          onNavigate={handleNavigate}
        />
        
        <div className="flex-1 overflow-auto">
          <div className="min-w-fit">
            {sortedWorkspaces.map(workspace => (
              <WorkspaceSection
                key={workspace.id}
                workspace={workspace}
                openProjectIds={openProjectIds}
                onToggleWorkspace={() => toggleWorkspace(workspace.id)}
                onToggleProject={toggleProject}
                startDate={startDate}
                visibleDays={visibleDays}
                onToggleTaskComplete={toggleTaskComplete}
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
    </DndContext>
  );
}
