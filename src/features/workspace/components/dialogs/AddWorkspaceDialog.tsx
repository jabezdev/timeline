import { useState } from 'react';
import { Plus } from 'lucide-react';
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

const COLORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function AddWorkspaceDialog({ onAdd }: { onAdd: (name: string, color: number) => void }) {
    const [name, setName] = useState('');
    const [color, setColor] = useState(1);
    const [open, setOpen] = useState(false);

    const handleSubmit = () => {
        if (!name.trim()) return;
        onAdd(name.trim(), color);
        setName('');
        setColor(1);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Org
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>Add Organization</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            placeholder="e.g. Acme Corp"
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
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!name.trim()}>Add</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
