import { supabase } from './supabase';
import { TimelineState, Workspace, Project, SubProject, Milestone, TimelineItem } from '@/types/timeline';
import {
    transformWorkspace,
    transformProject,
    transformSubProject,
    transformMilestone,
    transformItem
} from '@/lib/transformers';


export const api = {
    // --- READ ---
    async fetchStructure(): Promise<Partial<TimelineState>> {
        const { data: workspaces } = await supabase
            .from('workspaces')
            .select('*')
            .order('position', { ascending: true });

        const { data: projects } = await supabase
            .from('projects')
            .select('*')
            .order('position', { ascending: true });

        const { data: settings } = await supabase
            .from('user_settings')
            .select('*')
            .maybeSingle();

        const state: Partial<TimelineState> = {
            workspaces: {},
            projects: {},
            workspaceOrder: [],
            openProjectIds: settings?.open_project_ids || [],
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
        // Timeline Items: date within range
        const { data: items } = await supabase
            .from('timeline_items')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('title', { ascending: true });

        // Milestones: date within range
        const { data: milestones } = await supabase
            .from('milestones')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('title', { ascending: true });

        // SubProjects: Overlapping range
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

    // --- WRITE ---

    async createWorkspace(w: Workspace) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        return supabase.from('workspaces').upsert({
            id: w.id,
            user_id: user.id,
            name: w.name,
            color: w.color,
            is_hidden: w.isHidden,
            position: w.position,
        });
    },

    async updateWorkspace(id: string, updates: Partial<Workspace>) {
        const dbUpdates: any = {};
        if ('name' in updates) dbUpdates.name = updates.name;
        if ('color' in updates) dbUpdates.color = updates.color;
        if ('isHidden' in updates) dbUpdates.is_hidden = updates.isHidden;
        if ('position' in updates) dbUpdates.position = updates.position;

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
        }));

        // Parallelize updates
        return Promise.all(updates.map(u =>
            supabase.from('projects').update({ position: u.position }).eq('id', u.id!)
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
            position: m.position,
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
        return supabase.from('timeline_items').upsert({
            id: i.id,
            title: i.title,
            content: i.content,
            date: i.date,
            completed: i.completed,
            project_id: i.projectId,
            sub_project_id: i.subProjectId,
            color: i.color,
            completed_at: i.completedAt,
            position: i.position,
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
        return supabase.from('timeline_items').update(dbUpdates).eq('id', id);
    },

    async deleteItem(id: string) {
        return supabase.from('timeline_items').delete().eq('id', id);
    },

    // User Settings
    async saveSettings(workspaceOrder: string[], openProjectIds: string[] = []) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        return supabase.from('user_settings').upsert({
            user_id: user.id,
            workspace_order: workspaceOrder,
            open_project_ids: openProjectIds
        });
    },

    async reorderWorkspaces(workspaces: Partial<Workspace>[]) {
        const updates = workspaces.map(w => ({
            id: w.id,
            position: w.position,
        }));
        return Promise.all(updates.map(u =>
            supabase.from('workspaces').update({ position: u.position }).eq('id', u.id!)
        ));
    },

    async reorderMilestones(milestones: Partial<Milestone>[]) {
        const updates = milestones.map(m => ({
            id: m.id,
            position: m.position,
        }));
        return Promise.all(updates.map(u =>
            supabase.from('milestones').update({ position: u.position }).eq('id', u.id!)
        ));
    },

    async reorderItems(items: Partial<TimelineItem>[]) {
        const updates = items.map(i => ({
            id: i.id,
            position: i.position,
        }));
        return Promise.all(updates.map(u =>
            supabase.from('timeline_items').update({ position: u.position }).eq('id', u.id!)
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
            const dbUpdates: any = {};
            if ('title' in rest) dbUpdates.title = rest.title;
            if ('content' in rest) dbUpdates.content = rest.content;
            if ('date' in rest) dbUpdates.date = rest.date;
            if ('completed' in rest) dbUpdates.completed = rest.completed;
            if ('subProjectId' in rest) dbUpdates.sub_project_id = rest.subProjectId;
            if ('color' in rest) dbUpdates.color = rest.color;
            if ('completedAt' in rest) dbUpdates.completed_at = rest.completedAt;
            if ('position' in rest) dbUpdates.position = rest.position;

            return supabase.from('timeline_items').update(dbUpdates).eq('id', id!);
        }));
    }
};
