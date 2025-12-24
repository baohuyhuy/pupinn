"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BedDouble } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGuestAuth } from "@/components/guest-auth-provider";
import { RoomList } from "@/components/room-list";
import { apiClient } from "@/lib/api-client";
import { type Room } from "@/lib/validators";

export default function GuestRoomsPage() {
  const { user, isLoading: authLoading } = useGuestAuth();
  const [statusFilter, setStatusFilter] = useState<string>("available");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const {
    data: rooms,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["rooms", statusFilter, typeFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter && statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (typeFilter && typeFilter !== "all") {
        params.room_type = typeFilter;
      }
      const response = await apiClient.get<Room[]>("/rooms", { params });
      return response.data;
    },
    enabled: !authLoading && !!user,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  // Calculate room stats (only available rooms for guests)
  const availableRooms = rooms?.filter((r) => r.status === "available") || [];
  const stats = {
    total: availableRooms.length,
    single: availableRooms.filter((r) => r.room_type === "single").length,
    double: availableRooms.filter((r) => r.room_type === "double").length,
    suite: availableRooms.filter((r) => r.room_type === "suite").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/guest">
          <Button variant="ghost" size="icon" className="text-slate-400">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Available Rooms</h1>
          <p className="text-slate-400">
            Browse our selection of comfortable accommodations
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-100">
              {stats.total}
            </div>
            <div className="text-sm text-slate-400">Available Rooms</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-400">
              {stats.single}
            </div>
            <div className="text-sm text-slate-400">Single</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-400">
              {stats.double}
            </div>
            <div className="text-sm text-slate-400">Double</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-400">
              {stats.suite}
            </div>
            <div className="text-sm text-slate-400">Suite</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-[180px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-slate-100">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="available" className="text-slate-100">
                    Available Only
                  </SelectItem>
                  <SelectItem value="all" className="text-slate-100">
                    All Rooms
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-slate-100">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-slate-100">
                    All Types
                  </SelectItem>
                  <SelectItem value="single" className="text-slate-100">
                    Single
                  </SelectItem>
                  <SelectItem value="double" className="text-slate-100">
                    Double
                  </SelectItem>
                  <SelectItem value="suite" className="text-slate-100">
                    Suite
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Room List - Read-only for guests */}
      <RoomList
        rooms={rooms || []}
        isLoading={isLoading}
        error={error as Error | null}
        onRoomUpdated={() => {}}
        isAdmin={false}
      />

      {/* Call to Action */}
      <Card className="bg-linear-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">
                Ready to book?
              </h3>
              <p className="text-slate-400">
                Select your preferred dates and room to make a reservation
              </p>
            </div>
            <Link href="/guest/bookings/new">
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-900">
                <BedDouble className="h-4 w-4 mr-2" />
                Book a Room
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

