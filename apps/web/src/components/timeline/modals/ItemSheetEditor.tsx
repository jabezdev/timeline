import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Eye,
    Columns,
    Edit,
    Bold,
    Italic,
    List,
    ListOrdered,
    CheckSquare,
} from "lucide-react";
import { useRef } from "react";

interface ItemSheetEditorProps {
    content: string;
    viewMode: 'edit' | 'split' | 'preview';
    onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onViewModeChange: (value: 'edit' | 'split' | 'preview') => void;
}

export function ItemSheetEditor({
    content,
    viewMode,
    onContentChange,
    onViewModeChange
}: ItemSheetEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    return (
        <div className="flex-1 flex flex-col min-h-0 relative">
            {(viewMode === 'edit' || viewMode === 'split') && (
                <Textarea
                    ref={textareaRef}
                    value={content}
                    onChange={onContentChange}
                    placeholder="Add details, notes, or tasks..."
                    className={cn(
                        "flex-1 border-none shadow-none focus-visible:ring-0 resize-none p-6 font-mono text-sm bg-transparent",
                        viewMode === 'split' ? "h-1/2 border-b" : "h-full"
                    )}
                />
            )}

            {(viewMode === 'preview' || viewMode === 'split') && (
                <div className={cn(
                    "overflow-y-auto p-6 prose prose-sm dark:prose-invert max-w-none bg-secondary/10 break-words",
                    viewMode === 'split' ? "h-1/2" : "h-full"
                )}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content || "*No content provided*"}
                    </ReactMarkdown>
                </div>
            )}

            {/* Toolbar */}
            <div className="p-2 border-t bg-background/50 flex items-center justify-between shrink-0">
                <EditorToolbar
                    insertMarkdown={(p, s) => {
                        if (!textareaRef.current) return;
                        const start = textareaRef.current.selectionStart;
                        const end = textareaRef.current.selectionEnd;
                        const text = textareaRef.current.value;
                        const newText = text.substring(0, start) + p + text.substring(start, end) + s + text.substring(end);

                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                        if (nativeInputValueSetter && textareaRef.current) {
                            nativeInputValueSetter.call(textareaRef.current, newText);
                            const ev = new Event('input', { bubbles: true });
                            textareaRef.current.dispatchEvent(ev);
                        }

                        // Restore focus
                        setTimeout(() => {
                            textareaRef.current?.focus();
                            textareaRef.current?.setSelectionRange(start + p.length, end + p.length);
                        }, 0);
                    }}
                />

                <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && onViewModeChange(v as 'edit' | 'split' | 'preview')}>
                    <ToggleGroupItem value="edit" size="sm" className="h-8 w-8"><Edit className="w-4 h-4" /></ToggleGroupItem>
                    <ToggleGroupItem value="split" size="sm" className="h-8 w-8"><Columns className="w-4 h-4" /></ToggleGroupItem>
                    <ToggleGroupItem value="preview" size="sm" className="h-8 w-8"><Eye className="w-4 h-4" /></ToggleGroupItem>
                </ToggleGroup>
            </div>
        </div>
    );
}

function EditorToolbar({ insertMarkdown }: { insertMarkdown: (prefix: string, suffix?: string) => void }) {
    return (
        <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('**', '**')}><Bold className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('*', '*')}><Italic className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('- ')}><List className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('1. ')}><ListOrdered className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => insertMarkdown('- [ ] ')}><CheckSquare className="w-4 h-4" /></Button>
        </div>
    );
}
