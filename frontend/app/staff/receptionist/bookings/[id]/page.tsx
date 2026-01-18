"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, User, Calendar, BedDouble, DollarSign } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { type BookingWithRoom } from "@/components/booking-list";
import { PaymentSummary } from "@/components/payment-summary";
import { PaymentList } from "@/components/payment-list";
import { PaymentForm } from "@/components/payment-form";
import {
  createPayment,
  getPaymentsByBooking,
  getPaymentSummary,
  deletePayment,
  updatePayment,
  type CreatePaymentRequest,
  type UpdatePaymentRequest,
} from "@/lib/api/payments";
import { useToast } from "@/hooks/use-toast";
import type { Payment } from "@/lib/validators";

export default function ReceptionistBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/staff/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const response = await apiClient.get<BookingWithRoom>(`/bookings/${id}`);
      return response.data;
    },
    enabled: !!id && isAuthenticated,
  });

  const { data: paymentSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["paymentSummary", id],
    queryFn: () => getPaymentSummary(id),
    enabled: !!id && isAuthenticated,
  });

  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["payments", id],
    queryFn: () => getPaymentsByBooking(id),
    enabled: !!id && isAuthenticated,
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data: CreatePaymentRequest) => createPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", id] });
      queryClient.invalidateQueries({ queryKey: ["paymentSummary", id] });
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ paymentId, data }: { paymentId: string; data: UpdatePaymentRequest }) =>
      updatePayment(paymentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", id] });
      queryClient.invalidateQueries({ queryKey: ["paymentSummary", id] });
      toast({
        title: "Success",
        description: "Payment updated successfully",
      });
      setEditingPayment(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: string) => deletePayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", id] });
      queryClient.invalidateQueries({ queryKey: ["paymentSummary", id] });
      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const handlePaymentSubmit = async (
    data: CreatePaymentRequest | UpdatePaymentRequest
  ) => {
    if (editingPayment) {
      await updatePaymentMutation.mutateAsync({
        paymentId: editingPayment.id,
        data: data as UpdatePaymentRequest,
      });
    } else {
      await createPaymentMutation.mutateAsync(data as CreatePaymentRequest);
    }
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setPaymentFormOpen(true);
  };

  const handleDeletePayment = (paymentId: string) => {
    if (confirm("Are you sure you want to delete this payment?")) {
      deletePaymentMutation.mutate(paymentId);
    }
  };

  if (authLoading || isLoading) {
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
    <RouteGuard requiredRole="receptionist">
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
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

          {/* Payment Section */}
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-500" />
                Payments
              </h2>
              <Button
                onClick={() => {
                  setEditingPayment(null);
                  setPaymentFormOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </div>

            <PaymentSummary
              summary={paymentSummary || null}
              isLoading={isLoadingSummary}
            />

            <PaymentList
              payments={payments || []}
              isLoading={isLoadingPayments}
              onEdit={handleEditPayment}
              onDelete={handleDeletePayment}
              canEdit={true}
            />
          </div>

          <PaymentForm
            bookingId={id}
            paymentSummary={paymentSummary || null}
            payment={editingPayment}
            open={paymentFormOpen}
            onOpenChange={(open) => {
              setPaymentFormOpen(open);
              if (!open) {
                setEditingPayment(null);
              }
            }}
            onSubmit={handlePaymentSubmit}
          />
        </div>
      </div>
    </RouteGuard>
  );
}

