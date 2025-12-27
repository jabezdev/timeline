import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TimelineStore {
  // UI State
  openProjectIds: string[];
  collapsedWorkspaceIds: string[];
  isSidebarCollapsed: boolean;
  projectHeights: Record<string, number>;

  // UI Actions
  toggleWorkspace: (workspaceId: string) => void;
  setAllWorkspacesCollapsed: (collapsed: boolean, allWorkspaceIds: string[]) => void;
  toggleProject: (projectId: string, workspaceId: string, allWorkspaceIds: string[]) => void;

  setSidebarCollapsed: (collapsed: boolean) => void;
  setProjectHeight: (projectId: string, height: number) => void;
}

export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set) => ({
      openProjectIds: [],
      collapsedWorkspaceIds: [],
      isSidebarCollapsed: false,
      projectHeights: {},

      toggleWorkspace: (workspaceId) =>
        set((state) => {
          const isCollapsed = state.collapsedWorkspaceIds.includes(workspaceId);
          return {
            collapsedWorkspaceIds: isCollapsed
              ? state.collapsedWorkspaceIds.filter((id) => id !== workspaceId)
              : [...state.collapsedWorkspaceIds, workspaceId],
          };
        }),

      setAllWorkspacesCollapsed: (collapsed, allWorkspaceIds) =>
        set((state) => ({
          collapsedWorkspaceIds: collapsed ? allWorkspaceIds : [],
          openProjectIds: collapsed ? [] : state.openProjectIds, // Close projects if collapsing workspaces? Yes.
        })),

      toggleProject: (projectId, workspaceId, allWorkspaceIds) =>
        set((state) => {
          const isOpen = state.openProjectIds.includes(projectId);

          if (isOpen) {
            // Close project
            return {
              openProjectIds: [],
            };
          } else {
            // Open project: Close all others, Expand parent workspace, Collapse other workspaces
            return {
              openProjectIds: [projectId],
              collapsedWorkspaceIds: allWorkspaceIds.filter(id => id !== workspaceId)
            };
          }
        }),

      setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),

      setProjectHeight: (projectId, height) =>
        set((state) => {
          if (state.projectHeights[projectId] === height) return {}; // No change, return empty (Zustand merges partial, but returning empty object or null typically stops update if using standard set patterns? Wait, zustand set merges. returning empty means no changes to properties. BUT it might still trigger listener? simpler to return state or nothing if logic allows)
          // Verify zustand behavior: set(partial) merges. If partial is empty, Reference might not change? 
          // Better:
          if (state.projectHeights[projectId] === height) return state; // Returning state directly prevents update if strict equality check is used by zustand (v4+ usually does Object.is check)

          return {
            projectHeights: { ...state.projectHeights, [projectId]: height },
          };
        }),
    }),
    {
      name: 'timeline-ui-storage',
      partialize: (state) => ({
        openProjectIds: state.openProjectIds,
        collapsedWorkspaceIds: state.collapsedWorkspaceIds,
        isSidebarCollapsed: state.isSidebarCollapsed,
      }),
    }
  )
);
