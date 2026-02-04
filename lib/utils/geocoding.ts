/**
 * Geocoding via OpenStreetMap Nominatim (no API key).
 * Use sparingly; Nominatim allows ~1 request/second.
 */

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "BiteDash/1.0 (delivery app)";

export interface GeocodeResult {
  display_name: string;
  lat: string;
  lon: string;
}

/** Reverse geocode: coordinates → address */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

/** Forward geocode: address string → first result (lat, lon, display_name) */
export async function forwardGeocode(
  query: string
): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  try {
    const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(trimmed)}&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    const arr = (await res.json()) as GeocodeResult[];
    return arr.length > 0 ? arr[0] : null;
  } catch {
    return null;
  }
}
