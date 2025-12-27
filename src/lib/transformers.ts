import { TimelineItem, Milestone, SubProject, Project, Workspace } from '@/types/timeline';

// Helper to transform Workspace (DB -> App)
export const transformWorkspace = (db: any): Workspace => ({
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
export const transformProject = (db: any): Project => ({
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
export const transformSubProject = (db: any): SubProject => ({
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
export const transformMilestone = (db: any): Milestone => ({
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
export const transformItem = (db: any): TimelineItem => ({
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
