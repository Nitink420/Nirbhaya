/**
 * Generates the bundled placeholder audio (ringtone + siren) as 16-bit PCM WAV
 * files in android/app/src/main/res/raw. No dependencies required.
 *
 *   node scripts/generate-sounds.js
 *
 * You can replace them with real ringtone.mp3 / siren.mp3 files - the app loads
 * them by resource name ("ringtone", "siren") so no code changes are needed.
 * (Delete the matching .wav first; Android forbids two raw files with the same name.)
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050;
const OUT_DIR = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'raw');

function writeWav(file, samples) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM format
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  fs.mkdirSync(OUT_DIR, {recursive: true});
  fs.writeFileSync(path.join(OUT_DIR, file), buf);
  console.log(`wrote ${file} (${(buf.length / 1024).toFixed(1)} KB)`);
}

/** Classic phone ring: two 0.4s bursts of 440+480Hz with a 20Hz warble, then silence. Loops cleanly. */
function ringtone() {
  const total = Math.floor(SAMPLE_RATE * 3);
  const out = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const on = (t < 0.4) || (t > 0.6 && t < 1.0);
    if (!on) continue;
    const local = t < 0.4 ? t : t - 0.6;
    const env = Math.min(1, local / 0.01) * Math.min(1, (0.4 - local) / 0.01);
    const warble = 0.75 + 0.25 * Math.sign(Math.sin(2 * Math.PI * 20 * t));
    out[i] = 0.45 * env * warble *
      (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 480 * t)) / 2;
  }
  return out;
}

/** Wailing siren: frequency sweeps 650Hz -> 1500Hz -> 650Hz over 2s. Phase-continuous, loops cleanly. */
function siren() {
  const total = Math.floor(SAMPLE_RATE * 2);
  const out = new Float32Array(total);
  let phase = 0;
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const sweep = 0.5 - 0.5 * Math.cos(2 * Math.PI * (t / 2));
    const freq = 650 + 850 * sweep;
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    // square-ish tone (fundamental + odd harmonics) for a harsh, attention-grabbing sound
    const v = Math.sin(phase) + Math.sin(3 * phase) / 3 + Math.sin(5 * phase) / 5;
    out[i] = 0.7 * v;
  }
  return out;
}

writeWav('ringtone.wav', ringtone());
writeWav('siren.wav', siren());
