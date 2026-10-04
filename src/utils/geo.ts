import type {Coords} from '../types';

const EARTH_RADIUS_M = 6371000;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance in metres (haversine). */
export function distanceMeters(a: Coords, b: Coords): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Moves a coordinate `meters` along `bearingDeg` (0 = north). Used by Demo Mode. */
export function offsetCoords(
  origin: Coords,
  meters: number,
  bearingDeg: number,
): Coords {
  const d = meters / EARTH_RADIUS_M;
  const brng = toRad(bearingDeg);
  const lat1 = toRad(origin.latitude);
  const lng1 = toRad(origin.longitude);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return {latitude: toDeg(lat2), longitude: toDeg(lng2), accuracy: 5, timestamp: Date.now()};
}

export function formatDistance(m: number): string {
  if (m < 1000) {
    return `${Math.round(m)} m`;
  }
  return `${(m / 1000).toFixed(2)} km`;
}

export function formatCoord(v: number): string {
  return v.toFixed(6);
}

export function mapsLink(c: Coords): string {
  return `https://maps.google.com/?q=${c.latitude.toFixed(6)},${c.longitude.toFixed(6)}`;
}

export function buildSosMessage(c: Coords): string {
  return `HELP! Track me: ${mapsLink(c)} - via Nirbhaya`;
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
