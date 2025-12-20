import { create } from 'zustand';
// persist middleware removed in favor of manual Dexie sync
import { Workspace, Project, TimelineItem, Milestone, SubProject, TimelineState } from '@/types/timeline';
import { differenceInDays, parseISO, addDays, format, startOfWeek } from 'date-fns';
import { api } from '@/lib/api';
import { db } from '@/lib/db';

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
      const newWorkspaces = { ...state.workspaces };
      Object.keys(newWorkspaces).forEach(id => {
        newWorkspaces[id] = { ...newWorkspaces[id], isCollapsed: false };
      });
      return { workspaces: newWorkspaces };
    }),

    toggleWorkspace: (id) => set((state) => {
      const ws = state.workspaces[id];
      if (!ws) return state;
      // Local only - do not sync isCollapsed to server
      db.workspaces.update(id, { isCollapsed: !ws.isCollapsed }).catch(e => console.error(e));
      return {
        workspaces: {
          ...state.workspaces,
          [id]: { ...ws, isCollapsed: !ws.isCollapsed }
        }
      };
    }),

    toggleProject: (projectId, workspaceId) => set((state) => {
      const isOpen = state.openProjectIds.includes(projectId);
      let newOpenProjectIds = [...state.openProjectIds];

      if (isOpen) {
        newOpenProjectIds = newOpenProjectIds.filter(id => id !== projectId);
        return { openProjectIds: newOpenProjectIds };
      } else {
        newOpenProjectIds.push(projectId);

        // Auto-collapse other workspaces logic (optional, keeping consistent with old behavior)
        const newWorkspaces = { ...state.workspaces };
        Object.keys(newWorkspaces).forEach(id => {
          newWorkspaces[id] = {
            ...newWorkspaces[id],
            isCollapsed: id !== workspaceId
          };
        });

        return {
          openProjectIds: newOpenProjectIds,
          workspaces: newWorkspaces
        };
      }
    }),

    updateItemDate: (itemId, newDate) => set((state) => {
      const item = state.items[itemId];
      if (!item) return state;
      api.updateItem(itemId, { date: newDate }).catch(e => console.error(e));
      db.items.update(itemId, { date: newDate }).catch(e => console.error(e));
      return {
        items: {
          ...state.items,
          [itemId]: { ...item, date: newDate }
        }
      };
    }),

    updateMilestoneDate: (milestoneId, newDate) => set((state) => {
      const ms = state.milestones[milestoneId];
      if (!ms) return state;
      api.updateMilestone(milestoneId, { date: newDate }).catch(e => console.error(e));
      return {
        milestones: {
          ...state.milestones,
          [milestoneId]: { ...ms, date: newDate }
        }
      };
    }),

    updateMilestone: (milestoneId, updates) => set((state) => {
      const ms = state.milestones[milestoneId];
      if (!ms) return state;
      api.updateMilestone(milestoneId, updates).catch(e => console.error(e));
      db.milestones.update(milestoneId, updates).catch(e => console.error(e));
      return {
        milestones: {
          ...state.milestones,
          [milestoneId]: { ...ms, ...updates }
        }
      };
    }),

    toggleItemComplete: (itemId) => set((state) => {
      const item = state.items[itemId];
      if (!item) return state;
      api.updateItem(itemId, { completed: !item.completed }).catch(e => console.error(e));
      db.items.update(itemId, { completed: !item.completed }).catch(e => console.error(e));
      return {
        items: {
          ...state.items,
          [itemId]: { ...item, completed: !item.completed }
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
      };
      api.createItem(newItem).catch(e => console.error(e));
      db.items.add(newItem).catch(e => console.error(e));
      return {
        items: { ...state.items, [id]: newItem }
      };
    }),

    updateItem: (itemId, updates) => set((state) => {
      const item = state.items[itemId];
      if (!item) return state;
      api.updateItem(itemId, updates).catch(e => console.error(e));
      db.items.update(itemId, updates).catch(e => console.error(e));
      return {
        items: {
          ...state.items,
          [itemId]: { ...item, ...updates }
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

      api.createWorkspace(newWorkspace).catch(e => console.error("Create Workspace Failed:", e));
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

      api.createProject(newProject).catch(e => console.error("Create Project Failed", e));

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
      };
      api.createSubProject(newSub).catch(e => console.error(e));
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
      const updatedSubProjects = {
        ...state.subProjects,
        [subProjectId]: { ...sub, ...updates }
      };

      api.updateSubProject(subProjectId, updates).catch(e => console.error(e));
      db.subProjects.update(subProjectId, updates).catch(e => console.error(e));

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

      const updatedSub = { ...sub, startDate: newStartDate, endDate: newEndDate };
      const updatedSubProjects = { ...state.subProjects, [subProjectId]: updatedSub };

      // Shift items
      const updatedItems = { ...state.items };
      Object.values(updatedItems).forEach(item => {
        if (item.subProjectId !== subProjectId) return;
        const newItemDate = format(addDays(parseISO(item.date), daysDiff), 'yyyy-MM-dd');
        updatedItems[item.id] = { ...item, date: newItemDate };

        // SYNC ITEM CHANGE
        api.updateItem(item.id, { date: newItemDate }).catch(e => console.error(e));
        db.items.update(item.id, { date: newItemDate }).catch(e => console.error(e));
      });

      // SYNC SUBPROJECT ITSELF (Important: Update start/end date on server)
      api.updateSubProject(subProjectId, { startDate: newStartDate, endDate: newEndDate }).catch(e => console.error(e));
      db.subProjects.update(subProjectId, { startDate: newStartDate, endDate: newEndDate }).catch(e => console.error(e));

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
      };
      api.createMilestone(newMilestone).catch(e => console.error(e));
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

      api.reorderProjects(updates).catch(e => console.error("Reorder Projects Failed", e));

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
      api.updateWorkspace(workspaceId, updates).catch(e => console.error(e));
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

      api.updateProject(projectId, updates).catch(e => console.error(e));
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

      api.deleteWorkspace(workspaceId).catch(e => console.error(e));

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

      api.deleteProject(projectId).catch(e => console.error(e));

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

      api.deleteSubProject(subProjectId).catch(e => console.error(e));
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

      api.deleteMilestone(milestoneId).catch(e => console.error(e));
      db.milestones.delete(milestoneId).catch(e => console.error(e));

      return { milestones: newMilestones };
    }),

    deleteItem: (itemId) => set((state) => {
      const item = state.items[itemId];
      if (!item) return state;

      const newItems = { ...state.items };
      delete newItems[itemId];

      api.deleteItem(itemId).catch(e => console.error(e));
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
      }
    }
  })
);
