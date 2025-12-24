"use client";

import { useEffect, useState, use } from "react"; // Added 'use' for params unwrapping
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, User, Calendar, BedDouble, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/auth-provider";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { type BookingWithRoom } from "@/components/booking-list"; // Reuse type if exported, or redefine
import { RouteGuard } from "@/components/route-guard";

// If you didn't export BookingWithRoom from booking-list.tsx, uncomment below:
/*
interface BookingWithRoom {
  id: string;
  reference: string;
  guest_name: string;
  status: "upcoming" | "checked_in" | "checked_out" | "cancelled";
  check_in_date: string;
  check_out_date: string;
  room: {
    id: string;
    number: string;
    room_type: string;
  } | null;
}
*/

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params using React.use()
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const response = await apiClient.get<BookingWithRoom>(`/bookings/${id}`);
      return response.data;
    },
    enabled: !!id && isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-900 p-8 flex flex-col items-center justify-center">
        <h1 className="text-red-500 text-xl mb-4">Error loading booking</h1>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming": return "bg-blue-500";
      case "checked_in": return "bg-emerald-500";
      case "checked_out": return "bg-slate-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-slate-500";
    }
  };

  return (
    <RouteGuard>
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.back()}
              className="text-slate-400 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                Booking Details
                <Badge className={`${getStatusColor(booking.status)} hover:${getStatusColor(booking.status)}`}>
                  {booking.status.replace("_", " ")}
                </Badge>
              </h1>
              <p className="text-slate-400 text-sm">Reference: {booking.reference}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Guest Info */}
            <Card className="bg-slate-800/80 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <User className="h-5 w-5 text-amber-500" />
                  Guest Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-slate-400 text-sm">Guest Name</p>
                  <p className="text-slate-100 font-medium text-lg">{booking.guest_name}</p>
                </div>
              </CardContent>
            </Card>

            {/* Room Info */}
            <Card className="bg-slate-800/80 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-blue-500" />
                  Room Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-slate-400 text-sm">Room Number</p>
                    <p className="text-slate-100 font-medium text-lg">
                      {booking.room ? `Room ${booking.room.number}` : "Unassigned"}
                    </p>
                  </div>
                  {booking.room && (
                    <Badge variant="outline" className="text-slate-300 border-slate-600 capitalize">
                      {booking.room.room_type}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dates & Timeline */}
            <Card className="md:col-span-2 bg-slate-800/80 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-500" />
                  Stay Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-slate-900/50">
                  <div className="text-center sm:text-left">
                    <p className="text-slate-400 text-sm mb-1">Check-in</p>
                    <p className="text-slate-100 font-semibold text-lg">
                      {format(new Date(booking.check_in_date), "MMM dd, yyyy")}
                    </p>
                  </div>
                  
                  <div className="h-px w-full sm:w-24 bg-slate-600/50 hidden sm:block"></div>
                  
                  <div className="text-center sm:text-right">
                    <p className="text-slate-400 text-sm mb-1">Check-out</p>
                    <p className="text-slate-100 font-semibold text-lg">
                      {format(new Date(booking.check_out_date), "MMM dd, yyyy")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </RouteGuard>
  );
}