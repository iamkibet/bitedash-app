import type { User } from "@/types/api";
import { apiClient, clearStoredToken, setStoredToken } from "./client";

export interface RegisterBody {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  role: "customer" | "restaurant" | "rider";
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface AuthSuccessResponse {
  message: string;
  user: User;
  token: string;
}

export async function register(
  body: RegisterBody,
): Promise<AuthSuccessResponse> {
  const { data } = await apiClient.post<AuthSuccessResponse>("/register", body);
  if (data.token) await setStoredToken(data.token);
  return data;
}

export async function login(body: LoginBody): Promise<AuthSuccessResponse> {
  const { data } = await apiClient.post<AuthSuccessResponse>("/login", body);
  if (data.token) await setStoredToken(data.token);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post("/logout");
  } finally {
    await clearStoredToken();
  }
}

export async function getMe(): Promise<{ user: User }> {
  const { data } = await apiClient.get<{ user: User }>("/me");
  return data;
}
