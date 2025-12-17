import { useState, useCallback } from 'react';
import { Workspace, Task, Note, Milestone } from '@/types/timeline';
import { sampleWorkspaces } from '@/data/sampleData';

export function useTimelineStore() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(sampleWorkspaces);
  const [openProjectId, setOpenProjectId] = useState<string | null>('proj-1');

  const toggleWorkspace = useCallback((workspaceId: string) => {
    setWorkspaces(prev => prev.map(ws => 
      ws.id === workspaceId ? { ...ws, isCollapsed: !ws.isCollapsed } : ws
    ));
  }, []);

  const toggleProject = useCallback((projectId: string) => {
    setOpenProjectId(prev => prev === projectId ? null : projectId);
  }, []);

  const updateTaskDate = useCallback((taskId: string, newDate: string) => {
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      projects: ws.projects.map(proj => ({
        ...proj,
        tasks: proj.tasks.map(task => 
          task.id === taskId ? { ...task, date: newDate } : task
        )
      }))
    })));
  }, []);

  const updateNoteDate = useCallback((noteId: string, newDate: string) => {
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      projects: ws.projects.map(proj => ({
        ...proj,
        notes: proj.notes.map(note => 
          note.id === noteId ? { ...note, date: newDate } : note
        )
      }))
    })));
  }, []);

  const updateMilestoneDate = useCallback((milestoneId: string, newDate: string) => {
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      projects: ws.projects.map(proj => ({
        ...proj,
        milestones: proj.milestones.map(ms => 
          ms.id === milestoneId ? { ...ms, date: newDate } : ms
        )
      }))
    })));
  }, []);

  const toggleTaskComplete = useCallback((taskId: string) => {
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      projects: ws.projects.map(proj => ({
        ...proj,
        tasks: proj.tasks.map(task => 
          task.id === taskId ? { ...task, completed: !task.completed } : task
        )
      }))
    })));
  }, []);

  const addTask = useCallback((projectId: string, title: string, date: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      date,
      completed: false,
      projectId,
    };
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      projects: ws.projects.map(proj => 
        proj.id === projectId 
          ? { ...proj, tasks: [...proj.tasks, newTask] }
          : proj
      )
    })));
  }, []);

  const addNote = useCallback((projectId: string, content: string, date: string, type: 'note' | 'diary') => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      content,
      date,
      type,
      projectId,
    };
    setWorkspaces(prev => prev.map(ws => ({
      ...ws,
      projects: ws.projects.map(proj => 
        proj.id === projectId 
          ? { ...proj, notes: [...proj.notes, newNote] }
          : proj
      )
    })));
  }, []);

  return {
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
  };
}
