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

export interface TimelineState {
  workspaces: Record<string, Workspace>;
  projects: Record<string, Project>;
  subProjects: Record<string, SubProject>;
  milestones: Record<string, Milestone>;
  items: Record<string, TimelineItem>;
  workspaceOrder: string[];

  openProjectIds: string[]; // Changed to array for easier serialization/management
  currentDate: string; // ISO date string YYYY-MM-DD
  visibleDays: number;
  isSyncing: boolean;
}

