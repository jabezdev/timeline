import { Project, TimelineItem, SubProject } from '@/types/timeline';

// Sidebar/Timeline layout constants
export const HEADER_HEIGHT = 48;
export const WORKSPACE_HEADER_HEIGHT = 36;
export const PROJECT_HEADER_HEIGHT = 40;

// Shared animation configuration for synchronized Timeline/Sidebar animations
export const EXPAND_ANIMATION = {
    duration: 0.25,
    ease: [0.4, 0, 0.2, 1] as const, // CSS ease-out equivalent for smooth deceleration
} as const;

export const COLLAPSE_ANIMATION = {
    duration: 0.2,
    ease: [0.4, 0, 1, 1] as const, // Faster ease-in for snappy collapse
} as const;
export const ITEM_HEIGHT = 32; // Height of a single item (py-1.5 = 12px + content ~20px)
export const ITEM_GAP = 4; // gap-1 = 4px
export const ROW_PADDING = 8; // py-1 = 4px top + 4px bottom
export const SUBPROJECT_HEADER_HEIGHT = 24; // Height of the subproject title bar
export const ROW_BORDER_HEIGHT = 1; // Border between rows
export const SUBPROJECT_MIN_HEIGHT = 64; // min-h-[64px] on SubProjectLane

// Calculate minimum row height based on number of items
export function calculateRowHeight(maxItemCount: number, baseHeight: number = 40): number {
    if (maxItemCount <= 1) return baseHeight;
    return ROW_PADDING + (maxItemCount * ITEM_HEIGHT) + ((maxItemCount) * ITEM_GAP);
}

// Calculate max items per day for main project items (not in subprojects)
export function getMaxItemsPerDay(items: TimelineItem[]): number {
    const itemsByDate = new Map<string, number>();
    items.filter(item => !item.subProjectId).forEach(item => {
        itemsByDate.set(item.date, (itemsByDate.get(item.date) || 0) + 1);
    });
    return Math.max(1, ...Array.from(itemsByDate.values()));
}

// Calculate max items per day for a specific subproject
export function getMaxItemsPerDayForSubProject(items: TimelineItem[], subProjectId: string): number {
    const itemsByDate = new Map<string, number>();
    items.filter(item => item.subProjectId === subProjectId).forEach(item => {
        itemsByDate.set(item.date, (itemsByDate.get(item.date) || 0) + 1);
    });
    return Math.max(0, ...Array.from(itemsByDate.values()));
}

// Pack subprojects into lanes to avoid overlaps
export function packSubProjects(subProjects: SubProject[]): SubProject[][] {
    if (!subProjects || subProjects.length === 0) return [];

    const sorted = [...subProjects].sort((a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    const lanes: SubProject[][] = [];

    for (const subProject of sorted) {
        const subStart = new Date(subProject.startDate).getTime();

        let placed = false;
        for (const lane of lanes) {
            const lastInLane = lane[lane.length - 1];
            const lastEnd = new Date(lastInLane.endDate).getTime();

            if (subStart > lastEnd) {
                lane.push(subProject);
                placed = true;
                break;
            }
        }

        if (!placed) {
            lanes.push([subProject]);
        }
    }

    return lanes;
}

// Calculate the total expanded content height for a project (main row + subproject lanes + borders)
export function calculateProjectExpandedHeight(project: Project, items: TimelineItem[] = [], subProjects: SubProject[] = []): {
    mainRowHeight: number;
    subProjectRowHeights: number[];
    totalHeight: number;
} {
    const subProjectLanes = packSubProjects(subProjects);

    // Main row height based on item count
    const mainRowHeight = calculateRowHeight(getMaxItemsPerDay(items));

    // SubProject lane heights - each lane has a minimum height of SUBPROJECT_MIN_HEIGHT
    const subProjectRowHeights = subProjectLanes.map(lane => {
        let maxItems = 0;
        lane.forEach(subProject => {
            const subProjectMaxItems = getMaxItemsPerDayForSubProject(items, subProject.id);
            maxItems = Math.max(maxItems, subProjectMaxItems);
        });
        // Lane height = header + items area, with a minimum total of SUBPROJECT_MIN_HEIGHT
        const calculatedHeight = SUBPROJECT_HEADER_HEIGHT + calculateRowHeight(maxItems, 40);
        return Math.max(calculatedHeight, SUBPROJECT_MIN_HEIGHT);
    });

    // Total height = main row + border + all subproject rows
    // The main row has a border-b (ROW_BORDER_HEIGHT) when there's expanded content
    const totalHeight = mainRowHeight +
        ROW_BORDER_HEIGHT + // border-b on main items row
        subProjectRowHeights.reduce((sum, h) => sum + h, 0);

    return { mainRowHeight, subProjectRowHeights, totalHeight };
}

