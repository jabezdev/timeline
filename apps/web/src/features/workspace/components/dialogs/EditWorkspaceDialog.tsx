import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Workspace } from '@/types/timeline';

const COLORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function EditWorkspaceDialog({ workspace, onEdit }: { workspace: Workspace; onEdit: (updates: Partial<Workspace>) => void }) {
    const [name, setName] = useState(workspace.name);
    const [color, setColor] = useState(Number(workspace.color));
    const [open, setOpen] = useState(false);

    const handleSubmit = () => {
        if (!name.trim()) return;
        onEdit({ name: name.trim(), color: String(color) });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="p-1 hover:bg-secondary rounded">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>Edit Organization</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Color</Label>
                        <div className="col-span-3 grid grid-cols-6 gap-2">
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-6 h-6 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                                    style={{ backgroundColor: `hsl(var(--workspace-${c}))` }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={!name.trim()}>Save</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
