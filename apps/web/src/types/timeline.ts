export interface TimelineItem {
  id: string;
  title: string;
  content?: string;
  date: number;               // Unix ms
  completed: boolean;
  projectId: string;
  subProjectId?: string;
  color?: string;
  position?: string;          // fractional index key
  completedAt?: number;       // Unix ms
  createdAt?: number;
  updatedAt?: number;
}

export interface Milestone {
  id: string;
  title: string;
  date: number;               // Unix ms
  projectId: string;
  content?: string;
  color?: string;
  position?: string;          // fractional index key
  createdAt?: number;
  updatedAt?: number;
}

export interface SubProject {
  id: string;
  title: string;
  startDate: number;          // Unix ms
  endDate: number;            // Unix ms
  projectId: string;
  color?: string;
  description?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Project {
  id: string;
  name: string;
  workspaceId: string;
  color: string;
  position: string;           // fractional index key
  isHidden?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  isCollapsed: boolean;
  isHidden?: boolean;
  position: string;           // fractional index key
  createdAt?: number;
  updatedAt?: number;
}


export interface UserSettings {
  userId: string;
  workspaceOrder: string[];
  openProjectIds: string[];
  theme?: 'light' | 'dark' | 'system';
  systemAccent?: string; // One of the 6 curated colors or defaults
  colorMode?: 'full' | 'monochromatic';
  blurEffectsEnabled?: boolean;
}

export interface TimelineState {
  workspaces: Record<string, Workspace>;
  projects: Record<string, Project>;
  subProjects: Record<string, SubProject>;
  milestones: Record<string, Milestone>;
  items: Record<string, TimelineItem>;
  workspaceOrder: string[];
  userSettings?: UserSettings;

  currentDate: string;
  visibleDays: number;
  isSyncing: boolean;
}
