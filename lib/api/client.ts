import type { ApiErrorResponse } from "@/types/api";
import axios, { AxiosError } from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const baseURL =
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
    ?.apiBaseUrl || "http://bitedash-api.test/api/v1";

const AUTH_TOKEN_KEY = "bitedash_token";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401) {
      await clearStoredToken();
      // Navigation to login is handled by auth store / root layout
    }
    return Promise.reject(error);
  },
);

export function isApiError(
  error: unknown,
): error is AxiosError<ApiErrorResponse> {
  return axios.isAxiosError(error) && error.response?.data != null;
}

export function getApiErrors(error: unknown): ApiErrorResponse["errors"] {
  if (isApiError(error) && error.response?.data?.errors) {
    return error.response.data.errors;
  }
  return undefined;
}

export function getApiMessage(error: unknown): string {
  if (isApiError(error) && error.response?.data?.message) {
    return error.response.data.message;
  }
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 429)
      return "Too many attempts. Try again later.";
    if (error.response?.status === 403) return "You don't have permission.";
    if (error.response?.status === 404) return "Resource not found.";
    if (error.response?.status && error.response.status >= 500) {
      return "Something went wrong. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}
