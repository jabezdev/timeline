import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Workspace, Project, TimelineItem, Milestone } from '@/types/timeline';
import { sampleWorkspaces } from '@/data/sampleData';

interface TimelineStore {
  workspaces: Workspace[];
  openProjectIds: Set<string>;
  
  // Actions
  toggleWorkspace: (id: string) => void;
  toggleProject: (projectId: string, workspaceId: string) => void;
  updateItemDate: (itemId: string, newDate: string) => void;
  updateMilestoneDate: (milestoneId: string, newDate: string) => void;
  updateMilestone: (milestoneId: string, updates: Partial<Milestone>) => void;
  toggleItemComplete: (itemId: string) => void;
  addItem: (projectId: string, title: string, date: string) => void;
  updateItem: (itemId: string, updates: Partial<TimelineItem>) => void;
  addWorkspace: (name: string, color: number) => void;
  addProject: (workspaceId: string, name: string) => void;
  expandAllWorkspaces: () => void;
}

export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set, get) => ({
      workspaces: sampleWorkspaces,
      openProjectIds: new Set(['proj-1']),

      expandAllWorkspaces: () => set((state) => ({
        workspaces: state.workspaces.map(ws => ({ ...ws, isCollapsed: false }))
      })),

      toggleWorkspace: (id) => set((state) => ({
        workspaces: state.workspaces.map(ws => 
          ws.id === id ? { ...ws, isCollapsed: !ws.isCollapsed } : ws
        )
      })),

      toggleProject: (projectId, workspaceId) => set((state) => {
        const prev = state.openProjectIds;
        const next = new Set<string>();
        
        if (prev.has(projectId)) {
          // Closing this project - just remove it
          prev.forEach(id => {
            if (id !== projectId) next.add(id);
          });
          return { openProjectIds: next };
        } else {
          // Opening a new project
          next.add(projectId);
          
          // Collapse all other workspaces, expand the current one
          const newWorkspaces = state.workspaces.map(ws => ({
            ...ws,
            isCollapsed: ws.id !== workspaceId
          }));
          
          return { 
            openProjectIds: next,
            workspaces: newWorkspaces
          };
        }
      }),

      updateItemDate: (itemId, newDate) => set((state) => ({
        workspaces: state.workspaces.map(ws => ({
          ...ws,
          projects: ws.projects.map(proj => ({
            ...proj,
            items: proj.items.map(item => 
              item.id === itemId ? { ...item, date: newDate } : item
            )
          }))
        }))
      })),

      updateMilestoneDate: (milestoneId, newDate) => set((state) => ({
        workspaces: state.workspaces.map(ws => ({
          ...ws,
          projects: ws.projects.map(proj => ({
            ...proj,
            milestones: proj.milestones.map(ms => 
              ms.id === milestoneId ? { ...ms, date: newDate } : ms
            )
          }))
        }))
      })),

      updateMilestone: (milestoneId, updates) => set((state) => ({
        workspaces: state.workspaces.map(ws => ({
          ...ws,
          projects: ws.projects.map(proj => ({
            ...proj,
            milestones: proj.milestones.map(ms => 
              ms.id === milestoneId ? { ...ms, ...updates } : ms
            )
          }))
        }))
      })),

      toggleItemComplete: (itemId) => set((state) => ({
        workspaces: state.workspaces.map(ws => ({
          ...ws,
          projects: ws.projects.map(proj => ({
            ...proj,
            items: proj.items.map(item => 
              item.id === itemId ? { ...item, completed: !item.completed } : item
            )
          }))
        }))
      })),

      addItem: (projectId, title, date) => set((state) => {
        const newItem: TimelineItem = {
          id: `item-${Date.now()}`,
          title,
          content: '',
          date,
          completed: false,
          projectId,
        };
        return {
          workspaces: state.workspaces.map(ws => ({
            ...ws,
            projects: ws.projects.map(proj => 
              proj.id === projectId 
                ? { ...proj, items: [...proj.items, newItem] }
                : proj
            )
          }))
        };
      }),

      updateItem: (itemId, updates) => set((state) => ({
        workspaces: state.workspaces.map(ws => ({
          ...ws,
          projects: ws.projects.map(proj => ({
            ...proj,
            items: proj.items.map(item => 
              item.id === itemId ? { ...item, ...updates } : item
            )
          }))
        }))
      })),

      addWorkspace: (name, color) => set((state) => {
        const newWorkspace: Workspace = {
          id: `ws-${Date.now()}`,
          name,
          color,
          isCollapsed: false,
          projects: [],
        };
        return { workspaces: [...state.workspaces, newWorkspace] };
      }),

      addProject: (workspaceId, name) => set((state) => {
        const workspace = state.workspaces.find(ws => ws.id === workspaceId);
        const newProject: Project = {
          id: `proj-${Date.now()}`,
          name,
          workspaceId,
          color: workspace?.color || 1,
          milestones: [],
          items: [],
        };
        return {
          workspaces: state.workspaces.map(ws => 
            ws.id === workspaceId 
              ? { ...ws, projects: [...ws.projects, newProject] }
              : ws
          )
        };
      }),
    }),
    {
      name: 'timeline-storage',
      partialize: (state) => ({ workspaces: state.workspaces }),
    }
  )
);
