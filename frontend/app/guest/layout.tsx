"use client";

import { GuestAuthProvider } from "@/components/guest-auth-provider";
import { GuestNav } from "@/components/guest-nav";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getGuestToken } from "@/lib/guest-auth";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  
  // Determine if it's the login page
  const isLoginPage = pathname === "/guest/login";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check authentication logic
  useEffect(() => {
    if (!isMounted) return;
    
    const isAuthenticated = !!getGuestToken();
    if (!isAuthenticated && !isLoginPage) {
      router.push("/guest/login");
    }
  }, [isMounted, isLoginPage, router]);

  return (
    <GuestAuthProvider>
      {/*  decide purely on visual layout */}
      {(!isMounted || isLoginPage) ? (
        // Render simple children for login page or loading state
        <>{children}</>
      ) : (
        // Render full dashboard layout for authenticated pages
        <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
          <GuestNav />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      )}
    </GuestAuthProvider>
  );
}