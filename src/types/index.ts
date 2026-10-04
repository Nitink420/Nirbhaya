export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface AppSettings {
  demoMode: boolean;
}

export type SmsSendState = 'pending' | 'sending' | 'sent' | 'queued' | 'failed';

export interface ContactSendStatus {
  contact: EmergencyContact;
  state: SmsSendState;
  error?: string;
}

export type RouteName = 'Splash' | 'Home' | 'WalkMode' | 'FakeCall';

export interface RouteParams {
  Splash: undefined;
  Home: undefined;
  WalkMode: undefined;
  FakeCall: {callerName?: string} | undefined;
}
