import { getApiOrigin } from "@/lib/api/client";

/**
 * Resolve image URL - if API returns relative paths like /storage/..., prepend host.
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const host = getApiOrigin();
  return `${host}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}
