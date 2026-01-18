"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { CleanerDashboard } from "@/components/cleaner-dashboard";
import { apiClient, getErrorMessage, listEmployees } from "@/lib/api-client";
import { type Room, type RoomStatus } from "@/lib/validators";

export default function AdminHousekeepingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/staff/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const {
    data: rooms,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["cleaner-rooms"],
    queryFn: async () => {
      // Use regular /rooms endpoint for admin (not cleaner-specific endpoint)
      const [dirtyRooms, cleaningRooms, availableRooms] = await Promise.all([
        apiClient.get<Room[]>("/rooms", { params: { status: "dirty" } }).then(r => r.data),
        apiClient.get<Room[]>("/rooms", { params: { status: "cleaning" } }).then(r => r.data),
        apiClient.get<Room[]>("/rooms", { params: { status: "available" } }).then(r => r.data),
      ]);
      return [...dirtyRooms, ...cleaningRooms, ...availableRooms];
    },
    enabled: isAuthenticated,
  });

  // Fetch cleaners for assignment dropdown
  const { data: cleanersData } = useQuery({
    queryKey: ["cleaners-list"],
    queryFn: () => listEmployees({ role: "cleaner" }),
    enabled: isAuthenticated,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ roomId, status }: { roomId: string; status: RoomStatus }) => {
      // Use regular /rooms/:id endpoint for admin
      const response = await apiClient.patch<Room>(`/rooms/${roomId}`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cleaner-rooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === "availableRooms" 
      });
    },
  });

  const assignCleanerMutation = useMutation({
    mutationFn: async ({ roomId, cleanerId }: { roomId: string; cleanerId: string }) => {
      const response = await apiClient.patch<Room>(`/rooms/${roomId}`, { 
        assigned_cleaner_id: cleanerId 
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cleaner-rooms"] });
    },
  });

  const handleStatusUpdate = (roomId: string, status: RoomStatus) => {
    updateStatusMutation.mutate({ roomId, status });
  };

  const handleAssignCleaner = (roomId: string, cleanerId: string) => {
    assignCleanerMutation.mutate({ roomId, cleanerId });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <RouteGuard requiredRole="admin">
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-100">Housekeeping</h1>
            <p className="text-slate-400 mt-1">Manage room cleaning tasks</p>
          </div>

          <CleanerDashboard
            rooms={rooms || []}
            cleaners={cleanersData?.employees}
            isLoading={isLoading}
            error={error ? new Error(getErrorMessage(error)) : null}
            onStatusUpdate={handleStatusUpdate}
            onAssignCleaner={handleAssignCleaner}
            isUpdating={updateStatusMutation.isPending || assignCleanerMutation.isPending}
          />
        </div>
      </div>
    </RouteGuard>
  );
}

