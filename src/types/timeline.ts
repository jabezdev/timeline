
export interface TimelineItem {
  id: string;
  title: string;
  content: string;
  date: string;
  completed: boolean;
  projectId: string;
  subProjectId?: string;
  color?: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  projectId: string;
  content?: string;
  color?: string;
}

export interface SubProject {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  projectId: string;
  color?: string;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  workspaceId: string;
  color: number;
  // Normalized: references are now computed or stored in state.projectOrder
}

export interface Workspace {
  id: string;
  name: string;
  color: number;
  projectIds: string[]; // Order of projects
  isCollapsed: boolean;
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

