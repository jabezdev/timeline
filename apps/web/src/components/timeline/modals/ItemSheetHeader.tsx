import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TimelineItem, Milestone, SubProject } from "@/types/timeline";
import { cn } from "@/lib/utils";
import { X, Trash2, Save } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useRef, useEffect, useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ItemSheetHeaderProps {
    item: TimelineItem | Milestone | SubProject;
    title: string;
    onTitleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onTitleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onClose: () => void;
    onDelete?: (item: TimelineItem | Milestone | SubProject) => void;
    completed: boolean;
    setCompleted: (completed: boolean) => void;
    isItem: boolean;
    isMilestone: boolean;
    isSubProject: boolean;
    isDirty: boolean;
    onSave: () => void;
}

export function ItemSheetHeader({
    item,
    title,
    onTitleChange,
    onTitleKeyDown,
    onClose,
    onDelete,
    completed,
    setCompleted,
    isItem,
    isMilestone,
    isDirty,
    onSave,
}: ItemSheetHeaderProps) {
    const titleRef = useRef<HTMLTextAreaElement>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.style.height = 'auto';
            titleRef.current.style.height = titleRef.current.scrollHeight + 'px';
        }
    }, [title]);

    return (
        <>
            <SheetHeader className="p-6 pb-2 border-b border-border/10 bg-muted/20 shrink-0">
                <SheetTitle className="sr-only">Edit Item</SheetTitle>

                {/* Top Row: Type Badge & Controls */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {/* Close Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                            onClick={onClose}
                        >
                            <X className="w-4 h-4" />
                        </Button>

                        <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                            isItem ? "bg-primary/10 text-primary border-primary/20" :
                                isMilestone ? "bg-orange-500/10 text-orange-600 border-orange-500/20" :
                                    "bg-purple-500/10 text-purple-600 border-purple-500/20"
                        )}>
                            {isItem ? "Task" : isMilestone ? "Milestone" : "SubProject"}
                        </span>

                        {isItem && (
                            <div className="flex items-center gap-2 ml-2">
                                <Checkbox
                                    id="completed"
                                    checked={completed}
                                    onCheckedChange={(c) => setCompleted(!!c)}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="completed" className="text-xs font-medium cursor-pointer select-none">
                                    {completed ? "Completed" : "Active"}
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        {/* Save Button — visible when dirty */}
                        {isDirty && (
                            <Button
                                size="sm"
                                className="h-7 text-xs px-3 gap-1.5"
                                onClick={onSave}
                            >
                                <Save className="w-3 h-3" />
                                Save
                            </Button>
                        )}

                        {/* Delete Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Title Input */}
                <div className="min-h-[44px] relative">
                    <textarea
                        ref={titleRef}
                        value={title}
                        onChange={onTitleChange}
                        onKeyDown={onTitleKeyDown}
                        className="w-full text-2xl font-bold bg-transparent border-none resize-none focus:ring-0 px-0 py-1 leading-tight overflow-hidden"
                        placeholder="Title"
                        rows={1}
                        style={{ height: 'auto', minHeight: '44px' }}
                    />
                </div>
            </SheetHeader>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            // eslint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                setShowDeleteConfirm(false);
                                onDelete?.(item);
                                onClose();
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
