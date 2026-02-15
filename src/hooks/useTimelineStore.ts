import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { TimelineItem, Milestone, SubProject } from '@/types/timeline';

type TimelineEntity = TimelineItem | Milestone | SubProject;

interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
  toJSON: () => unknown;
}

interface QuickCreateState {
  open: boolean;
  type: 'item' | 'milestone';
  projectId: string;
  date: string;
  subProjectId?: string;
  workspaceColor?: number;
  anchorRect?: AnchorRect;
}

interface QuickEditState {
  open: boolean;
  item: TimelineEntity | null;
  anchorRect?: AnchorRect;
}

type Updater<T> = T | ((prev: T) => T);

interface TimelineStore {
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  toggleSelection: (id: string, multi: boolean) => void;
  selectItem: (id: string, multi: boolean) => void;
  clearSelection: () => void;
  // UI State
  selectedItem: TimelineEntity | null;
  setSelectedItem: (item: TimelineEntity | null) => void;
  isItemDialogOpen: boolean;
  setIsItemDialogOpen: (open: boolean) => void;
  quickCreateState: QuickCreateState;
  setQuickCreateState: (state: Updater<QuickCreateState>) => void;
  quickEditState: QuickEditState;
  setQuickEditState: (state: Updater<QuickEditState>) => void;
  subProjectToDelete: SubProject | null;
  setSubProjectToDelete: (sp: SubProject | null) => void;
  focusMode: {
    enabled: boolean;
    matrix: Record<string, string[]>;
  };
  focusModeExtraMonths: number;
  setFocusMode: (focusMode: { enabled: boolean; matrix: Record<string, string[]> }) => void;
  setFocusModeExtraMonths: (months: number) => void;
  setFocusModeEnabled: (enabled: boolean) => void;
  toggleFocusCell: (workspaceId: string, weekKey: string) => void;
  clearFocusSelections: () => void;
  resetFocusModeConfig: () => void;
}

// Debounce timer for localStorage persistence
let persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Create the store with debounced persistence
const storeCreator: StateCreator<TimelineStore> = (set) => ({
  isSidebarCollapsed: false,
  setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
  sidebarWidth: 350,
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  selectedIds: new Set(),
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  toggleSelection: (id, multi) => set((state) => {
    const newSet = new Set(multi ? state.selectedIds : []);
    if (newSet.has(id)) {
      if (multi) newSet.delete(id);
      else return { selectedIds: new Set([id]) };
    } else {
      newSet.add(id);
    }
    return { selectedIds: newSet };
  }),
  selectItem: (id, multi) => set((state) => {
    const newSet = new Set(multi ? state.selectedIds : []);
    newSet.add(id);
    return { selectedIds: newSet };
  }),
  clearSelection: () => set({
    selectedIds: new Set(),
    selectedItem: null,
    isItemDialogOpen: false,
    quickCreateState: { open: false, type: 'item', projectId: '', date: '', workspaceColor: 1 },
    quickEditState: { open: false, item: null },
    subProjectToDelete: null
  }),

  // UI State Defaults
  selectedItem: null,
  setSelectedItem: (selectedItem) => set({ selectedItem }),
  isItemDialogOpen: false,
  setIsItemDialogOpen: (isItemDialogOpen) => set({ isItemDialogOpen }),
  quickCreateState: { open: false, type: 'item', projectId: '', date: '', workspaceColor: 1 },
  setQuickCreateState: (update) => set((state) => ({
    quickCreateState: typeof update === 'function' ? update(state.quickCreateState) : update
  })),
  quickEditState: { open: false, item: null },
  setQuickEditState: (update) => set((state) => ({
    quickEditState: typeof update === 'function' ? update(state.quickEditState) : update
  })),
  subProjectToDelete: null,
  setSubProjectToDelete: (subProjectToDelete) => set({ subProjectToDelete }),
  focusMode: {
    enabled: false,
    matrix: {},
  },
  focusModeExtraMonths: 0,
  setFocusMode: (focusMode) => set({ focusMode }),
  setFocusModeExtraMonths: (focusModeExtraMonths) => set({ focusModeExtraMonths: Math.max(0, focusModeExtraMonths) }),
  setFocusModeEnabled: (enabled) => set((state) => ({
    focusMode: {
      ...state.focusMode,
      enabled,
    }
  })),
  toggleFocusCell: (workspaceId, weekKey) => set((state) => {
    const currentWeeks = state.focusMode.matrix[workspaceId] || [];
    const hasWeek = currentWeeks.includes(weekKey);
    const nextWeeks = hasWeek
      ? currentWeeks.filter(w => w !== weekKey)
      : [...currentWeeks, weekKey].sort((a, b) => a.localeCompare(b));

    const nextMatrix = { ...state.focusMode.matrix };

    if (nextWeeks.length === 0) {
      delete nextMatrix[workspaceId];
    } else {
      nextMatrix[workspaceId] = nextWeeks;
    }

    return {
      focusMode: {
        ...state.focusMode,
        matrix: nextMatrix,
      }
    };
  }),
  clearFocusSelections: () => set((state) => ({
    focusMode: {
      ...state.focusMode,
      matrix: {},
      enabled: false,
    }
  })),
  resetFocusModeConfig: () => set({
    focusMode: {
      enabled: false,
      matrix: {},
    },
    focusModeExtraMonths: 0,
  }),
});

// Custom storage that debounces writes
const debouncedStorage: StateStorage = {
  getItem: (name: string): string | null => {
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    // Debounce localStorage writes to avoid blocking during resize
    if (persistDebounceTimer) {
      clearTimeout(persistDebounceTimer);
    }
    persistDebounceTimer = setTimeout(() => {
      localStorage.setItem(name, value);
      persistDebounceTimer = null;
    }, 150); // 150ms debounce
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};

export const useTimelineStore = create<TimelineStore>()(
  persist(storeCreator, {
    name: 'timeline-ui-storage',
    storage: createJSONStorage(() => debouncedStorage),
    partialize: (state) => ({
      isSidebarCollapsed: state.isSidebarCollapsed,
      sidebarWidth: state.sidebarWidth,
      focusMode: state.focusMode,
      focusModeExtraMonths: state.focusModeExtraMonths,
    }),
  })
);
