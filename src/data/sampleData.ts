import { Workspace } from '@/types/timeline';
import { addDays, format } from 'date-fns';

const today = new Date();

export const sampleWorkspaces: Workspace[] = [
  {
    id: 'ws-1',
    name: 'Acme Corporation',
    color: 1,
    isCollapsed: false,
    projects: [
      {
        id: 'proj-1',
        name: 'Website Redesign',
        workspaceId: 'ws-1',
        color: 1,
        milestones: [
          { id: 'ms-1', title: 'Design Phase Complete', date: format(addDays(today, 5), 'yyyy-MM-dd'), projectId: 'proj-1' },
          { id: 'ms-2', title: 'Development Sprint 1', date: format(addDays(today, 12), 'yyyy-MM-dd'), projectId: 'proj-1' },
          { id: 'ms-3', title: 'Launch', date: format(addDays(today, 20), 'yyyy-MM-dd'), projectId: 'proj-1' },
        ],
        items: [
          { id: 'task-1', title: 'Create wireframes', content: '', date: format(addDays(today, 1), 'yyyy-MM-dd'), completed: false, projectId: 'proj-1' },
          { id: 'task-2', title: 'Review brand guidelines', content: '', date: format(addDays(today, 2), 'yyyy-MM-dd'), completed: true, projectId: 'proj-1' },
          { id: 'task-3', title: 'Setup development env', content: '', date: format(addDays(today, 6), 'yyyy-MM-dd'), completed: false, projectId: 'proj-1' },
          { id: 'task-4', title: 'Build homepage', content: '', date: format(addDays(today, 8), 'yyyy-MM-dd'), completed: false, projectId: 'proj-1' },
          { id: 'note-1', title: 'Meeting Notes', content: 'Met with stakeholders - they want a modern, clean look', date: format(addDays(today, 0), 'yyyy-MM-dd'), completed: false, projectId: 'proj-1' },
          { id: 'note-2', title: 'Diary', content: 'Feeling productive today! Made great progress on the designs.', date: format(addDays(today, 3), 'yyyy-MM-dd'), completed: false, projectId: 'proj-1' },
        ],
      },
      {
        id: 'proj-2',
        name: 'Mobile App MVP',
        workspaceId: 'ws-1',
        color: 1,
        milestones: [
          { id: 'ms-4', title: 'Alpha Release', date: format(addDays(today, 15), 'yyyy-MM-dd'), projectId: 'proj-2' },
        ],
        items: [
          { id: 'task-5', title: 'Define user stories', content: '', date: format(addDays(today, 4), 'yyyy-MM-dd'), completed: false, projectId: 'proj-2' },
        ],
      },
    ],
  },
  {
    id: 'ws-2',
    name: 'University Research',
    color: 2,
    isCollapsed: false,
    projects: [
      {
        id: 'proj-3',
        name: 'PhD Thesis',
        workspaceId: 'ws-2',
        color: 2,
        milestones: [
          { id: 'ms-5', title: 'Literature Review Done', date: format(addDays(today, 10), 'yyyy-MM-dd'), projectId: 'proj-3' },
          { id: 'ms-6', title: 'First Draft', date: format(addDays(today, 25), 'yyyy-MM-dd'), projectId: 'proj-3' },
        ],
        items: [
          { id: 'task-6', title: 'Read paper on ML', content: '', date: format(addDays(today, 1), 'yyyy-MM-dd'), completed: false, projectId: 'proj-3' },
          { id: 'task-7', title: 'Write methodology section', content: '', date: format(addDays(today, 7), 'yyyy-MM-dd'), completed: false, projectId: 'proj-3' },
          { id: 'note-3', title: 'Research Note', content: 'Supervisor suggested new angle for research', date: format(addDays(today, 2), 'yyyy-MM-dd'), completed: false, projectId: 'proj-3' },
        ],
      },
    ],
  },
  {
    id: 'ws-3',
    name: 'Personal Projects',
    color: 3,
    isCollapsed: true,
    projects: [
      {
        id: 'proj-4',
        name: 'Learn Piano',
        workspaceId: 'ws-3',
        color: 3,
        milestones: [
          { id: 'ms-7', title: 'Complete Beginner Course', date: format(addDays(today, 30), 'yyyy-MM-dd'), projectId: 'proj-4' },
        ],
        items: [
          { id: 'task-8', title: 'Practice scales', content: '', date: format(addDays(today, 1), 'yyyy-MM-dd'), completed: false, projectId: 'proj-4' },
          { id: 'task-9', title: 'Learn first song', content: '', date: format(addDays(today, 14), 'yyyy-MM-dd'), completed: false, projectId: 'proj-4' },
        ],
      },
    ],
  },
];
