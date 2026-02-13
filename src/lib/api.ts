import { supabase } from './supabase';
import { TimelineState, Workspace, Project, SubProject, Milestone, TimelineItem, UserSettings } from '@/types/timeline';
import {
    transformWorkspace,
    transformProject,
    transformSubProject,
    transformMilestone,
    transformItem
} from '@/lib/transformers';


export const api = {
    // --- READ ---
    // Helper to handle Supabase responses
    async handleResponse<T>(promise: Promise<{ data: T | null; error: unknown }>): Promise<T> {
        const { data, error } = await promise;
        if (error) {
            console.error("Supabase API Error:", error);
            throw error;
        }
        return data as T;
    },

    // --- READ ---
    async fetchStructure(): Promise<Partial<TimelineState>> {
        const [workspaces, projects, settings] = await Promise.all([
            this.handleResponse(supabase
                .from('workspaces')
                .select('*')
                .order('position', { ascending: true })),
            this.handleResponse(supabase
                .from('projects')
                .select('*')
                .order('position', { ascending: true })),
            this.handleResponse(supabase
                .from('user_settings')
                .select('*')
                .maybeSingle())
        ]);


        const state: Partial<TimelineState> = {
            workspaces: {},
            projects: {},
            workspaceOrder: [],
            userSettings: settings ? {
                userId: settings.user_id,
                workspaceOrder: settings.workspace_order || [],
                openProjectIds: settings.open_project_ids || [],
                theme: settings.theme,
                systemAccent: settings.system_accent,
                colorMode: settings.color_mode
            } : undefined
        };

        // Populate workspaces
        if (workspaces) {
            workspaces.forEach(w => state.workspaces![w.id] = transformWorkspace(w));
            state.workspaceOrder = workspaces.map(w => w.id);
        }

        // Populate projects
        if (projects) {
            projects.forEach(p => state.projects![p.id] = transformProject(p));
        }

        return state;
    },

    async fetchTimelineData(startDate: string, endDate: string): Promise<Partial<TimelineState>> {
        const [items, milestones, subProjects] = await Promise.all([
            this.handleResponse(supabase
                .from('timeline_items')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('title', { ascending: true })),
            this.handleResponse(supabase
                .from('milestones')
                .select('*')
                .gte('date', startDate)
                .lte('date', endDate)
                .order('title', { ascending: true })),
            this.handleResponse(supabase
                .from('sub_projects')
                .select('*')
                .lte('start_date', endDate)
                .gte('end_date', startDate))
        ]);

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

    // --- WRITE ---

    async createWorkspace(w: Workspace) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const payload: any = {
            user_id: user.id,
            name: w.name,
            color: w.color,
            is_hidden: w.isHidden,
            position: w.position,
        };

        if (w.id && !w.id.startsWith('temp-')) {
            payload.id = w.id;
        }

        return this.handleResponse(supabase.from('workspaces').upsert(payload).select().single());
    },

    async updateWorkspace(id: string, updates: Partial<Workspace>) {
        const dbUpdates: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
        if ('name' in updates) dbUpdates.name = updates.name;
        if ('color' in updates) dbUpdates.color = updates.color;
        if ('isHidden' in updates) dbUpdates.is_hidden = updates.isHidden;
        if ('position' in updates) dbUpdates.position = updates.position;

        return this.handleResponse(supabase.from('workspaces').update(dbUpdates).eq('id', id).select().single());
    },

    async deleteWorkspace(id: string) {
        return this.handleResponse(supabase.from('workspaces').delete().eq('id', id));
    },

    async createProject(p: Project) {
        const payload: any = {
            name: p.name,
            workspace_id: p.workspaceId,
            color: p.color,
            position: p.position,
            is_hidden: p.isHidden,
        };

        if (p.id && !p.id.startsWith('temp-')) {
            payload.id = p.id;
        }

        return this.handleResponse(supabase.from('projects').upsert(payload).select().single());
    },

    async updateProject(id: string, updates: Partial<Project>) {
        const dbUpdates: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
        if ('name' in updates) dbUpdates.name = updates.name;
        if ('color' in updates) dbUpdates.color = updates.color;
        if ('position' in updates) dbUpdates.position = updates.position;
        if ('workspaceId' in updates) dbUpdates.workspace_id = updates.workspaceId;
        if ('isHidden' in updates) dbUpdates.is_hidden = updates.isHidden;

        return this.handleResponse(supabase.from('projects').update(dbUpdates).eq('id', id).select().single());
    },

    async reorderProjects(projects: Partial<Project>[]) {
        const updates = projects.map(p => ({
            id: p.id,
            position: p.position,
        }));

        // Parallelize updates
        return Promise.all(updates.map(u =>
            this.handleResponse(supabase.from('projects').update({ position: u.position }).eq('id', u.id!).select().single())
        ));
    },

    async deleteProject(id: string) {
        return this.handleResponse(supabase.from('projects').delete().eq('id', id));
    },

    async createSubProject(s: SubProject) {
        const payload: any = {
            title: s.title,
            start_date: s.startDate,
            end_date: s.endDate,
            project_id: s.projectId,
            color: s.color,
            description: s.description,
        };

        if (s.id && !s.id.startsWith('temp-')) {
            payload.id = s.id;
        }

        return this.handleResponse(supabase.from('sub_projects').upsert(payload).select().single());
    },

    async updateSubProject(id: string, updates: Partial<SubProject>) {
        const dbUpdates: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
        if ('title' in updates) dbUpdates.title = updates.title;
        if ('startDate' in updates) dbUpdates.start_date = updates.startDate;
        if ('endDate' in updates) dbUpdates.end_date = updates.endDate;
        if ('color' in updates) dbUpdates.color = updates.color;
        if ('description' in updates) dbUpdates.description = updates.description;

        return this.handleResponse(supabase.from('sub_projects').update(dbUpdates).eq('id', id).select().single());
    },

    async deleteSubProject(id: string, deleteItems?: boolean) {
        if (deleteItems) {
            await supabase.from('items').delete().eq('sub_project_id', id);
        }
        return this.handleResponse(supabase.from('sub_projects').delete().eq('id', id));
    },

    async createMilestone(m: Milestone) {
        const payload: any = {
            title: m.title,
            date: m.date,
            project_id: m.projectId,
            content: m.content,
            color: m.color,
            position: m.position,
        };

        if (m.id && !m.id.startsWith('temp-')) {
            payload.id = m.id;
        }

        return this.handleResponse(supabase.from('milestones').upsert(payload).select().single());
    },

    async updateMilestone(id: string, updates: Partial<Milestone>) {
        const dbUpdates: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
        if ('title' in updates) dbUpdates.title = updates.title;
        if ('date' in updates) dbUpdates.date = updates.date;
        if ('content' in updates) dbUpdates.content = updates.content;
        if ('color' in updates) dbUpdates.color = updates.color;
        return this.handleResponse(supabase.from('milestones').update(dbUpdates).eq('id', id).select().single());
    },

    async deleteMilestone(id: string) {
        return this.handleResponse(supabase.from('milestones').delete().eq('id', id));
    },

    async createItem(i: TimelineItem) {
        const payload: any = {
            title: i.title,
            content: i.content,
            date: i.date,
            completed: i.completed,
            project_id: i.projectId,
            sub_project_id: i.subProjectId,
            color: i.color,
            completed_at: i.completedAt,
            position: i.position,
        };

        if (i.id && !i.id.startsWith('temp-')) {
            payload.id = i.id;
        }

        return this.handleResponse(supabase.from('timeline_items').upsert(payload).select().single());
    },

    async updateItem(id: string, updates: Partial<TimelineItem>) {
        const dbUpdates: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
        if ('title' in updates) dbUpdates.title = updates.title;
        if ('content' in updates) dbUpdates.content = updates.content;
        if ('date' in updates) dbUpdates.date = updates.date;
        if ('completed' in updates) dbUpdates.completed = updates.completed;
        if ('subProjectId' in updates) dbUpdates.sub_project_id = updates.subProjectId;
        if ('color' in updates) dbUpdates.color = updates.color;
        if ('completedAt' in updates) dbUpdates.completed_at = updates.completedAt;
        return this.handleResponse(supabase.from('timeline_items').update(dbUpdates).eq('id', id).select().single());
    },

    async deleteItem(id: string) {
        return this.handleResponse(supabase.from('timeline_items').delete().eq('id', id));
    },

    // User Settings
    async saveSettings(workspaceOrder: string[], openProjectIds: string[] = []) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        return this.handleResponse(supabase.from('user_settings').upsert({
            user_id: user.id,
            workspace_order: workspaceOrder,
            open_project_ids: openProjectIds
        }));
    },

    async reorderWorkspaces(workspaces: Partial<Workspace>[]) {
        const updates = workspaces.map(w => ({
            id: w.id,
            position: w.position,
        }));
        return Promise.all(updates.map(u =>
            this.handleResponse(supabase.from('workspaces').update({ position: u.position }).eq('id', u.id!).select().single())
        ));
    },

    async reorderMilestones(milestones: Partial<Milestone>[]) {
        const updates = milestones.map(m => ({
            id: m.id,
            position: m.position,
        }));
        return Promise.all(updates.map(u =>
            this.handleResponse(supabase.from('milestones').update({ position: u.position }).eq('id', u.id!).select().single())
        ));
    },

    async reorderItems(items: Partial<TimelineItem>[]) {
        const updates = items.map(i => ({
            id: i.id,
            position: i.position,
        }));
        return Promise.all(updates.map(u =>
            this.handleResponse(supabase.from('timeline_items').update({ position: u.position }).eq('id', u.id!).select().single())
        ));
    },

    async batchUpdateItems(items: Partial<TimelineItem>[]) {
        const updates = items.map(i => ({
            id: i.id,
            ...i
        }));

        // Remove undefined fields to avoid overwriting with null/undefined if Supabase behaves weirdly, 
        // though upsert/update usually handles it. 
        // Using Promise.all for individual updates is safer without a dedicated bulk RPC func.
        // For pure batch update in one query, Supabase requires upsert with all fields, 
        // but we only have partials here.

        return Promise.all(updates.map(u => {
            const { id, ...rest } = u;
            const dbUpdates: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
            if ('title' in rest) dbUpdates.title = rest.title;
            if ('content' in rest) dbUpdates.content = rest.content;
            if ('date' in rest) dbUpdates.date = rest.date;
            if ('completed' in rest) dbUpdates.completed = rest.completed;
            if ('subProjectId' in rest) dbUpdates.sub_project_id = rest.subProjectId;
            if ('color' in rest) dbUpdates.color = rest.color;
            if ('completedAt' in rest) dbUpdates.completed_at = rest.completedAt;
            if ('position' in rest) dbUpdates.position = rest.position;

            return this.handleResponse(supabase.from('timeline_items').update(dbUpdates).eq('id', id!));
        }));
    },

    async updateUserSettings(settings: Partial<UserSettings>) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const dbUpdates: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
        if ('theme' in settings) dbUpdates.theme = settings.theme;
        if ('systemAccent' in settings) dbUpdates.system_accent = settings.systemAccent;
        if ('colorMode' in settings) dbUpdates.color_mode = settings.colorMode;
        if ('workspaceOrder' in settings) dbUpdates.workspace_order = settings.workspaceOrder;
        if ('openProjectIds' in settings) dbUpdates.open_project_ids = settings.openProjectIds;

        // Ensure user exists in settings table
        return this.handleResponse(supabase.from('user_settings').upsert({
            user_id: user.id,
            ...dbUpdates
        }));
    }
};
