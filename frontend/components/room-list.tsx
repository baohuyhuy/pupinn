"use client";

import { useState } from "react";
import { Home, Wrench, User, Edit, Sparkles, AlertCircle, HelpCircle } from "lucide-react"; // Added missing icons

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { RoomForm } from "@/app/staff/admin/rooms/room-form";
import { type Room, type RoomStatus, type RoomType } from "@/lib/validators";

interface RoomListProps {
  rooms: Room[];
  isLoading: boolean;
  error: Error | null;
  onRoomUpdated: () => void;
  isAdmin: boolean;
}

export function RoomList({
  rooms,
  isLoading,
  error,
  onRoomUpdated,
  isAdmin,
}: RoomListProps) {
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const getStatusBadge = (status: RoomStatus | string) => {
    const variants: Record<
      string,
      { className: string; label: string; icon: React.ReactNode }
    > = {
      available: {
        className: "bg-emerald-500 hover:bg-emerald-600",
        label: "Available",
        icon: <Home className="h-3 w-3 mr-1" />,
      },
      occupied: {
        className: "bg-blue-500 hover:bg-blue-600",
        label: "Occupied",
        icon: <User className="h-3 w-3 mr-1" />,
      },
      maintenance: {
        className: "bg-slate-500 hover:bg-slate-600", // Changed to slate for better visibility
        label: "Maintenance",
        icon: <Wrench className="h-3 w-3 mr-1" />,
      },
      dirty: {
        className: "bg-red-500 hover:bg-red-600",
        label: "Dirty",
        icon: <AlertCircle className="h-3 w-3 mr-1" />,
      },
      cleaning: {
        className: "bg-amber-500 hover:bg-amber-600",
        label: "Cleaning",
        icon: <Sparkles className="h-3 w-3 mr-1" />,
      },
    };

    // 👇 SAFETY CHECK: Fallback if status is still unknown
    const variant = variants[status] || {
      className: "bg-gray-500",
      label: status || "Unknown",
      icon: <HelpCircle className="h-3 w-3 mr-1" />,
    };

    return (
      <Badge className={`${variant.className} text-white`}>
        {variant.icon}
        {variant.label}
      </Badge>
    );
  };

  const getRoomTypeLabel = (type: RoomType | string) => {
    const labels: Record<string, string> = {
      single: "Single",
      double: "Double",
      suite: "Suite",
    };
    return labels[type] || type;
  };

  const handleEditSuccess = () => {
    setEditingRoom(null);
    onRoomUpdated();
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="p-8 text-center text-slate-400">
          Loading rooms...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="p-8 text-center text-red-400">
          Failed to load rooms. Please try again.
        </CardContent>
      </Card>
    );
  }

  if (!rooms || rooms.length === 0) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="p-8 text-center text-slate-400">
          <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No rooms found</p>
          <p className="text-sm mt-1">Add a new room to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-slate-800/80 border-slate-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-700/50">
                <TableHead className="text-slate-400">Room</TableHead>
                <TableHead className="text-slate-400">Type</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                {isAdmin && (
                  <TableHead className="text-slate-400">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => (
                <TableRow
                  key={room.id}
                  className="border-slate-700 hover:bg-slate-700/30"
                >
                  <TableCell className="font-semibold text-slate-100">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-slate-400" />
                      Room {room.number}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {getRoomTypeLabel(room.room_type)}
                  </TableCell>
                  <TableCell>{getStatusBadge(room.status)}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRoom(room)}
                        className="text-slate-400 hover:text-slate-100"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Room Dialog */}
      <Dialog open={!!editingRoom} onOpenChange={() => setEditingRoom(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Edit Room</DialogTitle>
          </DialogHeader>
          {editingRoom && (
            <RoomForm
              room={editingRoom}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingRoom(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}