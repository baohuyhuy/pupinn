import { apiClient } from "../api-client";
import type {
  Payment,
  PaymentSummary,
  CreatePaymentRequest,
  UpdatePaymentRequest,
} from "../validators";

// Re-export types for convenience
export type { CreatePaymentRequest, UpdatePaymentRequest };

/**
 * Create a new payment for a booking
 */
export async function createPayment(
  bookingId: string,
  payment: CreatePaymentRequest
): Promise<Payment> {
  const response = await apiClient.post<Payment>(
    `/bookings/${bookingId}/payments`,
    payment
  );
  return response.data;
}

/**
 * Get all payments for a booking
 */
export async function getPaymentsByBooking(bookingId: string): Promise<Payment[]> {
  const response = await apiClient.get<Payment[]>(
    `/bookings/${bookingId}/payments`
  );
  return response.data;
}

/**
 * Get payment summary for a booking
 */
export async function getPaymentSummary(
  bookingId: string
): Promise<PaymentSummary> {
  const response = await apiClient.get<PaymentSummary>(
    `/bookings/${bookingId}/payments/summary`
  );
  return response.data;
}

/**
 * Get a payment by ID
 */
export async function getPayment(paymentId: string): Promise<Payment> {
  const response = await apiClient.get<Payment>(`/payments/${paymentId}`);
  return response.data;
}

/**
 * Update a payment
 */
export async function updatePayment(
  paymentId: string,
  updates: UpdatePaymentRequest
): Promise<Payment> {
  const response = await apiClient.patch<Payment>(
    `/payments/${paymentId}`,
    updates
  );
  return response.data;
}

/**
 * Delete a payment
 */
export async function deletePayment(paymentId: string): Promise<void> {
  await apiClient.delete(`/payments/${paymentId}`);
}
