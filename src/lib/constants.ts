// Dimensions
export const SIDEBAR_WIDTH = 350;
export const COLLAPSED_SIDEBAR_WIDTH = 0;
export const CELL_WIDTH = 180;
export const HEADER_HEIGHT = 48;
export const WORKSPACE_HEADER_HEIGHT = 36;
export const PROJECT_HEADER_HEIGHT = 40;
export const SUBPROJECT_HEADER_HEIGHT = 24;
export const ITEM_HEIGHT = 40;
export const ITEM_GAP = 4;
export const ROW_PADDING = 8;
export const ROW_BORDER_HEIGHT = 1;
export const SUBPROJECT_MIN_HEIGHT = 64;

// Configuration
export const VISIBLE_DAYS = 7;

// Animations
export const EXPAND_ANIMATION = {
    duration: 0,
    ease: 'linear' as const,
} as const;

export const COLLAPSE_ANIMATION = {
    duration: 0,
    ease: 'linear' as const,
} as const;

// Stable empty arrays to avoid re-renders (use instead of [] fallbacks)
export const EMPTY_ARRAY: readonly never[] = Object.freeze([]);
export const EMPTY_ITEMS_ARRAY: readonly import('@/types/timeline').TimelineItem[] = Object.freeze([]);
export const EMPTY_MILESTONES_ARRAY: readonly import('@/types/timeline').Milestone[] = Object.freeze([]);
export const EMPTY_SUBPROJECTS_ARRAY: readonly import('@/types/timeline').SubProject[] = Object.freeze([]);
export const EMPTY_PROJECTS_ARRAY: readonly import('@/types/timeline').Project[] = Object.freeze([]);
