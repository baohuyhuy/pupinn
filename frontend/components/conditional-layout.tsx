"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";

/**
 * ConditionalLayout applies AppShell only to staff routes.
 * Guest routes and auth routes render children directly without the staff sidebar.
 */
export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Skip AppShell for guest routes
  if (pathname?.startsWith("/guest")) {
    return <>{children}</>;
  }

  // Skip AppShell for auth routes
  const authRoutes = ["/guest/login", "/register", "/staff/login"];
  if (authRoutes.some((route) => pathname === route || pathname?.startsWith(route))) {
    return <>{children}</>;
  }

  // Apply AppShell for staff routes
  return <AppShell>{children}</AppShell>;
}

