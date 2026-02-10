import { useState, useCallback, useRef, useEffect } from 'react';
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { TimelineItem, Milestone, SubProject } from "@/types/timeline";
import { useTimelineMutations } from "@/hooks/useTimelineMutations";
import { QuickEditContent } from './QuickEditContent';

interface QuickEditPopoverProps {
    item: TimelineItem | Milestone | SubProject;
    availableSubProjects?: SubProject[];
    children?: React.ReactNode;
    className?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;

    anchorRect?: DOMRect | { x: number; y: number; width: number; height: number; top: number; left: number; right: number; bottom: number; toJSON: () => unknown };
}

export function QuickEditPopover({
    item,
    availableSubProjects = [],
    children,
    className,
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    anchorRect
}: QuickEditPopoverProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

    const mutations = useTimelineMutations();

    const isMilestone = !('completed' in item) && !('startDate' in item);
    const isSubProject = 'startDate' in item;
    const isItem = 'completed' in item;

    // Save Logic
    const handleSave = useCallback((updates: Partial<TimelineItem | Milestone | SubProject>) => {
        if (isItem) {
            mutations.updateItem.mutate({ id: item.id, updates });
        } else if (isMilestone) {
            mutations.updateMilestone.mutate({ id: item.id, updates });
        } else if (isSubProject) {
            mutations.updateSubProject.mutate({ id: item.id, updates });
        }
    }, [isItem, isMilestone, isSubProject, item.id, mutations]);

    const handleDelete = () => {
        if (isItem) {
            mutations.deleteItem.mutate(item.id);
        } else if (isMilestone) {
            mutations.deleteMilestone.mutate(item.id);
        } else if (isSubProject) {
            mutations.deleteSubProject.mutate({ id: item.id, deleteItems: false });
        }
        setOpen(false);
    };

    const virtualAnchor = useRef({
        getBoundingClientRect: () => ({
            width: 0,
            height: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            x: 0,
            y: 0,
            toJSON: () => { },
        }),
    });

    useEffect(() => {
        if (anchorRect) {
            virtualAnchor.current.getBoundingClientRect = () => anchorRect;
        }
    }, [anchorRect]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            {anchorRect ? (
                <PopoverAnchor virtualRef={virtualAnchor} />
            ) : (
                <PopoverAnchor asChild>
                    <div className={className}>
                        {children}
                    </div>
                </PopoverAnchor>
            )}
            <PopoverContent
                className="w-auto p-0 bg-transparent border-none shadow-none"
                align="center"
                side="bottom"
                sideOffset={8}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-transparent"> {/* Wrapper to avoid style conflits if any */}
                    <QuickEditContent
                        item={item}
                        availableSubProjects={availableSubProjects}
                        onSave={handleSave}
                        onDelete={handleDelete}
                        onClose={() => setOpen(false)}
                    />
                </div>
            </PopoverContent>
        </Popover >
    );
}
