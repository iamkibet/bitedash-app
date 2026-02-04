import type { ApiErrorResponse } from "@/types/api";
import axios, { AxiosError } from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Get platform-appropriate base URL for API requests.
 *
 * iOS Simulator: Shares Mac's network stack, can access localhost and .test domains directly
 * Android Emulator: Has isolated network, cannot access Mac's /etc/hosts file
 *                   Must use 10.0.2.2 (special alias for host machine)
 *
 * @see https://developer.android.com/studio/run/emulator-networking
 */
function getPlatformBaseURL(): string {
  const configUrl =
    (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
      ?.apiBaseUrl || "http://bitedash-api.test/api/v1";

  // On Android, convert .test domains to 10.0.2.2 (emulator's host alias)
  if (Platform.OS === "android") {
    // Match any .test domain and replace with 10.0.2.2
    // Example: http://bitedash-api.test/api/v1 -> http://10.0.2.2/api/v1
    const androidUrl = configUrl.replace(
      /https?:\/\/[a-zA-Z0-9-]+\.test(:\d+)?/,
      (match) => {
        // Extract port if present (e.g., :8000)
        const portMatch = match.match(/:(\d+)$/);
        const port = portMatch ? `:${portMatch[1]}` : "";
        return `http://10.0.2.2${port}`;
      },
    );

    console.log(`[API Client] Android detected - Converting URL:`);
    console.log(`  Original: ${configUrl}`);
    console.log(`  Android:  ${androidUrl}`);

    return androidUrl;
  }

  console.log(`[API Client] Platform: ${Platform.OS}, Base URL: ${configUrl}`);
  return configUrl;
}

const baseURL = getPlatformBaseURL();

const AUTH_TOKEN_KEY = "bitedash_token";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30000, // 30 second timeout
});

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    console.log("[API] Token stored successfully");
  } catch (error) {
    console.error("[API] Failed to store token:", error);
    throw error;
  }
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Log full request details for debugging POST issues
  console.log(
    `[API] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
  );
  if (config.method?.toLowerCase() === "post") {
    console.log(`[API] Request headers:`, JSON.stringify(config.headers));
    console.log(`[API] Request data:`, JSON.stringify(config.data));
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] ✓ ${response.status} ${response.config.url}`);
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    console.error(`[API] ✗ Error:`, {
      url: error.config?.url,
      method: error.config?.method,
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
    });

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

// Type for fetch-based errors with response data
interface FetchError extends Error {
  response?: {
    status: number;
    data: { message?: string; errors?: Record<string, string[]> };
  };
}

function isFetchError(error: unknown): error is FetchError {
  return error instanceof Error && "response" in error;
}

export function getApiMessage(error: unknown): string {
  // Get the actual API error message if available (axios)
  if (isApiError(error) && error.response?.data?.message) {
    return error.response.data.message;
  }

  // Handle fetch-based errors (used for login)
  if (isFetchError(error) && error.response?.data?.message) {
    return error.response.data.message;
  }

  if (axios.isAxiosError(error)) {
    // Network errors (no response received)
    if (!error.response) {
      console.log("[API] Network error:", error.code, error.message);

      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        return "Unable to connect to server. Check your internet connection.";
      }
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        return "Request timed out. Please try again.";
      }
      return `Connection failed: ${error.message}`;
    }

    // HTTP status errors
    if (error.response.status === 429)
      return "Too many attempts. Try again later.";
    if (error.response.status === 403) return "You don't have permission.";
    if (error.response.status === 404) return "Resource not found.";
    if (error.response.status === 401) return "Invalid email or password.";
    if (error.response.status >= 500) {
      return "Server error. Please try again later.";
    }
    if (error.response.status === 422) {
      return "Validation error. Please check your input.";
    }
  }

  // Handle fetch-based HTTP status errors
  if (isFetchError(error) && error.response?.status) {
    const status = error.response.status;
    if (status === 429) return "Too many attempts. Try again later.";
    if (status === 403) return "You don't have permission.";
    if (status === 404) return "Resource not found.";
    if (status === 401) return "Invalid email or password.";
    if (status === 422) return "Validation error. Please check your input.";
    if (status >= 500) return "Server error. Please try again later.";
  }

  // Generic error handling
  if (error instanceof Error) {
    // Network fetch errors
    if (error.message === "Network request failed") {
      return "Unable to connect to server. Check your internet connection.";
    }
    console.log("[API] Error:", error.message);
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
