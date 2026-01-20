"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type PaymentSummary } from "@/lib/validators";
import { DollarSign, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface PaymentSummaryProps {
  summary: PaymentSummary | null;
  isLoading?: boolean;
}

export function PaymentSummary({ summary, isLoading }: PaymentSummaryProps) {
  if (isLoading) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-500" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="h-4 bg-slate-700 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const totalPrice = parseFloat(summary.total_price);
  const totalPaid = parseFloat(summary.total_paid);
  const remaining = parseFloat(summary.remaining_balance);

  const isFullyPaid = remaining <= 0;
  const isPartiallyPaid = totalPaid > 0 && remaining > 0;
  const isUnpaid = totalPaid === 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getStatusBadge = () => {
    if (isFullyPaid) {
      return (
        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Fully Paid
        </Badge>
      );
    }
    if (isPartiallyPaid) {
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Partially Paid
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Unpaid
      </Badge>
    );
  };

  return (
    <Card className="bg-slate-800/80 border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-500" />
            Payment Summary
          </span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-400 text-sm mb-1">Total Price</p>
            <p className="text-slate-100 font-semibold text-lg">
              {formatCurrency(totalPrice)}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-sm mb-1">Total Paid</p>
            <p className="text-slate-100 font-semibold text-lg">
              {formatCurrency(totalPaid)}
            </p>
          </div>
        </div>
        <div className="pt-4 border-t border-slate-700">
          <div className="flex justify-between items-center">
            <p className="text-slate-400 text-sm">Remaining Balance</p>
            <p
              className={`font-semibold text-lg ${
                isFullyPaid
                  ? "text-emerald-400"
                  : remaining > 0
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {formatCurrency(Math.abs(remaining))}
            </p>
          </div>
        </div>
        <div className="pt-2">
          <p className="text-slate-400 text-xs">
            {summary.payment_count} payment{summary.payment_count !== 1 ? "s" : ""} recorded
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
