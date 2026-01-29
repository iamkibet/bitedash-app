import type { Order, PaginatedResponse } from "@/types/api";
import { apiClient } from "./client";

export async function listOrders(params?: {
  page?: number;
}): Promise<PaginatedResponse<Order>> {
  const { data } = await apiClient.get<PaginatedResponse<Order>>("/orders", {
    params,
  });
  return data;
}

export async function listAvailableOrders(params?: {
  page?: number;
}): Promise<PaginatedResponse<Order>> {
  const { data } = await apiClient.get<PaginatedResponse<Order>>(
    "/orders/available",
    {
      params,
    },
  );
  return data;
}

export async function listMyRiderOrders(params?: {
  page?: number;
}): Promise<PaginatedResponse<Order>> {
  const { data } = await apiClient.get<PaginatedResponse<Order>>(
    "/orders/my-rider",
    { params },
  );
  return data;
}

export async function listMyRestaurantOrders(params?: {
  page?: number;
}): Promise<PaginatedResponse<Order>> {
  const { data } = await apiClient.get<PaginatedResponse<Order>>(
    "/orders/my-restaurant",
    {
      params,
    },
  );
  return data;
}

export interface CreateOrderBody {
  restaurant_id: number;
  items: { menu_item_id: number; quantity: number }[];
  delivery_address?: string;
  notes?: string;
}

export async function createOrder(body: CreateOrderBody): Promise<Order> {
  const { data } = await apiClient.post<{ message: string; data: Order }>(
    "/orders",
    body,
  );
  return data.data;
}

export async function getOrder(id: number): Promise<Order> {
  const { data } = await apiClient.get<Order | { data: Order }>(
    `/orders/${id}`,
  );
  return "data" in data ? data.data : data;
}

export async function updateOrder(
  id: number,
  body: { status?: Order["status"]; rider_id?: number },
): Promise<Order> {
  const { data } = await apiClient.put<Order | { data: Order }>(
    `/orders/${id}`,
    body,
  );
  return "data" in data ? data.data : data;
}

export async function cancelOrder(id: number): Promise<Order> {
  const { data } = await apiClient.post<Order | { data: Order }>(
    `/orders/${id}/cancel`,
  );
  return "data" in data ? data.data : data;
}

export async function acceptOrder(id: number): Promise<Order> {
  const { data } = await apiClient.post<Order | { data: Order }>(
    `/orders/${id}/accept`,
  );
  return "data" in data ? data.data : data;
}
