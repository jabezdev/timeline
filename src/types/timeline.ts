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
  milestones: Milestone[];
  subProjects: SubProject[];
  items: TimelineItem[];
}

export interface Workspace {
  id: string;
  name: string;
  color: number;
  projects: Project[];
  isCollapsed: boolean;
}

export interface TimelineState {
  workspaces: Workspace[];
  openProjectId: string | null;
  currentDate: Date;
  visibleDays: number;
}
