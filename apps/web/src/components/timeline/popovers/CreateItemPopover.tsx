import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus } from "lucide-react";
import { Project, SubProject } from '@/types/timeline';
import { CreateItemContent } from './CreateItemContent';

interface CreateItemPopoverProps {
    onAddItem: (title: string, date: string, projectId: string, subProjectId?: string, color?: number) => void;
    onAddMilestone: (projectId: string, title: string, date: string, color?: number) => void;
    onAddSubProject: (projectId: string, title: string, startDate: string, endDate: string, color?: number) => void;
    projects: (Project & { workspaceName?: string })[];
    subProjects: { id: string; title: string; projectId: string }[];
    activeProjectId?: string;
    trigger?: React.ReactNode;
}

export function CreateItemPopover({
    onAddItem,
    onAddMilestone,
    onAddSubProject,
    projects,
    subProjects,
    activeProjectId,
    trigger
}: CreateItemPopoverProps) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {trigger || (
                    <Button
                        className="fixed bottom-4 right-4 w-12 h-12 rounded-full shadow-lg z-50 p-0"
                    >
                        <Plus className="w-6 h-6" />
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end" side="top">
                <CreateItemContent
                    onAddItem={onAddItem}
                    onAddMilestone={onAddMilestone}
                    onAddSubProject={onAddSubProject}
                    projects={projects}
                    subProjects={subProjects}
                    activeProjectId={activeProjectId}
                    onClose={() => setOpen(false)}
                />
            </PopoverContent>
        </Popover>
    );
}
