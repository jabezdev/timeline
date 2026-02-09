import { create, StateCreator } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

interface TimelineStore {
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
}

// Debounce timer for localStorage persistence
let persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Create the store with debounced persistence
const storeCreator: StateCreator<TimelineStore> = (set) => ({
  isSidebarCollapsed: false,
  setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
  sidebarWidth: 350,
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
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
