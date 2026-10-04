import {PermissionsAndroid, Platform, type Permission} from 'react-native';

export type PermissionResult = 'granted' | 'denied' | 'blocked';

async function request(
  permission: Permission,
  title: string,
  message: string,
): Promise<PermissionResult> {
  if (Platform.OS !== 'android') {
    return 'granted';
  }
  if (await PermissionsAndroid.check(permission)) {
    return 'granted';
  }
  const res = await PermissionsAndroid.request(permission, {
    title,
    message,
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });
  if (res === PermissionsAndroid.RESULTS.GRANTED) {
    return 'granted';
  }
  return res === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
}

export async function requestLocationPermission(): Promise<PermissionResult> {
  if (Platform.OS !== 'android') {
    return 'granted';
  }
  const fine = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  const coarse = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;
  if (await PermissionsAndroid.check(fine)) {
    return 'granted';
  }
  // Android 12+ requires FINE and COARSE to be requested together.
  const res = await PermissionsAndroid.requestMultiple([fine, coarse]);
  if (res[fine] === PermissionsAndroid.RESULTS.GRANTED) {
    return 'granted';
  }
  return res[fine] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
}

export function requestSmsPermission(): Promise<PermissionResult> {
  return request(
    PermissionsAndroid.PERMISSIONS.SEND_SMS,
    'Allow Nirbhaya to send SMS',
    'In an emergency Nirbhaya texts your live location to your emergency contacts - no internet needed.',
  );
}

/** Asks for everything Walk Mode needs up front. */
export async function requestWalkPermissions(): Promise<{
  location: PermissionResult;
  sms: PermissionResult;
}> {
  const location = await requestLocationPermission();
  const sms = await requestSmsPermission();
  return {location, sms};
}
