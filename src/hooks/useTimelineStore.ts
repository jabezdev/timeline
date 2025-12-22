import { create } from 'zustand';
// persist middleware removed in favor of manual Dexie sync
import { Workspace, Project, TimelineItem, Milestone, SubProject, TimelineState } from '@/types/timeline';
import { differenceInDays, parseISO, addDays, format, startOfWeek } from 'date-fns';
import { api } from '@/lib/api';
import { db } from '@/lib/db';
import { toast } from 'sonner';

interface TimelineActions {
  // Actions
  toggleWorkspace: (id: string) => void;
  toggleProject: (projectId: string, workspaceId: string) => void;
  updateItemDate: (itemId: string, newDate: string) => void;
  updateMilestoneDate: (milestoneId: string, newDate: string) => void;
  updateMilestone: (milestoneId: string, updates: Partial<Milestone>) => void;
  toggleItemComplete: (itemId: string) => void;
  addItem: (projectId: string, title: string, date: string, subProjectId?: string, color?: number) => void;
  updateItem: (itemId: string, updates: Partial<TimelineItem>) => void;
  addWorkspace: (name: string, color: number) => void;
  addProject: (workspaceId: string, name: string) => void;
  expandAllWorkspaces: () => void;
  addSubProject: (projectId: string, title: string, startDate: string, endDate: string, color?: number) => void;
  updateSubProjectDate: (subProjectId: string, newStartDate: string) => void;
  updateSubProject: (subProjectId: string, updates: Partial<SubProject>) => void;
  setProjectHeight: (projectId: string, height: number) => void;
  addMilestone: (projectId: string, title: string, date: string, color?: number) => void;
  reorderWorkspaces: (workspaceIds: string[]) => void;
  reorderProjects: (workspaceId: string, projectIds: string[]) => void;
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteWorkspace: (workspaceId: string) => void;
  deleteProject: (projectId: string) => void;
  deleteSubProject: (subProjectId: string, deleteItems: boolean) => void;
  deleteMilestone: (milestoneId: string) => void;
  deleteItem: (itemId: string) => void;
  sync: () => Promise<void>;
  fetchRange: (startDate: string, endDate: string) => Promise<void>;
  loadFromLocal: () => Promise<void>;
  syncRemoteData: (data: Partial<TimelineState>) => void;
  syncRangeData: (data: Partial<TimelineState>, range: { startDate: string, endDate: string }) => void;
}

type TimelineStore = TimelineState & TimelineActions & {
  projectHeights: Map<string, number>;
  setProjectHeight: (projectId: string, height: number) => void;
};

export const useTimelineStore = create<TimelineStore>()(
  (set, get) => ({
    workspaces: {},
    workspaceOrder: [],
    projects: {},
    subProjects: {},
    milestones: {},
    items: {},
    openProjectIds: [],
    visibleDays: 14,
    currentDate: new Date().toISOString().split('T')[0],
    isSyncing: false,

    projectHeights: new Map<string, number>(),

    setProjectHeight: (projectId, height) => set((state) => {
      const newHeights = new Map(state.projectHeights);
      if (newHeights.get(projectId) !== height) {
        newHeights.set(projectId, height);
        return { projectHeights: newHeights };
      }
      return state;
    }),

    expandAllWorkspaces: () => set((state) => {
      const allExpanded = Object.values(state.workspaces).every(ws => !ws.isCollapsed);

      const newWorkspaces = { ...state.workspaces };
      Object.keys(newWorkspaces).forEach(id => {
        newWorkspaces[id] = { ...newWorkspaces[id], isCollapsed: allExpanded };
      });

      // "When the button is pressed, the active project should be closed."
      return {
        workspaces: newWorkspaces,
        openProjectIds: []
      };
    }),

    toggleWorkspace: (id) => set((state) => {
      const ws = state.workspaces[id];
      if (!ws) return state;
      // Local only - do not sync isCollapsed to server
      db.workspaces.update(id, { isCollapsed: !ws.isCollapsed }).catch(e => toast.error("Failed to save state", { description: e.message }));
      return {
        workspaces: {
          ...state.workspaces,
          [id]: { ...ws, isCollapsed: !ws.isCollapsed }
        }
      };
    }),

    toggleProject: (projectId, workspaceId) => set((state) => {
      const isOpen = state.openProjectIds.includes(projectId);

      if (isOpen) {
        // Closing the project
        return { openProjectIds: [] };
      } else {
        // Opening a project
        // "When a project is pressed all the other workspaces should be collapsed."
        // "make sure that only 1 project is open at a time"

        const newWorkspaces = { ...state.workspaces };
        Object.keys(newWorkspaces).forEach(id => {
          // Collapse all workspaces except the one containing this project
          newWorkspaces[id] = {
            ...newWorkspaces[id],
            isCollapsed: id !== workspaceId
          };
        });

        return {
          openProjectIds: [projectId],
          workspaces: newWorkspaces
        };
      }
    }),

    updateItemDate: (itemId, newDate) => set((state) => {
      const item = state.items[itemId];
      if (!item) return state;
      const updates = { date: newDate, updatedAt: new Date().toISOString() };
      api.updateItem(itemId, updates).catch(e => toast.error("Failed to update item date", { description: e.message }));
      db.items.update(itemId, updates).catch(e => console.error(e));
      return {
        items: {
          ...state.items,
          [itemId]: { ...item, ...updates }
        }
      };
    }),

    updateMilestoneDate: (milestoneId, newDate) => set((state) => {
      const ms = state.milestones[milestoneId];
      if (!ms) return state;
      const updates = { date: newDate, updatedAt: new Date().toISOString() };
      api.updateMilestone(milestoneId, updates).catch(e => toast.error("Failed to update milestone date", { description: e.message }));
      return {
        milestones: {
          ...state.milestones,
          [milestoneId]: { ...ms, ...updates }
        }
      };
    }),

    updateMilestone: (milestoneId, updates) => set((state) => {
      const ms = state.milestones[milestoneId];
      if (!ms) return state;
      const fullUpdates = { ...updates, updatedAt: new Date().toISOString() };
      api.updateMilestone(milestoneId, fullUpdates).catch(e => toast.error("Failed to update milestone", { description: e.message }));
      db.milestones.update(milestoneId, fullUpdates).catch(e => console.error(e));
      return {
        milestones: {
          ...state.milestones,
          [milestoneId]: { ...ms, ...fullUpdates }
        }
      };
    }),

    toggleItemComplete: (itemId) => set((state) => {
      const item = state.items[itemId];
      if (!item) return state;
      const newCompleted = !item.completed;
      const updates: Partial<TimelineItem> = {
        completed: newCompleted,
        completedAt: newCompleted ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString()
      };

      api.updateItem(itemId, updates).catch(e => toast.error("Failed to toggle completion", { description: e.message }));
      db.items.update(itemId, updates).catch(e => console.error(e));
      return {
        items: {
          ...state.items,
          [itemId]: { ...item, ...updates }
        }
      };
    }),

    addItem: (projectId, title, date, subProjectId, color) => set((state) => {
      const id = `item-${Date.now()}`;
      const newItem: TimelineItem = {
        id,
        title,
        content: '',
        date,
        completed: false,
        projectId,
        subProjectId,
        color: color ? String(color) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      api.createItem(newItem).then(() => toast.success("Item created")).catch(e => toast.error("Failed to create item", { description: e.message }));
      db.items.add(newItem).catch(e => console.error(e));
      return {
        items: { ...state.items, [id]: newItem }
      };
    }),

    updateItem: (itemId, updates) => set((state) => {
      const item = state.items[itemId];
      if (!item) return state;

      const fullUpdates = { ...updates, updatedAt: new Date().toISOString() };

      // Handle completedAt logic logic if 'completed' status is changing
      if ('completed' in updates) {
        if (updates.completed && !item.completed) {
          // Marking as complete
          (fullUpdates as any).completedAt = new Date().toISOString();
        } else if (updates.completed === false && item.completed) {
          // Unmarking
          (fullUpdates as any).completedAt = null;
        }
      }

      api.updateItem(itemId, fullUpdates).catch(e => toast.error("Failed to update item", { description: e.message }));
      db.items.update(itemId, fullUpdates).catch(e => console.error(e));
      return {
        items: {
          ...state.items,
          [itemId]: { ...item, ...fullUpdates }
        }
      };
    }),

    addWorkspace: (name, color) => set((state) => {
      const id = `ws-${Date.now()}`;
      const newWorkspace: Workspace = {
        id,
        name,
        color,
        isCollapsed: false,
      };

      api.createWorkspace(newWorkspace).then(() => toast.success("Workspace created")).catch(e => toast.error("Failed to create workspace", { description: e.message }));
      db.workspaces.add(newWorkspace).catch(e => console.error(e));

      // Also update order (only workspaceOrder is synced now)
      const newOrder = [...state.workspaceOrder, id];
      api.saveSettings(newOrder).catch(e => console.error("Save Settings Failed:", e));
      db.userSettings.put({ userId: 'current', workspaceOrder: newOrder, openProjectIds: state.openProjectIds }).catch(e => console.error(e));

      return {
        workspaces: { ...state.workspaces, [id]: newWorkspace },
        workspaceOrder: newOrder
      };
    }),

    addProject: (workspaceId, name) => set((state) => {
      const workspace = state.workspaces[workspaceId];
      if (!workspace) return state;

      const id = `proj-${crypto.randomUUID()}`;

      // Calculate position: max current position + 1000
      const workspaceProjects = Object.values(state.projects).filter(p => p.workspaceId === workspaceId);
      const maxPos = workspaceProjects.reduce((max, p) => Math.max(max, p.position || 0), 0);

      const newProject: Project = {
        id,
        name,
        workspaceId,
        color: workspace.color,
        position: maxPos + 10000, // Large gap for easier interleaving if we ever do float math, but integer matches DB.
      };

      api.createProject(newProject).then(() => toast.success("Project created")).catch(e => toast.error("Failed to create project", { description: e.message }));

      return {
        projects: { ...state.projects, [id]: newProject },
      };
    }),

    addSubProject: (projectId, title, startDate, endDate, color) => set((state) => {
      const id = `sub-${Date.now()}`;
      const newSub: SubProject = {
        id,
        title,
        startDate,
        endDate,
        projectId,
        color: color ? String(color) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      api.createSubProject(newSub).then(() => toast.success("Sub-project created")).catch(e => toast.error("Failed to create sub-project", { description: e.message }));
      db.subProjects.add(newSub).catch(e => console.error(e));
      return {
        subProjects: { ...state.subProjects, [id]: newSub }
      };
    }),

    updateSubProject: (subProjectId, updates) => set((state) => {
      const sub = state.subProjects[subProjectId];
      if (!sub) return state;

      const newStartDate = updates.startDate || sub.startDate;
      const newEndDate = updates.endDate || sub.endDate;
      const oldStartDate = sub.startDate;

      const startDateChanged = newStartDate !== oldStartDate;
      const endDateChanged = updates.endDate && updates.endDate !== sub.endDate;
      const daysDiff = startDateChanged
        ? differenceInDays(parseISO(newStartDate), parseISO(oldStartDate))
        : 0;

      // Update the subproject itself
      const fullUpdates = { ...updates, updatedAt: new Date().toISOString() };
      const updatedSubProjects = {
        ...state.subProjects,
        [subProjectId]: { ...sub, ...fullUpdates }
      };

      api.updateSubProject(subProjectId, fullUpdates).catch(e => toast.error("Failed to update sub-project", { description: e.message }));
      db.subProjects.update(subProjectId, fullUpdates).catch(e => console.error(e));

      // If dates didn't change, just return updated subprojects

      // If dates didn't change, just return updated subprojects
      if (!startDateChanged && !endDateChanged) {
        return { subProjects: updatedSubProjects };
      }

      // Shift/Clamp Items
      const updatedItems = { ...state.items };
      const newSubStart = parseISO(newStartDate);
      const newSubEnd = parseISO(newEndDate);

      // Iterate only items belonging to this subproject
      // In a real DB we'd query. In normalized state, we iterate Object.values or entries.
      Object.values(updatedItems).forEach(item => {
        if (item.subProjectId !== subProjectId) return;

        const itemDate = parseISO(item.date);
        let newItemDateStr = item.date;

        if (startDateChanged && daysDiff !== 0) {
          // Shift item date
          let newItemDate = addDays(itemDate, daysDiff);
          // Clamp
          if (newItemDate < newSubStart) newItemDate = newSubStart;
          if (newItemDate > newSubEnd) newItemDate = newSubEnd;
          newItemDateStr = format(newItemDate, 'yyyy-MM-dd');
        } else if (endDateChanged) {
          // Only end date changed - clamp
          if (itemDate > newSubEnd) {
            newItemDateStr = format(newSubEnd, 'yyyy-MM-dd');
          }
        }

        if (newItemDateStr !== item.date) {
          const newItem = { ...item, date: newItemDateStr };
          updatedItems[item.id] = newItem;
          // SYNC ITEM CHANGE
          api.updateItem(item.id, { date: newItemDateStr }).catch(e => console.error(e));
          db.items.update(item.id, { date: newItemDateStr }).catch(e => console.error(e));
        }
      });

      return {
        subProjects: updatedSubProjects,
        items: updatedItems
      };
    }),

    updateSubProjectDate: (subProjectId, newStartDate) => set((state) => {
      const sub = state.subProjects[subProjectId];
      if (!sub) return state;

      const oldStartDate = sub.startDate;
      const daysDiff = differenceInDays(parseISO(newStartDate), parseISO(oldStartDate));
      const newEndDate = format(addDays(parseISO(sub.endDate), daysDiff), 'yyyy-MM-dd');

      const updatedSub = { ...sub, startDate: newStartDate, endDate: newEndDate, updatedAt: new Date().toISOString() };
      const updatedSubProjects = { ...state.subProjects, [subProjectId]: updatedSub };

      // Shift items
      const updatedItems = { ...state.items };
      Object.values(updatedItems).forEach(item => {
        if (item.subProjectId !== subProjectId) return;
        const newItemDate = format(addDays(parseISO(item.date), daysDiff), 'yyyy-MM-dd');
        updatedItems[item.id] = { ...item, date: newItemDate, updatedAt: new Date().toISOString() };

        // SYNC ITEM CHANGE
        api.updateItem(item.id, { date: newItemDate, updatedAt: new Date().toISOString() }).catch(e => console.error(e));
        db.items.update(item.id, { date: newItemDate, updatedAt: new Date().toISOString() }).catch(e => console.error(e));
      });

      // SYNC SUBPROJECT ITSELF (Important: Update start/end date on server)
      api.updateSubProject(subProjectId, { startDate: newStartDate, endDate: newEndDate, updatedAt: new Date().toISOString() }).catch(e => toast.error("Failed to update date", { description: e.message }));
      db.subProjects.update(subProjectId, { startDate: newStartDate, endDate: newEndDate, updatedAt: new Date().toISOString() }).catch(e => console.error(e));

      return {
        subProjects: updatedSubProjects,
        items: updatedItems
      };
    }),

    addMilestone: (projectId, title, date, color) => set((state) => {
      const id = `ms-${Date.now()}`;
      const newMilestone: Milestone = {
        id,
        title,
        date,
        projectId,
        color: color ? String(color) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      api.createMilestone(newMilestone).then(() => toast.success("Milestone created")).catch(e => toast.error("Failed to create milestone", { description: e.message }));
      db.milestones.add(newMilestone).catch(e => console.error(e));
      return {
        milestones: { ...state.milestones, [id]: newMilestone }
      };
    }),



    reorderWorkspaces: (workspaceIds) => set((state) => {
      return { workspaceOrder: workspaceIds };
    }),

    reorderProjects: (workspaceId, projectIds) => set((state) => {
      // projectIds is the ordered list of IDs
      const newProjects = { ...state.projects };
      const updates: Partial<Project>[] = [];

      projectIds.forEach((pid, index) => {
        if (newProjects[pid]) {
          const newPos = index * 10000;
          newProjects[pid] = { ...newProjects[pid], position: newPos };
          updates.push({ id: pid, position: newPos, workspaceId }); // workspaceId safety
        }
      });

      api.reorderProjects(updates).catch(e => toast.error("Failed to reorder projects", { description: e.message }));

      // Batch update local DB
      db.transaction('rw', db.projects, async () => {
        await Promise.all(updates.map(u => db.projects.update(u.id as string, { position: u.position })));
      }).catch(e => console.error(e));

      return {
        projects: newProjects
      };
    }),

    updateWorkspace: (workspaceId, updates) => set((state) => {
      const ws = state.workspaces[workspaceId];
      if (!ws) return state;
      // Don't allow overwriting projectIds via generic update unless careful, 
      // but Typescript Partial handles it.
      api.updateWorkspace(workspaceId, updates).catch(e => toast.error("Failed to update workspace", { description: e.message }));
      db.workspaces.update(workspaceId, updates).catch(e => console.error(e));

      return {
        workspaces: {
          ...state.workspaces,
          [workspaceId]: { ...ws, ...updates }
        }
      };
    }),

    updateProject: (projectId, updates) => set((state) => {
      const proj = state.projects[projectId];
      if (!proj) return state;

      api.updateProject(projectId, updates).catch(e => toast.error("Failed to update project", { description: e.message }));
      db.projects.update(projectId, updates).catch(e => console.error(e));

      return {
        projects: {
          ...state.projects,
          [projectId]: { ...proj, ...updates }
        }
      };
    }),

    deleteWorkspace: (workspaceId) => set((state) => {
      const ws = state.workspaces[workspaceId];
      if (!ws) return state;

      const newWorkspaces = { ...state.workspaces };
      delete newWorkspaces[workspaceId];

      const newWorkspaceOrder = state.workspaceOrder.filter(id => id !== workspaceId);

      // Cascade delete projects
      const projectsToDelete = Object.values(state.projects).filter(p => p.workspaceId === workspaceId);
      projectsToDelete.forEach(p => {
        // We can re-use deleteProject logic or just clean up directly. 
        // Re-using deleteProject logic locally is cleaner but we can't call internal actions easily from here without `get().deleteProject`.
        // Let's do it manually for bulk efficiency and safety.

        // 1. Delete SubProjects
        const subsToDelete = Object.values(state.subProjects).filter(sp => sp.projectId === p.id);
        subsToDelete.forEach(sp => {
          delete state.subProjects[sp.id];
          api.deleteSubProject(sp.id).catch(console.error);
        });

        // 2. Delete Milestones
        const milestonesToDelete = Object.values(state.milestones).filter(m => m.projectId === p.id);
        milestonesToDelete.forEach(m => {
          delete state.milestones[m.id];
          api.deleteMilestone(m.id).catch(console.error);
        });

        // 3. Delete Items
        const itemsToDelete = Object.values(state.items).filter(i => i.projectId === p.id);
        itemsToDelete.forEach(i => {
          delete state.items[i.id];
          api.deleteItem(i.id).catch(console.error);
        });

        // 4. Delete Project
        delete newWorkspaces[workspaceId]; // Actually we need to delete from projects map
        // Note: We are mutating `state.projects` via delete? No, we need to return new object.
      });

      // Clean up maps properly
      const newProjects = { ...state.projects };
      projectsToDelete.forEach(p => {
        delete newProjects[p.id];
        api.deleteProject(p.id).catch(console.error);
      });

      // Filter out deleted children from maps
      const newSubProjects = Object.fromEntries(Object.entries(state.subProjects).filter(([, sp]) => !projectsToDelete.some(p => p.id === sp.projectId)));
      const newMilestones = Object.fromEntries(Object.entries(state.milestones).filter(([, m]) => !projectsToDelete.some(p => p.id === m.projectId)));
      const newItems = Object.fromEntries(Object.entries(state.items).filter(([, i]) => !projectsToDelete.some(p => p.id === i.projectId)));

      api.deleteWorkspace(workspaceId).then(() => toast.success("Workspace deleted")).catch(e => toast.error("Failed to delete workspace", { description: e.message }));

      return {
        workspaces: newWorkspaces,
        workspaceOrder: newWorkspaceOrder,
        projects: newProjects,
        subProjects: newSubProjects,
        milestones: newMilestones,
        items: newItems
      };
    }),

    deleteProject: (projectId) => set((state) => {
      const project = state.projects[projectId];
      if (!project) return state;

      const newProjects = { ...state.projects };
      delete newProjects[projectId];

      // Cascade Delete Children
      const newSubProjects = Object.fromEntries(Object.entries(state.subProjects).filter(([, sp]) => {
        if (sp.projectId === projectId) {
          api.deleteSubProject(sp.id).catch(console.error);
          return false;
        }
        return true;
      }));

      const newMilestones = Object.fromEntries(Object.entries(state.milestones).filter(([, m]) => {
        if (m.projectId === projectId) {
          api.deleteMilestone(m.id).catch(console.error);
          return false;
        }
        return true;
      }));

      const newItems = Object.fromEntries(Object.entries(state.items).filter(([, i]) => {
        if (i.projectId === projectId) {
          api.deleteItem(i.id).catch(console.error);
          return false;
        }
        return true;
      }));

      api.deleteProject(projectId).then(() => toast.success("Project deleted")).catch(e => toast.error("Failed to delete project", { description: e.message }));

      return {
        projects: newProjects,
        subProjects: newSubProjects,
        milestones: newMilestones,
        items: newItems
      };
    }),

    deleteSubProject: (subProjectId, deleteItems) => set((state) => {
      const sub = state.subProjects[subProjectId];
      if (!sub) return state;

      const newSubProjects = { ...state.subProjects };
      delete newSubProjects[subProjectId];

      let newItems = { ...state.items };

      if (deleteItems) {
        // Delete items in this subproject
        newItems = Object.fromEntries(Object.entries(state.items).filter(([, i]) => {
          if (i.subProjectId === subProjectId) {
            api.deleteItem(i.id).catch(console.error);
            return false;
          }
          return true;
        }));
      } else {
        // Unlink items
        Object.values(newItems).forEach(item => {
          if (item.subProjectId === subProjectId) {
            const updated = { ...item, subProjectId: undefined };
            newItems[item.id] = updated;
            api.updateItem(item.id, { subProjectId: null as any }).catch(console.error); // Allow null for optional
          }
        });
      }

      api.deleteSubProject(subProjectId).then(() => toast.success("Sub-project deleted")).catch(e => toast.error("Failed to delete sub-project", { description: e.message }));
      db.subProjects.delete(subProjectId).catch(e => console.error(e));

      return {
        subProjects: newSubProjects,
        items: newItems
      };
    }),

    deleteMilestone: (milestoneId) => set((state) => {
      const ms = state.milestones[milestoneId];
      if (!ms) return state;

      const newMilestones = { ...state.milestones };
      delete newMilestones[milestoneId];

      api.deleteMilestone(milestoneId).then(() => toast.success("Milestone deleted")).catch(e => toast.error("Failed to delete milestone", { description: e.message }));
      db.milestones.delete(milestoneId).catch(e => console.error(e));

      return { milestones: newMilestones };
    }),

    deleteItem: (itemId) => set((state) => {
      const item = state.items[itemId];
      if (!item) return state;

      const newItems = { ...state.items };
      delete newItems[itemId];

      api.deleteItem(itemId).then(() => toast.success("Item deleted")).catch(e => toast.error("Failed to delete item", { description: e.message }));
      db.items.delete(itemId).catch(e => console.error(e));

      return { items: newItems };
    }),

    sync: async () => {
      set({ isSyncing: true });
      try {
        const remoteState = await api.fetchStructure();
        if (remoteState && Object.keys(remoteState.workspaces || {}).length > 0) {
          set({
            workspaces: remoteState.workspaces || {},
            workspaceOrder: remoteState.workspaceOrder || [],
            projects: remoteState.projects || {},
            openProjectIds: remoteState.openProjectIds || [],
            isSyncing: false
          });

          // Update Dexie with fresh data (Structure only)
          await db.transaction('rw', [db.workspaces, db.projects, db.userSettings], async () => {
            await db.workspaces.clear();
            await db.workspaces.bulkPut(Object.values(remoteState.workspaces || {}));

            await db.projects.clear();
            await db.projects.bulkPut(Object.values(remoteState.projects || {}));

            await db.userSettings.put({
              userId: 'current',
              workspaceOrder: remoteState.workspaceOrder || [],
              openProjectIds: remoteState.openProjectIds || []
            });
          });

        } else {
          set({ isSyncing: false });
        }
      } catch (e) {
        console.error("Sync failed:", e);
        toast.error("Sync failed", { description: (e as any).message });
        set({ isSyncing: false });
      }
    },

    fetchRange: async (startDate: string, endDate: string) => {
      set({ isSyncing: true });
      try {
        const rangeData = await api.fetchTimelineData(startDate, endDate);

        set(state => ({
          subProjects: { ...state.subProjects, ...(rangeData.subProjects || {}) },
          milestones: { ...state.milestones, ...(rangeData.milestones || {}) },
          items: { ...state.items, ...(rangeData.items || {}) },
          isSyncing: false
        }));

        // Upsert into Dexie (don't clear, just add/update what we fetched)
        await db.transaction('rw', [db.subProjects, db.milestones, db.items], async () => {
          if (Object.keys(rangeData.subProjects || {}).length > 0)
            await db.subProjects.bulkPut(Object.values(rangeData.subProjects || {}));
          if (Object.keys(rangeData.milestones || {}).length > 0)
            await db.milestones.bulkPut(Object.values(rangeData.milestones || {}));
          if (Object.keys(rangeData.items || {}).length > 0)
            await db.items.bulkPut(Object.values(rangeData.items || {}));
        });

      } catch (e) {
        console.error("Fetch range failed:", e);
        set({ isSyncing: false });
      }
    },

    loadFromLocal: async () => {
      try {
        const workspaces = await db.workspaces.toArray();
        const projects = await db.projects.toArray();
        const subProjects = await db.subProjects.toArray();
        const milestones = await db.milestones.toArray();
        const items = await db.items.toArray();
        const settings = await db.userSettings.get({ userId: 'current' });

        const state: Partial<TimelineState> = {
          workspaces: workspaces.reduce((acc, w) => ({ ...acc, [w.id]: w }), {}),
          projects: projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}),
          subProjects: subProjects.reduce((acc, s) => ({ ...acc, [s.id]: s }), {}),
          milestones: milestones.reduce((acc, m) => ({ ...acc, [m.id]: m }), {}),
          items: items.reduce((acc, i) => ({ ...acc, [i.id]: i }), {}),
          workspaceOrder: settings?.workspaceOrder || [],
          openProjectIds: settings?.openProjectIds || [],
        };

        set(state as any); // Simple set for now
      } catch (e) {
        console.error("Load from local failed", e);
        toast.error("Failed to load local data");
      }
    },

    syncRemoteData: (data: Partial<TimelineState>) => {
      set((state) => ({
        ...state,
        ...data,
        workspaces: { ...state.workspaces, ...(data.workspaces || {}) },
        projects: { ...state.projects, ...(data.projects || {}) },
        subProjects: { ...state.subProjects, ...(data.subProjects || {}) },
        milestones: { ...state.milestones, ...(data.milestones || {}) },
        items: { ...state.items, ...(data.items || {}) },
      }));
    },

    syncRangeData: (data: Partial<TimelineState>, range: { startDate: string, endDate: string }) => {
      set((state) => {
        const { startDate, endDate } = range;

        // 1. Merge new data (updates/creates)
        const newItems = { ...state.items, ...(data.items || {}) };
        const newMilestones = { ...state.milestones, ...(data.milestones || {}) };
        const newSubProjects = { ...state.subProjects, ...(data.subProjects || {}) };

        const deletedItemIds: string[] = [];
        const deletedMilestoneIds: string[] = [];
        const deletedSubProjectIds: string[] = [];

        // 2. Remove deleted Items (in range but missing from data)
        Object.values(state.items).forEach(item => {
          if (item.date >= startDate && item.date <= endDate) {
            // If item is in this range safely, but not in the incoming data packet, it's deleted.
            // Note: data.items only contains items in this range.
            if (!data.items?.[item.id]) {
              delete newItems[item.id];
              deletedItemIds.push(item.id);
            }
          }
        });

        // 3. Remove deleted Milestones
        Object.values(state.milestones).forEach(ms => {
          if (ms.date >= startDate && ms.date <= endDate) {
            if (!data.milestones?.[ms.id]) {
              delete newMilestones[ms.id];
              deletedMilestoneIds.push(ms.id);
            }
          }
        });

        // 4. Remove deleted SubProjects (overlapping range but missing)
        // Logic: if subProject overlaps the range, api would have returned it.
        Object.values(state.subProjects).forEach(sp => {
          // Overlap check: start <= end AND end >= start
          const overlaps = sp.startDate <= endDate && sp.endDate >= startDate;
          if (overlaps) {
            if (!data.subProjects?.[sp.id]) {
              delete newSubProjects[sp.id];
              deletedSubProjectIds.push(sp.id);
            }
          }
        });

        // Clean up local DB (Dexie) to prevent ghost items on reload
        if (deletedItemIds.length > 0) db.items.bulkDelete(deletedItemIds).catch(console.error);
        if (deletedMilestoneIds.length > 0) db.milestones.bulkDelete(deletedMilestoneIds).catch(console.error);
        if (deletedSubProjectIds.length > 0) db.subProjects.bulkDelete(deletedSubProjectIds).catch(console.error);

        return {
          ...state,
          items: newItems,
          milestones: newMilestones,
          subProjects: newSubProjects,
          // Workspaces/Projects are global, typically handled by sync structure or separate logic, 
          // but we can merge them if provided.
          workspaces: { ...state.workspaces, ...(data.workspaces || {}) },
          projects: { ...state.projects, ...(data.projects || {}) },
        };
      });
    }
  })
);
