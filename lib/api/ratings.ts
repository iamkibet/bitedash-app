import type { Rating } from "@/types/api";
import { apiClient } from "./client";

export async function createRating(body: {
  menu_item_id: number;
  rating: number;
  comment?: string;
}): Promise<Rating> {
  const { data } = await apiClient.post<{ message: string; data: Rating }>(
    "/ratings",
    body,
  );
  return data.data;
}

export async function updateRating(
  id: number,
  body: { rating?: number; comment?: string },
): Promise<Rating> {
  const { data } = await apiClient.put<{ message: string; data: Rating }>(
    `/ratings/${id}`,
    body,
  );
  return data.data;
}

export async function deleteRating(id: number): Promise<void> {
  await apiClient.delete(`/ratings/${id}`);
}
