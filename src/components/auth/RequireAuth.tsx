import { useAuth } from '@/components/auth/AuthProvider';
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useTimelineStore } from '@/hooks/useTimelineStore';

export function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="h-screen w-screen flex items-center justify-center bg-background">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}
