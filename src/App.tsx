import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import { AuthProvider } from "./components/auth/AuthProvider";
import { RequireAuth } from "./components/auth/RequireAuth";
import NotFound from "./pages/NotFound";

import { ThemeProvider } from "next-themes";
import { useThemeInitializer } from "./hooks/useThemeInitializer";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes (RAM cache)
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days (Disk cache / garbage collection)
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

function ThemeInitializer({ children }: { children: React.ReactNode }) {
  useThemeInitializer();
  return <>{children}</>;
}

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{ persister }}
  >
    <ThemeProvider attribute="class" defaultTheme="system">
      <ThemeInitializer>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={
                  <RequireAuth>
                    <Index />
                  </RequireAuth>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeInitializer>
    </ThemeProvider>
  </PersistQueryClientProvider>
);

export default App;

