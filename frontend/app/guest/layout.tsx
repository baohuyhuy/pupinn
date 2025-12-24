"use client";

import { GuestAuthProvider } from "@/components/guest-auth-provider";
import { GuestNav } from "@/components/guest-nav";
import { useMemo } from "react";
import { redirect } from "next/navigation";
import { getGuestToken } from "@/lib/guest-auth";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check authentication synchronously on initial render
  const isAuthenticated = useMemo(() => {
    if (typeof window === "undefined") return true; // SSR - assume authenticated
    return !!getGuestToken();
  }, []);

  // Redirect if not authenticated (client-side only)
  if (typeof window !== "undefined" && !isAuthenticated) {
    redirect("/guest/login");
  }

  return (
    <GuestAuthProvider>
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <GuestNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </GuestAuthProvider>
  );
}
