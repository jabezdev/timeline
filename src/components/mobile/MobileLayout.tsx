import { useState } from 'react';
import { MobileTimeline } from './MobileTimeline';
import { MobileDetailView } from './MobileDetailView';
import { MobileHeader } from './MobileHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TimelineItem, Milestone, SubProject } from '@/types/timeline';
import { useTimelineData } from '@/hooks/useTimelineData';
import { useTimelineSelectors } from '@/hooks/useTimelineSelectors';

export default function MobileLayout() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeDate, setActiveDate] = useState(new Date());
    const [editingItem, setEditingItem] = useState<TimelineItem | Milestone | SubProject | null>(null);

    // Collapsible State (Lifted) - Default Empty = Collapsed
    const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

    // Data for "Expand All"
    const { data: timelineState } = useTimelineData(activeDate, 3);
    const { sortedWorkspaceIds, workspaceProjects } = useTimelineSelectors(timelineState);

    const handleCreate = () => {
        setEditingItem(null);
        setIsDrawerOpen(true);
    };

    const handleItemClick = (item: TimelineItem | Milestone | SubProject) => {
        setEditingItem(item);
        setIsDrawerOpen(true);
    };

    const handleExpandAll = () => {
        setExpandedWorkspaces(new Set(sortedWorkspaceIds));
        const allProjectIds = new Set<string>();
        sortedWorkspaceIds.forEach(wsId => {
            const projects = workspaceProjects.get(wsId) || [];
            projects.forEach(p => allProjectIds.add(p.id));
        });
        setExpandedProjects(allProjectIds);
    };

    const handleCollapseAll = () => {
        setExpandedWorkspaces(new Set());
        setExpandedProjects(new Set());
    };

    const toggleWorkspace = (wsId: string) => {
        const next = new Set(expandedWorkspaces);
        if (next.has(wsId)) next.delete(wsId);
        else next.add(wsId);
        setExpandedWorkspaces(next);
    };

    const toggleProject = (pId: string) => {
        const next = new Set(expandedProjects);
        if (next.has(pId)) next.delete(pId);
        else next.add(pId);
        setExpandedProjects(next);
    };

    return (
        <div className="h-screen w-full bg-background flex flex-col fixed inset-0 overflow-hidden">
            {/* Header (Sticky) */}
            <MobileHeader
                activeDate={activeDate}
                onDateChange={setActiveDate}
                onExpandAll={handleExpandAll}
                onCollapseAll={handleCollapseAll}
            />

            {/* Timeline Body (Scrollable) */}
            <div className="flex-1 overflow-hidden relative">
                <MobileTimeline
                    activeDate={activeDate}
                    onItemClick={handleItemClick}
                    expandedWorkspaces={expandedWorkspaces}
                    expandedProjects={expandedProjects}
                    onToggleWorkspace={toggleWorkspace}
                    onToggleProject={toggleProject}
                />
            </div>

            {/* FAB */}
            <div className="absolute bottom-6 right-6 z-[100]">
                <Button
                    size="icon"
                    className="h-14 w-14 rounded-full shadow-lg"
                    onClick={handleCreate}
                >
                    <Plus className="h-6 w-6" />
                </Button>
            </div>

            {/* Full Screen Detail View (Replaces Drawer) */}
            <MobileDetailView
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                editingItem={editingItem}
            />
        </div>
    );
}
