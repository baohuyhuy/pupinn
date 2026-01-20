"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type CreatePaymentRequest,
  type PaymentSummary,
  PaymentType,
  PaymentMethod,
} from "@/lib/validators";
import { getPaymentSummary, createPayment } from "@/lib/api/payments";
import { useToast } from "@/hooks/use-toast";
import { Clock } from "lucide-react";

interface CheckInPaymentDialogProps {
  open: boolean;
  bookingId: string | null;
  isEarly: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (paymentData: CreatePaymentRequest) => Promise<void>;
}

export function CheckInPaymentDialog({
  open,
  bookingId,
  isEarly,
  onOpenChange,
  onConfirm,
}: CheckInPaymentDialogProps) {
  const { toast } = useToast();
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("partial");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Update current date/time every second
  useEffect(() => {
    if (open) {
      const interval = setInterval(() => {
        setCurrentDateTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [open]);

  // Load payment summary when dialog opens
  useEffect(() => {
    if (open && bookingId) {
      setIsLoadingSummary(true);
      getPaymentSummary(bookingId)
        .then((summary) => {
          setPaymentSummary(summary);
          // Pre-fill amount with remaining balance if available
          const remaining = parseFloat(summary.remaining_balance);
          if (remaining > 0) {
            setAmount(remaining.toString());
          }
        })
        .catch((error) => {
          console.error("Failed to load payment summary:", error);
        })
        .finally(() => {
          setIsLoadingSummary(false);
        });
    } else {
      // Reset form when dialog closes
      setAmount("");
      setPaymentType("partial");
      setPaymentMethod("cash");
      setNotes("");
    }
  }, [open, bookingId]);

  const getPaymentTypeColor = (type: PaymentType) => {
    switch (type) {
      case "deposit":
        return "bg-blue-500";
      case "partial":
        return "bg-yellow-500";
      case "full":
        return "bg-emerald-500";
      case "refund":
        return "bg-red-500";
      default:
        return "bg-slate-500";
    }
  };

  const formatPaymentType = (type: PaymentType) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const handleConfirm = async () => {
    if (!bookingId) return;

    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Amount must be greater than zero",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentData: CreatePaymentRequest = {
        amount,
        payment_type: paymentType,
        payment_method: paymentMethod,
        notes: notes || null,
      };

      // Create payment first
      await createPayment(bookingId, paymentData);

      // Then proceed with check-in
      await onConfirm(paymentData);
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error?.message || "Failed to record payment",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const remainingBalance = paymentSummary
    ? parseFloat(paymentSummary.remaining_balance)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            {isEarly ? "Early Check-in" : "Check-in"} - Payment
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {isEarly
              ? "The check-in date for this booking is in the future. Payment is required to proceed with early check-in."
              : "Payment is required to check in. The room status will be updated to occupied."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Date/Time Display */}
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Clock className="h-4 w-4" />
              <span>Payment Date/Time:</span>
              <span className="text-slate-100 font-medium">
                {format(currentDateTime, "MMM dd, yyyy HH:mm:ss")}
              </span>
            </div>
          </div>

          {/* Payment Summary */}
          {paymentSummary && (
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-slate-400 text-sm mb-1">Remaining Balance</p>
              <p className="text-slate-100 font-semibold">
                {formatCurrency(Math.abs(remainingBalance))}
              </p>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="bg-slate-800 border-slate-700 text-slate-100"
            />
          </div>

          {/* Payment Type */}
          <div className="space-y-2">
            <Label htmlFor="paymentType">Payment Type *</Label>
            <Select
              value={paymentType}
              onValueChange={(value) => setPaymentType(value as PaymentType)}
            >
              <SelectTrigger
                id="paymentType"
                className="bg-slate-800 border-slate-700 text-slate-100"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="partial">Partial Payment</SelectItem>
                <SelectItem value="full">Full Payment</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${getPaymentTypeColor(paymentType)} text-white`}>
                {formatPaymentType(paymentType)}
              </Badge>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <SelectTrigger
                id="paymentMethod"
                className="bg-slate-800 border-slate-700 text-slate-100"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this payment..."
              className="bg-slate-800 border-slate-700 text-slate-100"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSubmitting ? "Processing..." : "Confirm Check-in"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
