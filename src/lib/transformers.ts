import { TimelineItem, Milestone, SubProject, Project, Workspace } from '@/types/timeline';

// Helper to transform Workspace (DB -> App)
export const transformWorkspace = (db: { id: string; name: string; color: string; is_hidden?: boolean; position?: number; created_at?: string; updated_at?: string }): Workspace => ({
    id: db.id,
    name: db.name,
    color: db.color,
    isCollapsed: false, // Client-side state only, default to expanded
    isHidden: db.is_hidden,
    position: db.position || 0,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
});

// Helper to transform Project (DB -> App)
export const transformProject = (db: { id: string; name: string; workspace_id: string; color: string; position?: number; is_hidden?: boolean; created_at?: string; updated_at?: string }): Project => ({
    id: db.id,
    name: db.name,
    workspaceId: db.workspace_id,
    color: db.color,
    position: db.position || 0,
    isHidden: db.is_hidden,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
});

// Helper to transform SubProject (DB -> App)
export const transformSubProject = (db: { id: string; title: string; start_date: string; end_date: string; project_id: string; color?: string; description?: string; created_at?: string; updated_at?: string }): SubProject => ({
    id: db.id,
    title: db.title,
    startDate: db.start_date,
    endDate: db.end_date,
    projectId: db.project_id,
    color: db.color,
    description: db.description,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
});


// Helper to transform Milestone (DB -> App)
export const transformMilestone = (db: { id: string; title: string; date: string; project_id: string; content?: string; color?: string; position?: number; created_at?: string; updated_at?: string }): Milestone => ({
    id: db.id,
    title: db.title,
    date: db.date,
    projectId: db.project_id,
    content: db.content,
    color: db.color,
    position: db.position || 0,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
});


// Helper to transform Item (DB -> App)
export const transformItem = (db: { id: string; title: string; content?: string; date: string; completed: boolean; project_id: string; sub_project_id?: string; color?: string; completed_at?: string; position?: number; created_at?: string; updated_at?: string }): TimelineItem => ({
    id: db.id,
    title: db.title,
    content: db.content,
    date: db.date,
    completed: db.completed,
    projectId: db.project_id,
    subProjectId: db.sub_project_id,
    color: db.color,
    completedAt: db.completed_at,
    position: db.position || 0,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
});
