import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useStructureQuery } from './useTimelineQueries';

// Accent color lookup tables (mirrors Preferences.tsx constants)
const CURATED_ACCENTS: Record<string, string> = {
    ocean: 'var(--accent-ocean)',
    forest: 'var(--accent-forest)',
    violet: 'var(--accent-violet)',
    sunset: 'var(--accent-sunset)',
    berry: 'var(--accent-berry)',
    slate: 'var(--accent-slate)',
};

/**
 * Global hook that applies user preferences (theme + accent) on app initialization.
 * Must be rendered inside both ThemeProvider and QueryClientProvider.
 *
 * Solves:
 * 1. Theme not applying until Preferences dialog opens
 * 2. Accent color not applying until Preferences dialog opens
 * 3. Theme reverting on refresh (by syncing DB → next-themes on first load)
 */
export function useThemeInitializer() {
    const { data: structure } = useStructureQuery();
    const { setTheme, resolvedTheme } = useTheme();
    const userSettings = structure?.userSettings;

    // Sync theme from DB → next-themes on first load
    useEffect(() => {
        if (userSettings?.theme) {
            setTheme(userSettings.theme);
        }
    }, [userSettings?.theme, setTheme]);

    // Apply accent color CSS variables globally
    useEffect(() => {
        const currentAccent = userSettings?.systemAccent || '9';
        const colorMode = userSettings?.colorMode || 'full';

        if (colorMode === 'monochromatic' && currentAccent) {
            // Resolve accent CSS variable
            let accentVar = `var(--workspace-${currentAccent})`;

            if (CURATED_ACCENTS[currentAccent]) {
                accentVar = CURATED_ACCENTS[currentAccent];
            }

            // Determine foreground color for contrast
            let foregroundColor = '0 0% 100%'; // Default white text

            if (currentAccent === '13') {
                // Black/White accent: invert text based on theme
                foregroundColor = resolvedTheme === 'dark' ? '0 0% 0%' : '0 0% 100%';
            } else if (currentAccent === '14') {
                // Neutral: use black text for contrast on lighter gray
                foregroundColor = '0 0% 0%';
            }

            document.documentElement.style.setProperty('--primary', accentVar);
            document.documentElement.style.setProperty('--ring', accentVar);
            document.documentElement.style.setProperty('--primary-foreground', foregroundColor);
        } else {
            // Full color mode: remove accent overrides, revert to CSS theme defaults
            document.documentElement.style.removeProperty('--primary');
            document.documentElement.style.removeProperty('--ring');
            document.documentElement.style.removeProperty('--primary-foreground');
        }
    }, [userSettings?.systemAccent, userSettings?.colorMode, resolvedTheme]);
}
