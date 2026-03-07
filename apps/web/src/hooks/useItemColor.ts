import { useStructureQuery } from "@/hooks/useTimelineQueries";

export function useItemColor(originalColor?: string, defaultColor: string = '#000000') {
    const { data: structure } = useStructureQuery();
    const colorMode = structure?.userSettings?.colorMode || 'full';

    // In monochromatic mode, everything uses the primary color (system accent)
    if (colorMode === 'monochromatic') {
        // We return a CSS variable here so it reacts to theme changes instantly
        // The --primary variable is already being updated by preferences-popover.tsx
        // to match the accent color in monochromatic mode.
        return 'hsl(var(--primary))';
    }

    return originalColor || defaultColor;
}
