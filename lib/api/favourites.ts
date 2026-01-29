import type { Favourite, PaginatedResponse } from "@/types/api";
import { apiClient } from "./client";

export async function listFavourites(params?: {
  page?: number;
}): Promise<PaginatedResponse<Favourite>> {
  const { data } = await apiClient.get<PaginatedResponse<Favourite>>(
    "/favourites",
    { params },
  );
  return data;
}

export async function addFavourite(menuItemId: number): Promise<Favourite> {
  const { data } = await apiClient.post<{ message: string; data: Favourite }>(
    "/favourites",
    {
      menu_item_id: menuItemId,
    },
  );
  return data.data;
}

export async function removeFavourite(menuItemId: number): Promise<void> {
  await apiClient.delete(`/favourites/${menuItemId}`);
}
