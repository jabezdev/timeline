import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, FolderKanban, Eye, EyeOff, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project } from '@/types/timeline';
import { EditProjectDialog } from './dialogs/EditProjectDialog';

interface SortableProjectItemProps {
    project: Project;
    workspaceColor: number;
    onEdit: (updates: Partial<Project>) => void;
    onDelete: () => void;
    onToggleHidden: () => void;
}

export function SortableProjectItem({ project, workspaceColor, onEdit, onDelete, onToggleHidden }: SortableProjectItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: project.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group flex items-center gap-2 p-2 ml-6 rounded hover:bg-secondary/50"
        >
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab hover:bg-secondary rounded p-0.5 touch-none"

            >
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
            </button>

            <FolderKanban
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: `hsl(var(--workspace-${workspaceColor}))` }}
            />

            <span className={cn("flex-1 text-xs truncate", project.isHidden && "text-muted-foreground/50 italic")}>{project.name}</span>

            <EditProjectDialog project={project} onEdit={onEdit} />

            <button onClick={onToggleHidden} className="p-0.5 hover:bg-secondary rounded opacity-0 group-hover:opacity-100 transition-opacity" title={project.isHidden ? "Show Project" : "Hide Project"}>
                {project.isHidden ? (
                    <EyeOff className="w-3 h-3 text-muted-foreground/70" />
                ) : (
                    <Eye className="w-3 h-3 text-muted-foreground" />
                )}
            </button>
            <button onClick={onDelete} className="p-0.5 hover:bg-destructive/10 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-3 h-3 text-destructive" />
            </button>
        </div>
    );
}
