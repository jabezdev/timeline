import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import { RequireAuth } from "./components/auth/RequireAuth";
import NotFound from "./pages/NotFound";

import { ThemeProvider } from "next-themes";
import { useThemeInitializer } from "./hooks/useThemeInitializer";

import { ClerkProvider } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { convex } from "./lib/convex";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable.");
}

function ThemeInitializer({ children }: { children: React.ReactNode }) {
  useThemeInitializer();
  return <>{children}</>;
}

const App = () => (
  <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
    <ConvexProviderWithClerk client={convex}>
      <ThemeProvider attribute="class" defaultTheme="system">
        <ThemeInitializer>
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
        </ThemeInitializer>
      </ThemeProvider>
    </ConvexProviderWithClerk>
  </ClerkProvider>
);

export default App;


