import { useState, useCallback } from 'react';
import { Workspace, Project, Task, Note, Milestone } from '@/types/timeline';
import { sampleWorkspaces } from '@/data/sampleData';

export function useTimelineStore() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(sampleWorkspaces);
  const [openProjectIds, setOpenProjectIds] = useState<Set<string>>(new Set(['proj-1']));

  const toggleWorkspace = useCallback((workspaceId: string) => {
    setWorkspaces(prev => prev.map(ws => 
      ws.id === workspaceId ? { ...ws, isCollapsed: !ws.isCollapsed } : ws
    ));
  }, []);

  const toggleProject = useCallback((projectId: string, workspaceId: string) => {
    setOpenProjectIds(prev => {
      const next = new Set<string>();
      if (prev.has(projectId)) {
        // Closing this project - just remove it
        prev.forEach(id => {
          if (id !== projectId) next.add(id);
        });
      } else {
        // Opening a new project - check if from same workspace
        const newWorkspaceProjects = workspaces
          .find(ws => ws.id === workspaceId)?.projects.map(p => p.id) || [];
        
        const hasProjectFromSameWorkspace = Array.from(prev).some(id => 
          newWorkspaceProjects.includes(id)
        );
        
        if (hasProjectFromSameWorkspace) {
          // Keep existing projects from same workspace
          prev.forEach(id => {
            if (newWorkspaceProjects.includes(id)) {
              next.add(id);
            }
          });
        }
        // Otherwise close all (next stays empty except for new project)
        next.add(projectId);
      }
      return next;
    });
  }, [workspaces]);

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

  const addWorkspace = useCallback((name: string, color: number) => {
    const newWorkspace: Workspace = {
      id: `ws-${Date.now()}`,
      name,
      color,
      isCollapsed: false,
      projects: [],
    };
    setWorkspaces(prev => [...prev, newWorkspace]);
  }, []);

  const addProject = useCallback((workspaceId: string, name: string) => {
    setWorkspaces(prev => {
      const workspace = prev.find(ws => ws.id === workspaceId);
      const newProject: Project = {
        id: `proj-${Date.now()}`,
        name,
        workspaceId,
        color: workspace?.color || 1,
        milestones: [],
        tasks: [],
        notes: [],
      };
      return prev.map(ws => 
        ws.id === workspaceId 
          ? { ...ws, projects: [...ws.projects, newProject] }
          : ws
      );
    });
  }, []);

  return {
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
  };
}
