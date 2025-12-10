"use client";

import { format } from "date-fns";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/components/auth-provider";
import { isAuthRoute } from "@/lib/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  // Prevent flash by waiting for auth state to load
  useEffect(() => {
    if (!isLoading) {
      setIsReady(true);
    }
  }, [isLoading]);

  // Safety check: Don't render AppShell on auth routes
  // (ConditionalLayout should already prevent this, but defense-in-depth)
  if (isAuthRoute(pathname)) {
    return <>{children}</>;
  }

  // Show loading state to prevent sidebar flash
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-1 flex-col bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-slate-900/70 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="lg:hidden" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
                Pupinn
              </p>
              <p className="text-sm text-slate-300">
                {format(new Date(), "EEEE, MMMM d")}
              </p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{user?.username ?? "Team Member"}</p>
            <p className="text-slate-400">Shift in progress</p>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">{children}</main>
      </div>
    </SidebarProvider>
  );
}
