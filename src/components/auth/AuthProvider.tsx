/**
 * AuthProvider — Clerk-backed auth.
 *
 * Exposes a `useAuth()` hook that returns a surface compatible with the
 * previous Supabase-based implementation so call-sites need minimal changes.
 *
 * NOTE: The actual <ClerkProvider> wrapper lives in App.tsx.
 *       This file only re-exports Clerk primitives in the app's expected shape.
 */
import { useClerk, useUser } from '@clerk/clerk-react';

interface AppAuthContext {
    user: { id: string; email?: string } | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AppAuthContext {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();

    return {
        user: user ? { id: user.id, email: user.primaryEmailAddress?.emailAddress } : null,
        loading: !isLoaded,
        signOut: () => signOut(),
    };
}

// Kept for backwards compat — components that import AuthProvider as a tag
// (none should remain after the migration, but just in case)
export function AuthProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
