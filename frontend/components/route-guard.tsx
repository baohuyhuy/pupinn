"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";

/**
 * RouteGuard protects staff-only routes from guest access.
 * Redirects guest users to /guest with a toast notification.
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    // Allow access if user is admin or receptionist
    if (user && (user.role === "admin" || user.role === "receptionist")) {
      setIsChecking(false);
      return;
    }

    // Redirect guest users
    if (user && user.role === "guest") {
      toast({
        title: "Access Denied",
        description: "This page is only accessible to staff members.",
        variant: "destructive",
      });
      router.push("/guest");
      return;
    }

    // Redirect unauthenticated users to staff login
    if (!user) {
      router.push("/staff/login");
      return;
    }

    setIsChecking(false);
  }, [user, isLoading, router, pathname, toast]);

  // Show nothing while checking (prevents flash of protected content)
  if (isChecking || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // User is staff - render protected content
  return <>{children}</>;
}

