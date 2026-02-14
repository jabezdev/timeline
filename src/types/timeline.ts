export interface TimelineItem {
  id: string;
  title: string;
  content: string;
  date: string;
  completed: boolean;
  projectId: string;
  subProjectId?: string;
  color?: string;
  position?: number;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  projectId: string;
  content?: string;
  color?: string;
  position?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubProject {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  projectId: string;
  color?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  workspaceId: string;
  color: string;
  position: number;
  isHidden?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  isCollapsed: boolean;
  isHidden?: boolean;
  position: number;
  createdAt?: string;
  updatedAt?: string;
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

