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
  // Using fetch directly as a workaround for Android POST issues with axios
  const baseURL = apiClient.defaults.baseURL;
  console.log(`[Auth] Attempting login to ${baseURL}/login`);

  try {
    const response = await fetch(`${baseURL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log(`[Auth] Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log(`[Auth] Error response:`, errorData);
      const error = new Error(errorData.message || "Login failed") as Error & {
        response?: { status: number; data: unknown };
      };
      error.response = { status: response.status, data: errorData };
      throw error;
    }

    const data: AuthSuccessResponse = await response.json();
    console.log(`[Auth] Login successful`);

    if (data.token) {
      await setStoredToken(data.token);
    }
    return data;
  } catch (error) {
    console.error(`[Auth] Login error:`, error);
    throw error;
  }
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
