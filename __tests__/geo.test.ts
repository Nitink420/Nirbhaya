import {
  buildSosMessage,
  distanceMeters,
  formatDistance,
  formatDuration,
  offsetCoords,
} from '../src/utils/geo';
import {isValidPhone, normalizePhone} from '../src/services/storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const DELHI = {latitude: 28.6139, longitude: 77.209};

describe('geo utils', () => {
  it('computes ~0 distance for the same point', () => {
    expect(distanceMeters(DELHI, DELHI)).toBeCloseTo(0, 5);
  });

  it('offsetCoords + distanceMeters round-trip', () => {
    const moved = offsetCoords(DELHI, 300, 45);
    expect(distanceMeters(DELHI, moved)).toBeCloseTo(300, 0);
  });

  it('builds the SOS message with a maps link', () => {
    expect(buildSosMessage(DELHI)).toBe(
      'HELP! Track me: https://maps.google.com/?q=28.613900,77.209000 - via Nirbhaya',
    );
  });

  it('formats distance and duration', () => {
    expect(formatDistance(42.4)).toBe('42 m');
    expect(formatDistance(1530)).toBe('1.53 km');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(3725)).toBe('1:02:05');
  });
});

describe('phone helpers', () => {
  it('normalizes and validates numbers', () => {
    expect(normalizePhone(' +91 98765-43210 ')).toBe('+919876543210');
    expect(isValidPhone('+91 98765 43210')).toBe(true);
    expect(isValidPhone('123')).toBe(false);
  });
});
