"use client";

import { useState } from "react";
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
  type UpdatePaymentRequest,
  type Payment,
  type PaymentSummary,
  PaymentType,
  PaymentMethod,
} from "@/lib/validators";
import { useToast } from "@/hooks/use-toast";

interface PaymentFormProps {
  bookingId: string;
  paymentSummary: PaymentSummary | null;
  payment?: Payment | null; // If provided, this is an edit form
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payment: CreatePaymentRequest | UpdatePaymentRequest) => Promise<void>;
}

export function PaymentForm({
  bookingId,
  paymentSummary,
  payment,
  open,
  onOpenChange,
  onSubmit,
}: PaymentFormProps) {
  const { toast } = useToast();
  const isEdit = !!payment;

  const [amount, setAmount] = useState(() => {
    if (payment) {
      // For refunds, show positive amount but will convert to negative on submit
      return Math.abs(parseFloat(payment.amount)).toString();
    }
    return "";
  });
  const [paymentType, setPaymentType] = useState<PaymentType>(
    (payment?.payment_type as PaymentType) || "partial"
  );
  const [paymentMethod, setPaymentMethod] = useState(
    payment?.payment_method || "cash"
  );
  const [notes, setNotes] = useState(payment?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remainingBalance = paymentSummary
    ? parseFloat(paymentSummary.remaining_balance)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Amount must be greater than zero",
        variant: "destructive",
      });
      return;
    }

    // Validate refund amount
    if (paymentType === "refund") {
      const refundAmount = parseFloat(amount);
      if (refundAmount > Math.abs(remainingBalance)) {
        toast({
          title: "Validation Error",
          description: "Refund amount cannot exceed the total paid amount",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isEdit) {
        await onSubmit({
          amount: paymentType === "refund" ? `-${amount}` : amount,
          payment_type: paymentType,
          payment_method: paymentMethod,
          notes: notes || null,
        } as UpdatePaymentRequest);
      } else {
        await onSubmit({
          amount: paymentType === "refund" ? `-${amount}` : amount,
          payment_type: paymentType,
          payment_method: paymentMethod,
          notes: notes || null,
        } as CreatePaymentRequest);
      }
      // Reset form
      setAmount("");
      setPaymentType("partial");
      setPaymentMethod("cash");
      setNotes("");
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Payment" : "Record Payment"}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {isEdit
              ? "Update payment details"
              : "Record a new payment for this booking"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {paymentSummary && (
            <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
              <p className="text-slate-400 text-sm mb-1">Remaining Balance</p>
              <p className="text-slate-100 font-semibold">
                {formatCurrency(Math.abs(remainingBalance))}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="bg-slate-900 border-slate-700 text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentType">Payment Type</Label>
            <Select
              value={paymentType}
              onValueChange={(value) => setPaymentType(value as PaymentType)}
            >
              <SelectTrigger
                id="paymentType"
                className="bg-slate-900 border-slate-700 text-slate-100"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="partial">Partial Payment</SelectItem>
                <SelectItem value="full">Full Payment</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select
              value={paymentMethod}
              onValueChange={setPaymentMethod}
            >
              <SelectTrigger
                id="paymentMethod"
                className="bg-slate-900 border-slate-700 text-slate-100"
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

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this payment..."
              className="bg-slate-900 border-slate-700 text-slate-100"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="border-slate-700 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isSubmitting
                ? "Processing..."
                : isEdit
                ? "Update Payment"
                : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
