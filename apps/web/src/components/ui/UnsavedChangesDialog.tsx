import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface UnsavedChangesDialogProps {
    open: boolean;
    onSave: () => void;
    onDiscard: () => void;
    onCancel: () => void;
}

export function UnsavedChangesDialog({
    open,
    onSave,
    onDiscard,
    onCancel,
}: UnsavedChangesDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
                    <AlertDialogDescription>
                        You have unsaved changes. Would you like to save them before closing?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    {/* Cancel — goes back to the form */}
                    <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
                    {/* Discard — close without saving */}
                    <AlertDialogAction
                        onClick={onDiscard}
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >
                        Discard
                    </AlertDialogAction>
                    {/* Save — primary action, autoFocus so Enter triggers it */}
                    <AlertDialogAction
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        onClick={onSave}
                    >
                        Save
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
