import AsyncStorage from '@react-native-async-storage/async-storage';
import type {AppSettings, EmergencyContact} from '../types';

const KEYS = {
  contacts: '@nirbhaya/contacts',
  settings: '@nirbhaya/settings',
} as const;

export const MAX_CONTACTS = 3;

const DEFAULT_SETTINGS: AppSettings = {demoMode: false};

export function emptyContacts(): EmergencyContact[] {
  return Array.from({length: MAX_CONTACTS}, () => ({name: '', phone: ''}));
}

/** Always returns exactly MAX_CONTACTS slots (empty slots have blank fields). */
export async function loadContacts(): Promise<EmergencyContact[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.contacts);
    const parsed: EmergencyContact[] = raw ? JSON.parse(raw) : [];
    const slots = emptyContacts();
    parsed.slice(0, MAX_CONTACTS).forEach((c, i) => {
      slots[i] = {name: String(c?.name ?? ''), phone: String(c?.phone ?? '')};
    });
    return slots;
  } catch {
    return emptyContacts();
  }
}

export async function saveContacts(contacts: EmergencyContact[]): Promise<void> {
  const cleaned = contacts.slice(0, MAX_CONTACTS).map(c => ({
    name: c.name.trim(),
    phone: normalizePhone(c.phone),
  }));
  await AsyncStorage.setItem(KEYS.contacts, JSON.stringify(cleaned));
}

/** Only contacts that have a phone number. */
export function usableContacts(contacts: EmergencyContact[]): EmergencyContact[] {
  return contacts.filter(c => c.phone.trim().length > 0);
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.settings);
    return raw ? {...DEFAULT_SETTINGS, ...JSON.parse(raw)} : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

/** Keeps a leading "+" and digits only. */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return plus + trimmed.replace(/[^\d]/g, '');
}

export function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone).replace('+', '');
  return digits.length >= 7 && digits.length <= 15;
}
