import type { MenuItem, PaginatedResponse, Rating } from "@/types/api";
import { apiClient } from "./client";

interface RatingsMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  average_rating: number;
  total_ratings: number;
}

export async function listMenuItemsByStore(
  storeId: number,
  params?: { page?: number; is_available?: boolean },
): Promise<PaginatedResponse<MenuItem>> {
  const { data } = await apiClient.get<PaginatedResponse<MenuItem>>(
    `/stores/${storeId}/menu-items`,
    { params },
  );
  return data;
}

export async function listMyRestaurantMenuItems(params?: {
  page?: number;
}): Promise<PaginatedResponse<MenuItem>> {
  const { data } = await apiClient.get<PaginatedResponse<MenuItem>>(
    "/menu-items/my-restaurant",
    { params },
  );
  return data;
}

export async function getMenuItem(id: number): Promise<MenuItem> {
  const { data } = await apiClient.get<MenuItem | { data: MenuItem }>(
    `/menu-items/${id}`,
  );
  return "data" in data ? data.data : data;
}

export interface CreateMenuItemBody {
  name: string;
  description?: string;
  price: number;
  restaurant_id: number;
  image_url?: string;
  is_available?: boolean;
}

export async function createMenuItem(
  body: CreateMenuItemBody,
): Promise<MenuItem> {
  const { data } = await apiClient.post<MenuItem | { data: MenuItem }>(
    "/menu-items",
    body,
  );
  return "data" in data ? data.data : data;
}

export async function updateMenuItem(
  id: number,
  body: Partial<CreateMenuItemBody>,
): Promise<MenuItem> {
  const { data } = await apiClient.put<MenuItem | { data: MenuItem }>(
    `/menu-items/${id}`,
    body,
  );
  return "data" in data ? data.data : data;
}

export async function deleteMenuItem(id: number): Promise<void> {
  await apiClient.delete(`/menu-items/${id}`);
}

export async function toggleMenuItemAvailability(
  id: number,
): Promise<MenuItem> {
  const { data } = await apiClient.post<MenuItem | { data: MenuItem }>(
    `/menu-items/${id}/toggle-availability`,
  );
  return "data" in data ? data.data : data;
}

export async function listMenuItemRatings(
  menuItemId: number,
  params?: { page?: number },
): Promise<{ data: Rating[]; meta: RatingsMeta }> {
  const { data } = await apiClient.get<{ data: Rating[]; meta: RatingsMeta }>(
    `/menu-items/${menuItemId}/ratings`,
    { params },
  );
  return data;
}
