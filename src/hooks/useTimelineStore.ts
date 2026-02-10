import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

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
      else return { selectedIds: new Set([id]) }; // Ensure single select if toggling on same item in single mode (though usually click selects)
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
  clearSelection: () => set({ selectedIds: new Set() }),
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
    }),
  })
);
