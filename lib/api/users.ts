import type { PaginatedResponse, User } from "@/types/api";
import { apiClient } from "./client";

export async function listUsers(params?: {
  page?: number;
  role?: string;
}): Promise<PaginatedResponse<User>> {
  const { data } = await apiClient.get<PaginatedResponse<User>>("/users", {
    params,
  });
  return data;
}

export async function listRiders(params?: {
  page?: number;
}): Promise<PaginatedResponse<User>> {
  const { data } = await apiClient.get<PaginatedResponse<User>>("/riders", {
    params,
  });
  return data;
}
