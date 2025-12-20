import Dexie, { Table } from 'dexie';
import { Workspace, Project, SubProject, Milestone, TimelineItem } from '@/types/timeline';

export class TimelineDatabase extends Dexie {
    workspaces!: Table<Workspace>;
    projects!: Table<Project>;
    subProjects!: Table<SubProject>;
    milestones!: Table<Milestone>;
    items!: Table<TimelineItem>;
    userSettings!: Table<{ userId: string; workspaceOrder: string[]; openProjectIds: string[] }>;

    constructor() {
        super('TimelineDB');
        this.version(1).stores({
            workspaces: 'id, &name',
            projects: 'id, workspaceId, position',
            subProjects: 'id, projectId',
            milestones: 'id, projectId',
            items: 'id, projectId, subProjectId',
            userSettings: 'userId' // Primary key
        });
    }
}

export const db = new TimelineDatabase();
