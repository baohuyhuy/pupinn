"use client";

import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Payment } from "@/lib/validators";
import { DollarSign, Edit, Trash2, ArrowDownCircle } from "lucide-react";

interface PaymentListProps {
  payments: Payment[];
  isLoading?: boolean;
  onEdit?: (payment: Payment) => void;
  onDelete?: (paymentId: string) => void;
  canEdit?: boolean;
}

export function PaymentList({
  payments,
  isLoading,
  onEdit,
  onDelete,
  canEdit = false,
}: PaymentListProps) {
  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(num);
  };

  const getPaymentTypeColor = (type: string) => {
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

  const formatPaymentType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-500" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded"></div>
            <div className="h-4 bg-slate-700 rounded"></div>
            <div className="h-4 bg-slate-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (payments.length === 0) {
    return (
      <Card className="bg-slate-800/80 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-amber-500" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-center py-8">
            No payments recorded yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/80 border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-amber-500" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead className="text-slate-300">Date</TableHead>
              <TableHead className="text-slate-300">Type</TableHead>
              <TableHead className="text-slate-300">Amount</TableHead>
              <TableHead className="text-slate-300">Method</TableHead>
              <TableHead className="text-slate-300">Notes</TableHead>
              {canEdit && <TableHead className="text-slate-300">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => {
              const isRefund = payment.payment_type === "refund";
              const amount = parseFloat(payment.amount);
              return (
                <TableRow
                  key={payment.id}
                  className="border-slate-700 hover:bg-slate-700/50"
                >
                  <TableCell className="text-slate-100">
                    {format(new Date(payment.created_at), "MMM dd, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${getPaymentTypeColor(
                        payment.payment_type
                      )} text-white`}
                    >
                      {isRefund && (
                        <ArrowDownCircle className="h-3 w-3 mr-1" />
                      )}
                      {formatPaymentType(payment.payment_type)}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`font-semibold ${
                      isRefund ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {isRefund ? "-" : "+"}
                    {formatCurrency(Math.abs(amount).toString())}
                  </TableCell>
                  <TableCell className="text-slate-300 capitalize">
                    {payment.payment_method.replace("_", " ")}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm max-w-xs truncate">
                    {payment.notes || "-"}
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-2">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(payment)}
                            className="text-slate-300 hover:text-white"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(payment.id)}
                            className="text-slate-300 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
