import type {ContactSendStatus, Coords, EmergencyContact} from '../types';
import {SmsModule, describeSmsError} from '../native/SmsModule';
import {buildSosMessage} from '../utils/geo';
import {requestSmsPermission} from './permissions';

/**
 * Sends the SOS SMS to every contact, one after another, reporting progress
 * through `onUpdate` so the UI can show a live per-contact status.
 */
export async function sendSosToContacts(
  contacts: EmergencyContact[],
  coords: Coords,
  onUpdate: (statuses: ContactSendStatus[]) => void,
): Promise<ContactSendStatus[]> {
  const message = buildSosMessage(coords);
  const statuses: ContactSendStatus[] = contacts.map(contact => ({
    contact,
    state: 'pending',
  }));
  const emit = () => onUpdate(statuses.map(s => ({...s})));
  emit();

  const permission = await requestSmsPermission();
  if (permission !== 'granted') {
    statuses.forEach(s => {
      s.state = 'failed';
      s.error = 'SMS permission denied';
    });
    emit();
    return statuses;
  }

  for (const s of statuses) {
    s.state = 'sending';
    emit();
    try {
      const res = await SmsModule.sendSms(s.contact.phone, message);
      s.state = res.status === 'sent' ? 'sent' : 'queued';
    } catch (e) {
      s.state = 'failed';
      s.error = describeSmsError(e);
    }
    emit();
  }
  return statuses;
}

/** Re-sends only to contacts whose previous attempt failed. */
export async function retryFailed(
  previous: ContactSendStatus[],
  coords: Coords,
  onUpdate: (statuses: ContactSendStatus[]) => void,
): Promise<ContactSendStatus[]> {
  const failed = previous.filter(s => s.state === 'failed').map(s => s.contact);
  const merge = (fresh: ContactSendStatus[]) =>
    previous.map(p => fresh.find(f => f.contact === p.contact) ?? p);
  const result = await sendSosToContacts(failed, coords, fresh => onUpdate(merge(fresh)));
  return merge(result);
}
