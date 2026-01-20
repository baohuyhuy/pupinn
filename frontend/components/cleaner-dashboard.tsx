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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { type Room, type RoomStatus, type Employee } from "@/lib/validators";
import { getErrorMessage } from "@/lib/api-client";
import { RoomStatusBadge } from "@/components/room-status-badge";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";

interface CleanerDashboardProps {
  rooms: Room[];
  cleaners?: Employee[];
  isLoading: boolean;
  error: Error | null;
  onStatusUpdate: (roomId: string, status: RoomStatus) => void;
  onAssignCleaner?: (roomId: string, cleanerId: string) => void;
  isUpdating: boolean;
}

export function CleanerDashboard({
  rooms,
  cleaners,
  isLoading,
  error,
  onStatusUpdate,
  onAssignCleaner,
  isUpdating,
}: CleanerDashboardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
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

  const handleAssign = (roomId: string, cleanerId: string) => {
    if (onAssignCleaner) {
      setUpdatingRoomId(roomId);
      try {
        onAssignCleaner(roomId, cleanerId);
        toast({
          title: "Cleaner Assigned",
          description: "Task has been assigned successfully.",
        });
      } catch (err) {
        toast({
          title: "Assignment Failed",
          description: getErrorMessage(err),
          variant: "destructive",
        });
      } finally {
        setUpdatingRoomId(null);
      }
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

  // Logic for displaying rooms
  let relevantRooms = rooms;
  
  // If user is a cleaner, only show rooms assigned to them AND needing attention
  if (user?.role === 'cleaner') {
    relevantRooms = rooms.filter(
      (room) => (room.status === "dirty" || room.status === "cleaning") && 
                room.assigned_cleaner_id === user.id
    );
  } else {
    // For admin, show all relevant housekeeping rooms
    relevantRooms = rooms.filter(
      (room) => room.status === "dirty" 
             || room.status === "cleaning"
             || room.status === "available"
    );
  }

  if (relevantRooms.length === 0) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-slate-400">No rooms need attention right now.</p>
            <p className="text-slate-500 text-sm mt-2">
              {user?.role === 'cleaner' 
                ? "You have no assigned tasks." 
                : "You'll see Dirty or Cleaning rooms here when they need work."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/80 border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100">
          {user?.role === 'cleaner' ? "My Tasks" : "Rooms Needing Attention"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-slate-300">Room Number</TableHead>
                <TableHead className="text-slate-300">Type</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
                {user?.role === 'admin' && (
                   <TableHead className="text-slate-300">Assigned To</TableHead>
                )}
                <TableHead className="text-slate-300">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relevantRooms.map((room) => {
                const nextStatus = getNextStatus(room.status);
                const isUpdatingThisRoom = updatingRoomId === room.id || isUpdating;
                
                // Find assigned cleaner name if list is available
                const assignedCleaner = cleaners?.find(c => c.id === room.assigned_cleaner_id);
                const cleanerName = assignedCleaner?.full_name || assignedCleaner?.username || "Unassigned";

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
                    
                    {user?.role === 'admin' && (
                      <TableCell>
                        {(room.status === 'dirty' || room.status === 'cleaning') ? (
                          <div className="flex items-center gap-2">
                            <Select 
                              value={room.assigned_cleaner_id || undefined} 
                              onValueChange={(val) => handleAssign(room.id, val)}
                              disabled={isUpdatingThisRoom}
                            >
                              <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-slate-300">
                                <SelectValue placeholder="Assign Cleaner" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                                {cleaners?.map((cleaner) => (
                                  <SelectItem key={cleaner.id} value={cleaner.id}>
                                    {cleaner.full_name || cleaner.username}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-sm">-</span>
                        )}
                      </TableCell>
                    )}

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

