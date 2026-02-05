import type { MenuItem, PaginatedResponse, Rating } from "@/types/api";
import { apiClient } from "./client";

/** Build FormData for menu item create/update when image file is provided */
function buildMenuItemFormData(
  body: Record<string, unknown>,
  imageUri: string | null
): FormData {
  const form = new FormData();
  Object.entries(body).forEach(([k, v]) => {
    if (v === undefined || v === null || k === "image" || k === "image_url")
      return;
    // FormData sends strings; Laravel boolean validation expects "1"/"0" not "true"/"false"
    if (typeof v === "boolean") {
      form.append(k, v ? "1" : "0");
    } else {
      form.append(k, String(v));
    }
  });
  if (imageUri) {
    form.append("image", {
      uri: imageUri,
      name: "image.jpg",
      type: "image/jpeg",
    } as unknown as Blob);
  } else if (body.image_url && typeof body.image_url === "string") {
    form.append("image_url", body.image_url);
  }
  return form;
}

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
  imageUri?: string | null
): Promise<MenuItem> {
  const hasImage = Boolean(imageUri);
  const payload = hasImage
    ? buildMenuItemFormData(
        {
          ...body,
          image_url: body.image_url ?? undefined,
        } as Record<string, unknown>,
        imageUri ?? null
      )
    : body;

  const { data } = await apiClient.post<MenuItem | { data: MenuItem }>(
    "/menu-items",
    payload,
    hasImage
      ? {
          transformRequest: [
            (d: unknown, h?: Record<string, string>) => {
              if (d instanceof FormData && h) delete h["Content-Type"];
              return d;
            },
          ],
        }
      : {}
  );
  return "data" in data ? data.data : data;
}

export async function updateMenuItem(
  id: number,
  body: Partial<CreateMenuItemBody>,
  imageUri?: string | null
): Promise<MenuItem> {
  const hasImage = Boolean(imageUri);
  const payload = hasImage
    ? buildMenuItemFormData(
        { ...body } as Record<string, unknown>,
        imageUri ?? null
      )
    : body;

  const { data } = await apiClient.put<MenuItem | { data: MenuItem }>(
    `/menu-items/${id}`,
    payload,
    hasImage
      ? {
          transformRequest: [
            (d: unknown, h?: Record<string, string>) => {
              if (d instanceof FormData && h) delete h["Content-Type"];
              return d;
            },
          ],
        }
      : {}
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
