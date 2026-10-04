import Sound from 'react-native-sound';
import {Vibration} from 'react-native';

Sound.setCategory('Playback', false);

/**
 * Looping sound backed by a file in android/app/src/main/res/raw.
 * Pass the resource name without extension (e.g. "siren" -> res/raw/siren.wav or siren.mp3).
 */
class LoopingSound {
  private sound: Sound | null = null;
  private loading: Promise<Sound> | null = null;
  private wantPlaying = false;

  constructor(private readonly resourceName: string) {}

  private load(): Promise<Sound> {
    if (this.sound) {
      return Promise.resolve(this.sound);
    }
    if (!this.loading) {
      this.loading = new Promise((resolve, reject) => {
        const s = new Sound(this.resourceName, Sound.MAIN_BUNDLE, err => {
          if (err) {
            this.loading = null;
            reject(err);
            return;
          }
          this.sound = s;
          resolve(s);
        });
      });
    }
    return this.loading;
  }

  async play(): Promise<void> {
    this.wantPlaying = true;
    try {
      const s = await this.load();
      if (!this.wantPlaying) {
        return; // stop() was called while loading
      }
      s.setNumberOfLoops(-1);
      s.setVolume(1);
      s.play();
    } catch (e) {
      console.warn(`[sound] failed to play ${this.resourceName}`, e);
    }
  }

  stop(): void {
    this.wantPlaying = false;
    this.sound?.stop();
  }

  release(): void {
    this.stop();
    this.sound?.release();
    this.sound = null;
    this.loading = null;
  }
}

export const siren = new LoopingSound('siren');
export const ringtone = new LoopingSound('ringtone');

/* -------------------------------------------------------------------------- */
/* Alarm = siren + strong repeating vibration (SOS)                            */
/* -------------------------------------------------------------------------- */

const SOS_VIBRATION = [0, 600, 200, 600, 200, 1200, 400];
const RING_VIBRATION = [0, 1000, 1200];

export function startAlarm(): void {
  Vibration.vibrate(SOS_VIBRATION, true);
  siren.play();
}

export function stopAlarm(): void {
  Vibration.cancel();
  siren.stop();
}

export function startRinging(): void {
  Vibration.vibrate(RING_VIBRATION, true);
  ringtone.play();
}

export function stopRinging(): void {
  Vibration.cancel();
  ringtone.stop();
}

export function buzz(pattern: number | number[] = 60): void {
  Vibration.vibrate(pattern);
}
