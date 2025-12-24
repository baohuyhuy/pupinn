"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { type Room, type RoomStatus } from "@/lib/validators";
import { getErrorMessage } from "@/lib/api-client";
import { RoomStatusBadge } from "@/components/room-status-badge";

interface CleanerDashboardProps {
  rooms: Room[];
  isLoading: boolean;
  error: Error | null;
  onStatusUpdate: (roomId: string, status: RoomStatus) => void;
  isUpdating: boolean;
}

export function CleanerDashboard({
  rooms,
  isLoading,
  error,
  onStatusUpdate,
  isUpdating,
}: CleanerDashboardProps) {
  const { toast } = useToast();
  const [updatingRoomId, setUpdatingRoomId] = useState<string | null>(null);

  const getRoomTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      single: "Single",
      double: "Double",
      suite: "Suite",
    };
    return labels[type] || type;
  };

  const getNextStatus = (currentStatus: RoomStatus): RoomStatus | null => {
    switch (currentStatus) {
      case "dirty":
        return "cleaning";
      case "cleaning":
        return "available";
      default:
        return null;
    }
  };

  const getStatusButtonLabel = (currentStatus: RoomStatus): string => {
    switch (currentStatus) {
      case "dirty":
        return "Start Cleaning";
      case "cleaning":
        return "Mark as Available";
      default:
        return "Update Status";
    }
  };

  const handleStatusUpdate = async (roomId: string, currentStatus: RoomStatus) => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) {
      toast({
        title: "Invalid Action",
        description: "This room status cannot be updated from the cleaner dashboard.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingRoomId(roomId);
    try {
      onStatusUpdate(roomId, nextStatus);
      toast({
        title: "Status Updated",
        description: `Room status updated to ${nextStatus}.`,
      });
    } catch (err) {
      toast({
        title: "Update Failed",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setUpdatingRoomId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-red-400 mb-2">Error loading rooms</p>
            <p className="text-slate-400 text-sm">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rooms.length === 0) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-slate-400">No rooms need attention right now.</p>
            <p className="text-slate-500 text-sm mt-2">
              You&apos;ll see Dirty or Cleaning rooms here when they need work.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter to show dirty, cleaning and available rooms
  const relevantRooms = rooms.filter(
    (room) => room.status === "dirty" 
           || room.status === "cleaning"
           || room.status === "available"
  );

  return (
    <Card className="bg-slate-800/80 border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100">Rooms Needing Attention</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-slate-300">Room Number</TableHead>
                <TableHead className="text-slate-300">Type</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
                <TableHead className="text-slate-300">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relevantRooms.map((room) => {
                const nextStatus = getNextStatus(room.status);
                const isUpdatingThisRoom = updatingRoomId === room.id || isUpdating;

                return (
                  <TableRow key={room.id} className="border-slate-700">
                    <TableCell className="text-slate-100 font-medium">
                      {room.number}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {getRoomTypeLabel(room.room_type)}
                    </TableCell>
                    <TableCell>
                      <RoomStatusBadge status={room.status} />
                    </TableCell>
                    <TableCell>
                      {nextStatus ? (
                        <Button
                          onClick={() => handleStatusUpdate(room.id, room.status)}
                          disabled={isUpdatingThisRoom}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
                          size="sm"
                        >
                          {isUpdatingThisRoom
                            ? "Updating..."
                            : getStatusButtonLabel(room.status)}
                        </Button>
                      ) : (
                        <span className="text-slate-500 text-sm">No action available</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

