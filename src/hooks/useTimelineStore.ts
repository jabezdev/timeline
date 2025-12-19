import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Workspace, Project, TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { sampleWorkspaces } from '@/data/sampleData';
import { differenceInDays, parseISO, addDays, format } from 'date-fns';

interface TimelineStore {
  workspaces: Workspace[];
  openProjectIds: Set<string>;
  projectHeights: Map<string, number>; // Registry for actual rendered heights
  
  // Actions
  toggleWorkspace: (id: string) => void;
  toggleProject: (projectId: string, workspaceId: string) => void;
  updateItemDate: (itemId: string, newDate: string) => void;
  updateMilestoneDate: (milestoneId: string, newDate: string) => void;
  updateMilestone: (milestoneId: string, updates: Partial<Milestone>) => void;
  toggleItemComplete: (itemId: string) => void;
  addItem: (projectId: string, title: string, date: string, subProjectId?: string) => void;
  updateItem: (itemId: string, updates: Partial<TimelineItem>) => void;
  addWorkspace: (name: string, color: number) => void;
  addProject: (workspaceId: string, name: string) => void;
  expandAllWorkspaces: () => void;
  addSubProject: (projectId: string, title: string, startDate: string, endDate: string) => void;
  updateSubProjectDate: (subProjectId: string, newStartDate: string) => void;
  updateSubProject: (subProjectId: string, updates: Partial<SubProject>) => void;
  setProjectHeight: (projectId: string, height: number) => void;
  addMilestone: (projectId: string, title: string, date: string) => void;
  reorderWorkspaces: (workspaceIds: string[]) => void;
  reorderProjects: (workspaceId: string, projectIds: string[]) => void;
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteWorkspace: (workspaceId: string) => void;
  deleteProject: (projectId: string) => void;
}

export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set, get) => ({
      workspaces: sampleWorkspaces,
      openProjectIds: new Set(['proj-1']),
      projectHeights: new Map<string, number>(),

      setProjectHeight: (projectId, height) => set((state) => {
        const newHeights = new Map(state.projectHeights);
        if (newHeights.get(projectId) !== height) {
          newHeights.set(projectId, height);
          return { projectHeights: newHeights };
        }
        return state;
      }),

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

      addItem: (projectId, title, date, subProjectId) => set((state) => {
        const newItem: TimelineItem = {
          id: `item-${Date.now()}`,
          title,
          content: '',
          date,
          completed: false,
          projectId,
          subProjectId,
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
          subProjects: [],
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

      addSubProject: (projectId, title, startDate, endDate) => set((state) => {
        const newSubProject: SubProject = {
            id: `sub-${Date.now()}`,
            title,
            startDate,
            endDate,
            projectId
        };
        return {
            workspaces: state.workspaces.map(ws => ({
                ...ws,
                projects: ws.projects.map(proj => 
                    proj.id === projectId
                    ? { ...proj, subProjects: [...(proj.subProjects || []), newSubProject] }
                    : proj
                )
            }))
        }
      }),

      updateSubProject: (subProjectId, updates) => set((state) => {
        // Find the original subproject to compare dates
        let originalSubProject: SubProject | undefined;
        let projectId = '';
        
        state.workspaces.forEach(ws => {
          ws.projects.forEach(proj => {
            const sub = proj.subProjects?.find(s => s.id === subProjectId);
            if (sub) {
              originalSubProject = sub;
              projectId = proj.id;
            }
          });
        });

        if (!originalSubProject) return state;

        // Check if dates are changing
        const newStartDate = updates.startDate || originalSubProject.startDate;
        const newEndDate = updates.endDate || originalSubProject.endDate;
        const oldStartDate = originalSubProject.startDate;
        const oldEndDate = originalSubProject.endDate;
        
        const startDateChanged = newStartDate !== oldStartDate;
        const endDateChanged = newEndDate !== oldEndDate;

        // Calculate the shift for items if start date changed
        const daysDiff = startDateChanged 
          ? differenceInDays(parseISO(newStartDate), parseISO(oldStartDate))
          : 0;

        return {
          workspaces: state.workspaces.map(ws => ({
            ...ws,
            projects: ws.projects.map(proj => {
              if (proj.id !== projectId) return proj;

              // Update the subproject
              const updatedSubProjects = proj.subProjects?.map(sub => 
                sub.id === subProjectId ? { ...sub, ...updates } : sub
              ) || [];

              // Update items if dates changed
              let updatedItems = proj.items;
              
              if (startDateChanged || endDateChanged) {
                updatedItems = proj.items.map(item => {
                  if (item.subProjectId !== subProjectId) return item;
                  
                  const itemDate = parseISO(item.date);
                  const newSubStart = parseISO(newStartDate);
                  const newSubEnd = parseISO(newEndDate);
                  
                  if (startDateChanged && daysDiff !== 0) {
                    // Shift item date by the same amount as the start date shift
                    let newItemDate = addDays(itemDate, daysDiff);
                    
                    // Clamp to new subproject bounds
                    if (newItemDate < newSubStart) newItemDate = newSubStart;
                    if (newItemDate > newSubEnd) newItemDate = newSubEnd;
                    
                    return { ...item, date: format(newItemDate, 'yyyy-MM-dd') };
                  } else if (endDateChanged && !startDateChanged) {
                    // Only end date changed - clamp items that are now outside
                    if (itemDate > newSubEnd) {
                      return { ...item, date: format(newSubEnd, 'yyyy-MM-dd') };
                    }
                  }
                  
                  return item;
                });
              }

              return { ...proj, subProjects: updatedSubProjects, items: updatedItems };
            })
          }))
        };
      }),

      updateSubProjectDate: (subProjectId, newStartDate) => set((state) => {
        let oldStartDate = '';
        let projectId = '';
        
        state.workspaces.forEach(ws => {
            ws.projects.forEach(proj => {
                const sub = proj.subProjects?.find(s => s.id === subProjectId);
                if (sub) {
                    oldStartDate = sub.startDate;
                    projectId = proj.id;
                }
            })
        });

        if (!oldStartDate) return state;

        const daysDiff = differenceInDays(parseISO(newStartDate), parseISO(oldStartDate));

        return {
            workspaces: state.workspaces.map(ws => ({
                ...ws,
                projects: ws.projects.map(proj => {
                    if (proj.id !== projectId) return proj;

                    const updatedSubProjects = proj.subProjects?.map(sub => {
                        if (sub.id !== subProjectId) return sub;
                        const newEndDate = format(addDays(parseISO(sub.endDate), daysDiff), 'yyyy-MM-dd');
                        return { ...sub, startDate: newStartDate, endDate: newEndDate };
                    }) || [];

                    const updatedItems = proj.items.map(item => {
                        if (item.subProjectId !== subProjectId) return item;
                        const newItemDate = format(addDays(parseISO(item.date), daysDiff), 'yyyy-MM-dd');
                        return { ...item, date: newItemDate };
                    });

                    return { ...proj, subProjects: updatedSubProjects, items: updatedItems };
                })
            }))
        };
      }),

      addMilestone: (projectId, title, date) => set((state) => {
        const newMilestone: Milestone = {
          id: `ms-${Date.now()}`,
          title,
          date,
          projectId,
        };
        return {
          workspaces: state.workspaces.map(ws => ({
            ...ws,
            projects: ws.projects.map(proj =>
              proj.id === projectId
                ? { ...proj, milestones: [...proj.milestones, newMilestone] }
                : proj
            )
          }))
        };
      }),

      reorderWorkspaces: (workspaceIds) => set((state) => {
        const workspaceMap = new Map(state.workspaces.map(ws => [ws.id, ws]));
        const reordered = workspaceIds
          .map(id => workspaceMap.get(id))
          .filter((ws): ws is Workspace => ws !== undefined);
        return { workspaces: reordered };
      }),

      reorderProjects: (workspaceId, projectIds) => set((state) => ({
        workspaces: state.workspaces.map(ws => {
          if (ws.id !== workspaceId) return ws;
          const projectMap = new Map(ws.projects.map(p => [p.id, p]));
          const reordered = projectIds
            .map(id => projectMap.get(id))
            .filter((p): p is Project => p !== undefined);
          return { ...ws, projects: reordered };
        })
      })),

      updateWorkspace: (workspaceId, updates) => set((state) => ({
        workspaces: state.workspaces.map(ws =>
          ws.id === workspaceId ? { ...ws, ...updates } : ws
        )
      })),

      updateProject: (projectId, updates) => set((state) => ({
        workspaces: state.workspaces.map(ws => ({
          ...ws,
          projects: ws.projects.map(proj =>
            proj.id === projectId ? { ...proj, ...updates } : proj
          )
        }))
      })),

      deleteWorkspace: (workspaceId) => set((state) => ({
        workspaces: state.workspaces.filter(ws => ws.id !== workspaceId)
      })),

      deleteProject: (projectId) => set((state) => ({
        workspaces: state.workspaces.map(ws => ({
          ...ws,
          projects: ws.projects.filter(p => p.id !== projectId)
        }))
      })),
    }),
    {
      name: 'timeline-storage',
      partialize: (state) => ({ workspaces: state.workspaces, openProjectIds: state.openProjectIds }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Convert openProjectIds array back to Set
          if (parsed.state?.openProjectIds) {
            parsed.state.openProjectIds = new Set(parsed.state.openProjectIds);
          }
          return parsed;
        },
        setItem: (name, value) => {
          // Convert Set to array for JSON serialization
          const toStore = {
            ...value,
            state: {
              ...value.state,
              openProjectIds: value.state?.openProjectIds instanceof Set 
                ? Array.from(value.state.openProjectIds) 
                : value.state?.openProjectIds || []
            }
          };
          localStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
