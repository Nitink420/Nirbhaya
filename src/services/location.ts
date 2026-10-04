import Geolocation, {
  type GeoPosition,
  type GeoError,
} from 'react-native-geolocation-service';
import type {Coords} from '../types';
import {offsetCoords} from '../utils/geo';

/** India Gate / Connaught Place area, New Delhi - used when Demo Mode is ON. */
export const DEMO_LOCATION: Coords = {latitude: 28.6139, longitude: 77.209};

/** Demo Mode "walks" this many metres per tick so the 300m deviation alert can be demoed in ~1 min. */
const DEMO_STEP_METERS = 12;
const DEMO_TICK_MS = 2000;

export interface LocationWatcher {
  stop(): void;
}

interface WatchOptions {
  demoMode: boolean;
  onUpdate: (c: Coords) => void;
  onError?: (message: string) => void;
}

function toCoords(pos: GeoPosition): Coords {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    timestamp: pos.timestamp,
  };
}

function describeGeoError(err: GeoError): string {
  switch (err.code) {
    case 1:
      return 'Location permission denied';
    case 2:
      return 'Location services are off - turn on GPS';
    case 3:
      return 'GPS timed out, retrying…';
    case 5:
      return 'Enable location in settings';
    default:
      return err.message || 'Unable to get location';
  }
}

export function watchLocation({demoMode, onUpdate, onError}: WatchOptions): LocationWatcher {
  if (demoMode) {
    let step = 0;
    onUpdate({...DEMO_LOCATION, accuracy: 5, timestamp: Date.now()});
    const id = setInterval(() => {
      step += 1;
      // Gentle curve heading north-east so the path looks natural.
      const bearing = 45 + Math.sin(step / 6) * 20;
      onUpdate(offsetCoords(DEMO_LOCATION, step * DEMO_STEP_METERS, bearing));
    }, DEMO_TICK_MS);
    return {stop: () => clearInterval(id)};
  }

  const watchId = Geolocation.watchPosition(
    pos => onUpdate(toCoords(pos)),
    err => onError?.(describeGeoError(err)),
    {
      enableHighAccuracy: true,
      distanceFilter: 3,
      interval: 4000,
      fastestInterval: 2000,
      showLocationDialog: true,
      forceRequestLocation: true,
    },
  );
  return {
    stop: () => {
      Geolocation.clearWatch(watchId);
    },
  };
}

export function getCurrentLocation(opts: {
  demoMode: boolean;
  timeoutMs?: number;
}): Promise<Coords> {
  if (opts.demoMode) {
    return Promise.resolve({...DEMO_LOCATION, accuracy: 5, timestamp: Date.now()});
  }
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos => resolve(toCoords(pos)),
      err => reject(new Error(describeGeoError(err))),
      {
        enableHighAccuracy: true,
        timeout: opts.timeoutMs ?? 8000,
        maximumAge: 10000,
        showLocationDialog: true,
        forceRequestLocation: true,
      },
    );
  });
}

/**
 * Best location for an SOS: a fresh-enough cached fix if we have one (fast),
 * otherwise a new GPS fix, falling back to whatever we last saw.
 */
export async function resolveSosLocation(opts: {
  demoMode: boolean;
  lastKnown: Coords | null;
}): Promise<Coords> {
  const {demoMode, lastKnown} = opts;
  if (demoMode) {
    return lastKnown ?? (await getCurrentLocation({demoMode}));
  }
  const fresh = lastKnown?.timestamp && Date.now() - lastKnown.timestamp < 10000;
  if (lastKnown && fresh) {
    return lastKnown;
  }
  try {
    return await getCurrentLocation({demoMode, timeoutMs: 6000});
  } catch (e) {
    if (lastKnown) {
      return lastKnown;
    }
    throw e;
  }
}
