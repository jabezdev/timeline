import { supabase } from './supabase';
import { TimelineState, Workspace, Project, SubProject, Milestone, TimelineItem } from '@/types/timeline';

// Helper to transform Workspace (DB -> App)
const transformWorkspace = (db: any): Workspace => ({
    id: db.id,
    name: db.name,
    color: db.color,
    isCollapsed: db.is_collapsed,
    isHidden: db.is_hidden,
});

// Helper to transform Project (DB -> App)
const transformProject = (db: any): Project => ({
    id: db.id,
    name: db.name,
    workspaceId: db.workspace_id,
    color: db.color,
    position: db.position || 0,
    isHidden: db.is_hidden,
});

// Helper to transform SubProject (DB -> App)
const transformSubProject = (db: any): SubProject => ({
    id: db.id,
    title: db.title,
    startDate: db.start_date,
    endDate: db.end_date,
    projectId: db.project_id,
    color: db.color !== null && db.color !== undefined ? String(db.color) : undefined,
    description: db.description,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
});


// Helper to transform Milestone (DB -> App)
const transformMilestone = (db: any): Milestone => ({
    id: db.id,
    title: db.title,
    date: db.date,
    projectId: db.project_id,
    content: db.content,
    color: db.color !== null && db.color !== undefined ? String(db.color) : undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
});


// Helper to transform Item (DB -> App)
const transformItem = (db: any): TimelineItem => ({
    id: db.id,
    title: db.title,
    content: db.content,
    date: db.date,
    completed: db.completed,
    projectId: db.project_id,
    subProjectId: db.sub_project_id,
    color: db.color !== null && db.color !== undefined ? String(db.color) : undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    completedAt: db.completed_at,
});


export const api = {
    // --- READ ---
    async fetchStructure(): Promise<Partial<TimelineState>> {
        const { data: workspaces } = await supabase.from('workspaces').select('*');
        const { data: projects } = await supabase.from('projects').select('*');
        const { data: settings } = await supabase.from('user_settings').select('*').maybeSingle();

        const state: Partial<TimelineState> = {
            workspaces: {},
            projects: {},
            workspaceOrder: settings?.workspace_order || [],
            openProjectIds: settings?.open_project_ids || [],
        };

        workspaces?.forEach(w => state.workspaces![w.id] = transformWorkspace(w));

        // Sort projects by position
        const sortedProjects = (projects || []).sort((a, b) => (a.position || 0) - (b.position || 0));
        sortedProjects.forEach(p => state.projects![p.id] = transformProject(p));

        return state;
    },

    async fetchTimelineData(startDate: string, endDate: string): Promise<Partial<TimelineState>> {
        // Items: date within range
        const { data: items } = await supabase
            .from('items')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);

        // Milestones: date within range
        const { data: milestones } = await supabase
            .from('milestones')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);

        // SubProjects: Overlapping range
        // logic: start <= range_end AND end >= range_start
        const { data: subProjects } = await supabase
            .from('sub_projects')
            .select('*')
            .lte('start_date', endDate)
            .gte('end_date', startDate);

        const state: Partial<TimelineState> = {
            subProjects: {},
            milestones: {},
            items: {},
        };

        subProjects?.forEach(s => state.subProjects![s.id] = transformSubProject(s));
        milestones?.forEach(m => state.milestones![m.id] = transformMilestone(m));
        items?.forEach(i => state.items![i.id] = transformItem(i));

        return state;
    },

    // --- WRITE (Optimistic, fire and forget usually, but we define them here) ---

    async createWorkspace(w: Workspace) {
        return supabase.from('workspaces').upsert({
            id: w.id,
            name: w.name,
            color: w.color,
            is_hidden: w.isHidden,
            // is_collapsed: w.isCollapsed, // Local only
        });
    },

    async updateWorkspace(id: string, updates: Partial<Workspace>) {
        const dbUpdates: any = {};
        if ('name' in updates) dbUpdates.name = updates.name;
        if ('color' in updates) dbUpdates.color = updates.color;
        if ('isHidden' in updates) dbUpdates.is_hidden = updates.isHidden;
        // if ('isCollapsed' in updates) dbUpdates.is_collapsed = updates.isCollapsed; // Local only

        return supabase.from('workspaces').update(dbUpdates).eq('id', id);
    },

    async deleteWorkspace(id: string) {
        return supabase.from('workspaces').delete().eq('id', id);
    },

    async createProject(p: Project) {
        return supabase.from('projects').upsert({
            id: p.id,
            name: p.name,
            workspace_id: p.workspaceId,
            color: p.color,
            position: p.position,
            is_hidden: p.isHidden,
        });
    },

    async updateProject(id: string, updates: Partial<Project>) {
        const dbUpdates: any = {};
        if ('name' in updates) dbUpdates.name = updates.name;
        if ('color' in updates) dbUpdates.color = updates.color;
        if ('position' in updates) dbUpdates.position = updates.position;
        if ('workspaceId' in updates) dbUpdates.workspace_id = updates.workspaceId;
        if ('isHidden' in updates) dbUpdates.is_hidden = updates.isHidden;

        return supabase.from('projects').update(dbUpdates).eq('id', id);
    },

    async reorderProjects(projects: Partial<Project>[]) {
        const updates = projects.map(p => ({
            id: p.id,
            position: p.position,
            // We need to include other required fields if Upserting, but for update we can just loop
            // Supabase JS doesn't support bulk update easily without upsert.
            // Let's use upsert with minimal data if possible, or just loop updates.
            // Better: Upsert requires all non-null fields. 
            // Loop calls is safest for now for reliability, though slower.
        }));

        // Parallelize updates
        return Promise.all(updates.map(u =>
            supabase.from('projects').update({ position: u.position }).eq('id', u.id)
        ));
    },

    async deleteProject(id: string) {
        return supabase.from('projects').delete().eq('id', id);
    },

    async createSubProject(s: SubProject) {
        return supabase.from('sub_projects').upsert({
            id: s.id,
            title: s.title,
            start_date: s.startDate,
            end_date: s.endDate,
            project_id: s.projectId,
            color: s.color,
            description: s.description,
        });
    },

    async updateSubProject(id: string, updates: Partial<SubProject>) {
        const dbUpdates: any = {};
        if ('title' in updates) dbUpdates.title = updates.title;
        if ('startDate' in updates) dbUpdates.start_date = updates.startDate;
        if ('endDate' in updates) dbUpdates.end_date = updates.endDate;
        if ('color' in updates) dbUpdates.color = updates.color;
        if ('description' in updates) dbUpdates.description = updates.description;

        return supabase.from('sub_projects').update(dbUpdates).eq('id', id);
    },

    async deleteSubProject(id: string) {
        return supabase.from('sub_projects').delete().eq('id', id);
    },

    async createMilestone(m: Milestone) {
        return supabase.from('milestones').upsert({
            id: m.id,
            title: m.title,
            date: m.date,
            project_id: m.projectId,
            content: m.content,
            color: m.color,
        });
    },

    async updateMilestone(id: string, updates: Partial<Milestone>) {
        const dbUpdates: any = {};
        if ('title' in updates) dbUpdates.title = updates.title;
        if ('date' in updates) dbUpdates.date = updates.date;
        if ('content' in updates) dbUpdates.content = updates.content;
        if ('color' in updates) dbUpdates.color = updates.color;
        return supabase.from('milestones').update(dbUpdates).eq('id', id);
    },

    async deleteMilestone(id: string) {
        return supabase.from('milestones').delete().eq('id', id);
    },

    async createItem(i: TimelineItem) {
        return supabase.from('items').upsert({
            id: i.id,
            title: i.title,
            content: i.content,
            date: i.date,
            completed: i.completed,
            project_id: i.projectId,
            sub_project_id: i.subProjectId,
            color: i.color,
        });
    },

    async updateItem(id: string, updates: Partial<TimelineItem>) {
        const dbUpdates: any = {};
        if ('title' in updates) dbUpdates.title = updates.title;
        if ('content' in updates) dbUpdates.content = updates.content;
        if ('date' in updates) dbUpdates.date = updates.date;
        if ('completed' in updates) dbUpdates.completed = updates.completed;
        if ('subProjectId' in updates) dbUpdates.sub_project_id = updates.subProjectId;
        if ('color' in updates) dbUpdates.color = updates.color;
        if ('completedAt' in updates) dbUpdates.completed_at = updates.completedAt;
        return supabase.from('items').update(dbUpdates).eq('id', id);
    },

    async deleteItem(id: string) {
        return supabase.from('items').delete().eq('id', id);
    },

    // User Settings (for order only now)
    async saveSettings(workspaceOrder: string[]) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        return supabase.from('user_settings').upsert({
            user_id: user.id,
            workspace_order: workspaceOrder,
            // open_project_ids: openProjectIds // Local only
        });
    }
};
