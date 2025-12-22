// Dimensions
export const SIDEBAR_WIDTH = 300;
export const COLLAPSED_SIDEBAR_WIDTH = 0;
export const CELL_WIDTH = 180;
export const HEADER_HEIGHT = 48;
export const WORKSPACE_HEADER_HEIGHT = 36;
export const PROJECT_HEADER_HEIGHT = 40;
export const SUBPROJECT_HEADER_HEIGHT = 24;
export const ITEM_HEIGHT = 32;
export const ITEM_GAP = 4;
export const ROW_PADDING = 8;
export const ROW_BORDER_HEIGHT = 1;
export const SUBPROJECT_MIN_HEIGHT = 64;

// Configuration
export const VISIBLE_DAYS = 21;

// Animations
export const EXPAND_ANIMATION = {
    duration: 0,
    ease: 'linear' as const,
} as const;

export const COLLAPSE_ANIMATION = {
    duration: 0,
    ease: 'linear' as const,
} as const;
