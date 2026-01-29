import type { Order, PaginatedResponse, Store } from "@/types/api";
import { apiClient } from "./client";

export async function listStores(params?: {
  page?: number;
  is_open?: boolean;
}): Promise<PaginatedResponse<Store>> {
  const { data } = await apiClient.get<PaginatedResponse<Store>>("/stores", {
    params,
  });
  return data;
}

export async function getMyStore(): Promise<Store> {
  const { data } = await apiClient.get<Store | { data: Store }>(
    "/stores/my-store",
  );
  return typeof (data as Store).id === "number"
    ? (data as Store)
    : (data as { data: Store }).data;
}

export async function getStore(id: number): Promise<Store> {
  const { data } = await apiClient.get<Store | { data: Store }>(
    `/stores/${id}`,
  );
  return "data" in data ? data.data : data;
}

export interface CreateStoreBody {
  name: string;
  description?: string;
  location: string;
  image_url?: string;
  latitude?: number;
  longitude?: number;
}

export async function createStore(body: CreateStoreBody): Promise<Store> {
  const { data } = await apiClient.post<Store | { data: Store }>(
    "/stores",
    body,
  );
  return "data" in data ? data.data : data;
}

export async function updateStore(
  id: number,
  body: Partial<CreateStoreBody> & { is_open?: boolean },
): Promise<Store> {
  const { data } = await apiClient.put<Store | { data: Store }>(
    `/stores/${id}`,
    body,
  );
  return "data" in data ? data.data : data;
}

export async function toggleStoreStatus(id: number): Promise<Store> {
  const { data } = await apiClient.post<Store | { data: Store }>(
    `/stores/${id}/toggle-status`,
  );
  return "data" in data ? data.data : data;
}

export async function listStoreOrders(
  storeId: number,
  params?: { page?: number },
): Promise<PaginatedResponse<Order>> {
  const { data } = await apiClient.get<PaginatedResponse<Order>>(
    `/stores/${storeId}/orders`,
    { params },
  );
  return data;
}

export async function listStorePendingOrders(
  storeId: number,
  params?: { page?: number },
): Promise<PaginatedResponse<Order>> {
  const { data } = await apiClient.get<PaginatedResponse<Order>>(
    `/stores/${storeId}/orders/pending`,
    { params },
  );
  return data;
}
