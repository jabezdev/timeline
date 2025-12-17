export interface Note {
  id: string;
  content: string;
  date: string;
  type: 'note' | 'diary';
  projectId: string;
}

export interface Task {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  projectId: string;
  milestoneId?: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  projectId: string;
}

export interface Project {
  id: string;
  name: string;
  workspaceId: string;
  color: number;
  milestones: Milestone[];
  tasks: Task[];
  notes: Note[];
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
