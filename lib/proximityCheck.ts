import * as Location from "expo-location";
import { apiFetch } from "./api";

let lastPingTime = 0;
const MIN_PING_INTERVAL_MS = 10 * 60 * 1000; // ping at most once every 10 minutes

/**
 * Pings the server with current device GPS coordinates (if permission is granted).
 * Enables the server to verify physical presence against partner gyms,
 * detect unbooked visits, and surface them in the Admin Verification center.
 */
export async function pingLocationProximity(): Promise<void> {
  const now = Date.now();
  if (now - lastPingTime < MIN_PING_INTERVAL_MS) {
    return;
  }

  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      return;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    if (loc?.coords) {
      lastPingTime = now;
      await apiFetch("/checkin/proximity-ping", {
        method: "POST",
        body: JSON.stringify({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        }),
      });
    }
  } catch (err) {
    // Fail silently in background without disrupting user UX
  }
}
