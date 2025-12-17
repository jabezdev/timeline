import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { addDays, subDays, startOfWeek, format } from 'date-fns';
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
    openProjectId, 
    toggleWorkspace, 
    toggleProject,
    updateTaskDate,
    updateNoteDate,
    updateMilestoneDate,
    toggleTaskComplete,
    addTask,
    addNote,
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
    setIsAddDialogOpen(false);
  };

  // Get all projects for the add dialog
  const allProjects = workspaces.flatMap(ws => 
    ws.projects.map(p => ({ ...p, workspaceName: ws.name }))
  );

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col bg-background">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Timeline</h1>
            <p className="text-sm text-muted-foreground">Your productivity flow, visualized</p>
          </div>
          
          <button
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </header>

        {/* Timeline */}
        <div className="flex-1 overflow-auto">
          <TimelineHeader 
            startDate={startDate} 
            visibleDays={visibleDays}
            onNavigate={handleNavigate}
          />
          
          <div className="min-w-fit">
            {workspaces.map(workspace => (
              <WorkspaceSection
                key={workspace.id}
                workspace={workspace}
                openProjectId={openProjectId}
                onToggleWorkspace={() => toggleWorkspace(workspace.id)}
                onToggleProject={toggleProject}
                startDate={startDate}
                visibleDays={visibleDays}
                onToggleTaskComplete={toggleTaskComplete}
              />
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-6 px-6 py-3 border-t border-border bg-secondary/20">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-milestone" />
            <span className="text-xs text-muted-foreground">Milestone</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-task" />
            <span className="text-xs text-muted-foreground">Task</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-note" />
            <span className="text-xs text-muted-foreground">Note</span>
          </div>
          <span className="text-xs text-muted-foreground ml-auto">
            Drag items to reschedule • Click checkboxes to complete tasks
          </span>
        </div>
      </div>
      
      <AddItemDialog 
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddItem}
        projects={allProjects}
      />
    </DndContext>
  );
}
