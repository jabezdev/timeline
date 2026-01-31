import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Cache entry for project height with content hash for invalidation
interface ProjectHeightCache {
  height: number;
  contentHash: string; // e.g., "items:5-subprojects:2" to detect when recalculation is needed
}

interface TimelineStore {
  // UI State
  openProjectIds: string[];
  collapsedWorkspaceIds: string[];
  isSidebarCollapsed: boolean;
  projectHeights: Record<string, number>;
  
  // Performance: Cached project heights with content hash
  cachedProjectHeights: Record<string, ProjectHeightCache>;

  // UI Actions
  toggleWorkspace: (workspaceId: string) => void;
  setAllWorkspacesCollapsed: (collapsed: boolean, allWorkspaceIds: string[]) => void;
  toggleProject: (projectId: string, workspaceId: string, allWorkspaceIds: string[]) => void;

  setSidebarCollapsed: (collapsed: boolean) => void;
  setProjectHeight: (projectId: string, height: number) => void;
  
  // Performance: Set cached height with content hash
  setCachedProjectHeight: (projectId: string, height: number, contentHash: string) => void;
  getCachedProjectHeight: (projectId: string, contentHash: string) => number | null;
}

export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set, get) => ({
      openProjectIds: [],
      collapsedWorkspaceIds: [],
      isSidebarCollapsed: false,
      projectHeights: {},
      cachedProjectHeights: {},

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

          // Always toggle, never clear others
          const newOpenIds = isOpen
            ? state.openProjectIds.filter(id => id !== projectId)
            : [...state.openProjectIds, projectId];

          // Ensure parent workspace is expanded if opening
          // We don't force collapse others anymore as per user request ("Allow multiple open projects...")
          const newCollapsedIds = !isOpen
            ? state.collapsedWorkspaceIds.filter(id => id !== workspaceId)
            : state.collapsedWorkspaceIds;

          return {
            openProjectIds: newOpenIds,
            collapsedWorkspaceIds: newCollapsedIds
          };
        }),

      setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),

      setProjectHeight: (projectId, height) =>
        set((state) => {
          if (state.projectHeights[projectId] === height) return state;
          return {
            projectHeights: { ...state.projectHeights, [projectId]: height },
          };
        }),
      
      // Performance: Set cached height with content hash for invalidation
      setCachedProjectHeight: (projectId, height, contentHash) =>
        set((state) => {
          const existing = state.cachedProjectHeights[projectId];
          if (existing && existing.height === height && existing.contentHash === contentHash) {
            return state; // No change
          }
          return {
            cachedProjectHeights: {
              ...state.cachedProjectHeights,
              [projectId]: { height, contentHash }
            }
          };
        }),
      
      // Performance: Get cached height if content hash matches
      getCachedProjectHeight: (projectId, contentHash) => {
        const state = get();
        const cached = state.cachedProjectHeights[projectId];
        if (cached && cached.contentHash === contentHash) {
          return cached.height;
        }
        return null;
      },
    }),
    {
      name: 'timeline-ui-storage',
      partialize: (state) => ({
        openProjectIds: state.openProjectIds,
        collapsedWorkspaceIds: state.collapsedWorkspaceIds,
        isSidebarCollapsed: state.isSidebarCollapsed,
        // Don't persist cached heights - they're runtime only
      }),
    }
  )
);
