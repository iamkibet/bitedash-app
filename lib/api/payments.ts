import { apiClient } from "./client";

export async function initiatePayment(
  orderId: number,
  body: { phone_number: string },
): Promise<{ message?: string; reference?: string; [key: string]: unknown }> {
  const { data } = await apiClient.post(
    `/orders/${orderId}/payments/initiate`,
    body,
  );
  return data;
}

export async function verifyPayment(
  reference: string,
): Promise<{ status?: string; [key: string]: unknown }> {
  const { data } = await apiClient.get(`/payments/${reference}/verify`);
  return data;
}
