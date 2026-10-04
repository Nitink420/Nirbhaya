import {NativeModules, Platform} from 'react-native';

/**
 * Typed wrapper around the custom Kotlin `SmsModule`
 * (android/app/src/main/java/com/nirbhaya/sms/SmsModule.kt).
 *
 * SMS is sent directly via Android's SmsManager - no SMS app is opened and no
 * internet connection is required.
 */

export type SmsResultStatus =
  /** Carrier/radio confirmed the message left the device. */
  | 'sent'
  /** Handed to SmsManager but no confirmation within the timeout (usually still delivered). */
  | 'queued';

export interface SmsResult {
  status: SmsResultStatus;
  phone: string;
  parts: number;
}

export type SmsErrorCode =
  | 'E_INVALID_PHONE'
  | 'E_PERMISSION'
  | 'E_NO_TELEPHONY'
  | 'E_GENERIC_FAILURE'
  | 'E_NO_SERVICE'
  | 'E_NULL_PDU'
  | 'E_RADIO_OFF'
  | 'E_SEND_FAILED'
  | 'E_UNAVAILABLE';

export interface SmsError extends Error {
  code: SmsErrorCode;
}

interface SmsNativeModule {
  sendSms(phone: string, message: string): Promise<SmsResult>;
  canSendSms(): Promise<boolean>;
}

const Native: SmsNativeModule | undefined = NativeModules.SmsModule;

function unavailable(): SmsError {
  const err = new Error(
    Platform.OS === 'android'
      ? 'SmsModule native module is not linked. Rebuild the Android app.'
      : 'Direct SMS sending is only supported on Android.',
  ) as SmsError;
  err.code = 'E_UNAVAILABLE';
  return err;
}

export const SmsModule = {
  isLinked(): boolean {
    return Platform.OS === 'android' && !!Native;
  },

  /** Sends an SMS silently in the background. Resolves once the radio reports success. */
  async sendSms(phone: string, message: string): Promise<SmsResult> {
    if (!Native) {
      throw unavailable();
    }
    return Native.sendSms(phone, message);
  },

  /** True when the device has telephony hardware and SEND_SMS is granted. */
  async canSendSms(): Promise<boolean> {
    if (!Native) {
      return false;
    }
    try {
      return await Native.canSendSms();
    } catch {
      return false;
    }
  },
};

export function describeSmsError(e: unknown): string {
  const code = (e as Partial<SmsError>)?.code;
  switch (code) {
    case 'E_PERMISSION':
      return 'SMS permission denied';
    case 'E_NO_TELEPHONY':
      return 'Device cannot send SMS';
    case 'E_NO_SERVICE':
      return 'No network service';
    case 'E_RADIO_OFF':
      return 'Airplane mode / radio off';
    case 'E_INVALID_PHONE':
      return 'Invalid number';
    case 'E_UNAVAILABLE':
      return 'SMS module unavailable';
    default:
      return (e as Error)?.message || 'Failed to send';
  }
}

export default SmsModule;
