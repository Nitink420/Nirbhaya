/**
 * Nirbhaya (निर्भया) — Web Simulator Engine
 * Replicates 100% of React Native Bare Android state logic, Web Audio synthesizers,
 * and live offline SOS dispatches.
 */

/* ==========================================================================
   1. AUDIO SYNTHESIZER (Web Audio API)
   Generates ringtone warble & wailing emergency siren without external audio files
   ========================================================================== */

class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.sirenTimer = null;
    this.ringtoneTimer = null;
    this.activeNodes = [];
    this.isSirenPlaying = false;
    this.isRingtonePlaying = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Dual-tone telephone ring (440Hz + 480Hz warble, 1s ring, 2s silence)
   */
  startRingtone() {
    this.init();
    this.stopRingtone();
    this.isRingtonePlaying = true;

    const playBurst = () => {
      if (!this.isRingtonePlaying) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain.gain.setValueAtTime(0.18, now + 0.95);
      gain.gain.linearRampToValueAtTime(0, now + 1.0);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.0);
      osc2.stop(now + 1.0);

      // Trigger web haptics if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([0, 800, 1200]);
      }
    };

    playBurst();
    this.ringtoneTimer = setInterval(playBurst, 3000);
  }

  stopRingtone() {
    this.isRingtonePlaying = false;
    if (this.ringtoneTimer) {
      clearInterval(this.ringtoneTimer);
      this.ringtoneTimer = null;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }

  /**
   * Wailing emergency siren (sweeps 650Hz -> 1500Hz -> 650Hz every 2s)
   */
  startSiren() {
    this.init();
    this.stopSiren();
    this.isSirenPlaying = true;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.22, this.ctx.currentTime);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    this.activeNodes.push(osc, gain);

    let sweepUp = true;
    const sweep = () => {
      if (!this.isSirenPlaying) return;
      const now = this.ctx.currentTime;
      const targetFreq = sweepUp ? 1500 : 650;
      osc.frequency.cancelScheduledValues(now);
      osc.frequency.linearRampToValueAtTime(targetFreq, now + 0.9);
      sweepUp = !sweepUp;
    };

    sweep();
    this.sirenTimer = setInterval(sweep, 950);

    if ('vibrate' in navigator) {
      navigator.vibrate([0, 600, 200, 600, 200, 1000]);
    }
  }

  stopSiren() {
    this.isSirenPlaying = false;
    if (this.sirenTimer) {
      clearInterval(this.sirenTimer);
      this.sirenTimer = null;
    }
    this.activeNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    this.activeNodes = [];
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  }
}

const audio = new AudioSynthesizer();

/* ==========================================================================
   2. DOM ELEMENT REFERENCES
   ========================================================================== */

const screens = {
  splash: document.getElementById('screen-splash'),
  home: document.getElementById('screen-home'),
  walk: document.getElementById('screen-walk'),
  call: document.getElementById('screen-call'),
};

const el = {
  statusClock: document.getElementById('status-clock'),
  demoPill: document.getElementById('demo-indicator-pill'),
  walkSublabel: document.getElementById('walk-mode-sublabel'),
  toggleDemo: document.getElementById('toggle-demo-mode'),
  contactsChips: document.getElementById('home-contact-chips'),
  contactsCount: document.getElementById('contacts-count-text'),
  contactsModal: document.getElementById('contacts-modal'),
  btnOpenContacts: document.getElementById('btn-open-contacts'),
  btnCloseContacts: document.getElementById('btn-close-contacts'),
  btnSaveContacts: document.getElementById('btn-save-contacts'),
  btnStartWalk: document.getElementById('btn-start-walk'),

  // Walk Screen
  btnWalkBack: document.getElementById('btn-walk-back'),
  walkElapsed: document.getElementById('walk-elapsed-time'),
  walkStatusPill: document.getElementById('walk-status-pill'),
  walkPillLabel: document.getElementById('walk-pill-label'),
  deviationBanner: document.getElementById('deviation-alert'),
  deviationTitle: document.getElementById('deviation-title'),
  distanceDisplay: document.getElementById('walk-distance-display'),
  trackFill: document.getElementById('walk-track-fill'),
  liveLat: document.getElementById('live-lat'),
  liveLng: document.getElementById('live-lng'),
  startLat: document.getElementById('start-lat'),
  startLng: document.getElementById('start-lng'),
  accuracyText: document.getElementById('gps-accuracy-text'),

  // SOS Hold
  sosHoldBtn: document.getElementById('sos-hold-btn'),
  sosProgressFill: document.getElementById('sos-progress-fill'),
  sosCaption: document.getElementById('sos-hold-caption'),
  sosRecipientsNote: document.getElementById('sos-recipients-note'),

  // Walk 3 Actions
  btnImSafe: document.getElementById('btn-im-safe'),
  btnFeelingUneasy: document.getElementById('btn-feeling-uneasy'),
  btnImUnsafe: document.getElementById('btn-im-unsafe'),

  // Countdown Modal
  countdownModal: document.getElementById('countdown-modal'),
  countdownNumber: document.getElementById('countdown-number'),
  btnCountdownNow: document.getElementById('btn-countdown-now'),
  btnCountdownCancel: document.getElementById('btn-countdown-cancel'),

  // SOS Overlay
  sosOverlay: document.getElementById('sos-overlay'),
  sosOverlayTitle: document.getElementById('sos-overlay-title'),
  sosOverlaySub: document.getElementById('sos-overlay-sub'),
  sosDispatchedCoords: document.getElementById('sos-dispatched-coords'),
  sosMapsLink: document.getElementById('sos-maps-link'),
  sosContactStatusList: document.getElementById('sos-contact-status-list'),
  btnToggleSiren: document.getElementById('btn-toggle-siren'),
  sirenBtnIcon: document.getElementById('siren-btn-icon'),
  sirenBtnText: document.getElementById('siren-btn-text'),
  btnSosImSafe: document.getElementById('btn-sos-im-safe'),
  btnSosDismiss: document.getElementById('btn-sos-dismiss'),

  // Fake Call
  callHeaderStatus: document.getElementById('call-header-status'),
  callStatusLabel: document.getElementById('call-status-label'),
  callRingingControls: document.getElementById('call-ringing-controls'),
  callActiveControls: document.getElementById('call-active-controls'),
  btnAcceptCall: document.getElementById('btn-accept-call'),
  btnDeclineCall: document.getElementById('btn-decline-call'),
  btnEndActiveCall: document.getElementById('btn-end-active-call'),
  ctrlMute: document.getElementById('ctrl-mute'),
  ctrlKeypad: document.getElementById('ctrl-keypad'),
  ctrlSpeaker: document.getElementById('ctrl-speaker'),
  callRing1: document.getElementById('call-ring-1'),
  callRing2: document.getElementById('call-ring-2'),

  // Simulator Toolbar
  simTriggerDev: document.getElementById('sim-trigger-deviation'),
  simTriggerFake: document.getElementById('sim-trigger-fakecall'),
  simTriggerSos: document.getElementById('sim-trigger-sos'),
  simResetWalk: document.getElementById('sim-reset-walk'),
  smsLogContainer: document.getElementById('sms-log-container'),
};

/* ==========================================================================
   3. APP STATE & PERSISTENCE
   ========================================================================== */

const DELHI_LOCATION = {latitude: 28.6139, longitude: 77.2090};

const state = {
  currentScreen: 'splash',
  demoMode: true,
  contacts: [
    {name: 'Maa', phone: '+919876543210'},
    {name: 'Papa', phone: '+919876543211'},
    {name: 'Priya', phone: '+919876543212'},
  ],
  walk: {
    active: false,
    startTime: null,
    elapsedSeconds: 0,
    timerId: null,
    startCoords: null,
    currentCoords: null,
    distanceMeters: 0,
    stepCounter: 0,
    walkSimulationId: null,
  },
  call: {
    active: false,
    timerId: null,
    seconds: 0,
  },
  countdown: {
    timerId: null,
    seconds: 3,
  },
};

// Load saved data from localStorage
try {
  const savedContacts = localStorage.getItem('nirbhaya_contacts');
  if (savedContacts) {
    state.contacts = JSON.parse(savedContacts);
  }
  const savedDemo = localStorage.getItem('nirbhaya_demomode');
  if (savedDemo !== null) {
    state.demoMode = savedDemo === 'true';
  }
} catch (e) {}

/* ==========================================================================
   4. NAVIGATION CONTROLLER
   ========================================================================== */

function navigate(targetScreen) {
  Object.values(screens).forEach(s => s.classList.remove('screen-active'));
  screens[targetScreen].classList.add('screen-active');
  state.currentScreen = targetScreen;

  if (targetScreen === 'call') {
    startFakeCallFlow();
  } else if (targetScreen !== 'call') {
    stopFakeCallFlow();
  }
}

/* ==========================================================================
   5. GEO MATH HELPERS (Haversine & Demo Offset)
   ========================================================================== */

function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function offsetCoords(origin, meters, bearingDeg) {
  const R = 6371000;
  const d = meters / R;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (origin.latitude * Math.PI) / 180;
  const lng1 = (origin.longitude * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: (lng2 * 180) / Math.PI,
  };
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ==========================================================================
   6. UI SYNCHRONIZATION
   ========================================================================== */

function updateHomeUI() {
  el.toggleDemo.checked = state.demoMode;

  if (state.demoMode) {
    el.demoPill.className = 'status-pill status-demo';
    el.demoPill.querySelector('.pill-label').textContent = 'DEMO';
    el.walkSublabel.textContent = 'Demo location · New Delhi';
  } else {
    el.demoPill.className = 'status-pill status-ready';
    el.demoPill.querySelector('.pill-label').textContent = 'GPS READY';
    el.walkSublabel.textContent = 'Live GPS route tracking';
  }

  // Populate Contact Chips
  const validContacts = state.contacts.filter(c => c.name && c.phone);
  el.contactsCount.textContent = `${validContacts.length} of 3 contacts saved`;
  el.contactsChips.innerHTML = validContacts
    .map(
      c => `
      <div class="chip">
        <div class="chip-avatar">${(c.name || '?')[0].toUpperCase()}</div>
        <span class="chip-name">${c.name}</span>
        <span class="chip-phone">${c.phone}</span>
      </div>
    `,
    )
    .join('');

  el.sosRecipientsNote.textContent =
    validContacts.length > 0
      ? `Alerts ${validContacts.map(c => c.name).join(', ')}`
      : 'No emergency contacts saved';
}

function updateWalkUI() {
  const {distanceMeters: dist, currentCoords, startCoords} = state.walk;

  el.walkElapsed.textContent = `Tracking ${formatDuration(state.walk.elapsedSeconds)}`;
  el.distanceDisplay.textContent = dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(2)} km`;

  const pct = Math.min((dist / 300) * 100, 100);
  el.trackFill.style.width = `${Math.max(pct, 2)}%`;

  if (currentCoords) {
    el.liveLat.textContent = currentCoords.latitude.toFixed(6);
    el.liveLng.textContent = currentCoords.longitude.toFixed(6);
  }
  if (startCoords) {
    el.startLat.textContent = startCoords.latitude.toFixed(6);
    el.startLng.textContent = startCoords.longitude.toFixed(6);
  }

  // > 300m Deviation Alert Check
  if (dist > 300) {
    el.deviationBanner.classList.remove('hidden');
    el.deviationTitle.textContent = `You're ${Math.round(dist)} m from your start`;
    el.trackFill.style.backgroundColor = 'var(--warn-amber)';
    el.distanceDisplay.style.color = 'var(--warn-amber)';
  } else {
    el.deviationBanner.classList.add('hidden');
    el.trackFill.style.backgroundColor = pct > 70 ? '#FBBF24' : 'var(--safe-green)';
    el.distanceDisplay.style.color = 'var(--text-main)';
  }
}

/* ==========================================================================
   7. WALK MODE ORCHESTRATION
   ========================================================================== */

function startWalkMode() {
  state.walk.active = true;
  state.walk.elapsedSeconds = 0;
  state.walk.stepCounter = 0;

  const initial = {...DELHI_LOCATION};
  state.walk.startCoords = initial;
  state.walk.currentCoords = initial;
  state.walk.distanceMeters = 0;

  // Real browser geolocation if not in Demo Mode
  if (!state.demoMode && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const live = {latitude: pos.coords.latitude, longitude: pos.coords.longitude};
        state.walk.startCoords = live;
        state.walk.currentCoords = live;
        el.accuracyText.textContent = `GPS accuracy ±${Math.round(pos.coords.accuracy || 8)} m`;
        updateWalkUI();
      },
      () => {},
      {enableHighAccuracy: true},
    );
  }

  // Elapsed timer
  clearInterval(state.walk.timerId);
  state.walk.timerId = setInterval(() => {
    state.walk.elapsedSeconds += 1;
    updateWalkUI();
  }, 1000);

  // Demo step simulator (moves ~12m every 2.5s)
  clearInterval(state.walk.walkSimulationId);
  if (state.demoMode) {
    state.walk.walkSimulationId = setInterval(() => {
      state.walk.stepCounter += 1;
      const moved = offsetCoords(
        state.walk.startCoords,
        state.walk.stepCounter * 12,
        45 + Math.sin(state.walk.stepCounter / 5) * 15,
      );
      state.walk.currentCoords = moved;
      state.walk.distanceMeters = distanceMeters(state.walk.startCoords, moved);
      updateWalkUI();
    }, 2500);
  }

  navigate('walk');
  updateWalkUI();
}

function stopWalkMode() {
  state.walk.active = false;
  clearInterval(state.walk.timerId);
  clearInterval(state.walk.walkSimulationId);
  closeSosOverlay();
  navigate('home');
}

/* ==========================================================================
   8. SOS EMERGENCY DISPATCH FLOW
   ========================================================================== */

function executeSosDispatch() {
  closeCountdownModal();
  const coords = state.walk.currentCoords || DELHI_LOCATION;
  const mapsUrl = `https://maps.google.com/?q=${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`;
  const smsBody = `HELP! Track me: ${mapsUrl} - via Nirbhaya`;

  // Start siren audio + vibration
  audio.startSiren();
  el.sirenBtnText.textContent = 'STOP SIREN';
  el.sirenBtnIcon.textContent = '🔇';

  // Open SOS Fullscreen
  el.sosDispatchedCoords.textContent = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
  el.sosMapsLink.textContent = mapsUrl;
  el.sosMapsLink.href = mapsUrl;
  el.sosOverlay.classList.remove('hidden');

  // Render per-contact live dispatch list
  const validContacts = state.contacts.filter(c => c.name && c.phone);
  el.sosContactStatusList.innerHTML = validContacts
    .map(
      (c, i) => `
      <div class="contact-status-item" id="sos-status-item-${i}">
        <div class="status-avatar">${(c.name || '?')[0].toUpperCase()}</div>
        <div class="status-info">
          <div class="status-contact-name">${c.name}</div>
          <div class="status-contact-phone">${c.phone}</div>
        </div>
        <span class="status-state-pill pill-sending">Sending…</span>
      </div>
    `,
    )
    .join('');

  // Sequentially confirm each dispatch
  validContacts.forEach((contact, idx) => {
    setTimeout(() => {
      const item = document.getElementById(`sos-status-item-${idx}`);
      if (item) {
        const pill = item.querySelector('.status-state-pill');
        pill.className = 'status-state-pill pill-sent';
        pill.textContent = 'Sent ✓';
      }

      // Log to side inspector panel
      logDispatchedSms(contact, smsBody, mapsUrl);
    }, 700 + idx * 600);
  });
}

function logDispatchedSms(contact, body, mapsUrl) {
  const empty = el.smsLogContainer.querySelector('.sms-log-empty');
  if (empty) empty.remove();

  const item = document.createElement('div');
  item.className = 'sms-dispatched-item';
  item.innerHTML = `
    <span class="sms-item-to">📤 TO: ${contact.name} (${contact.phone})</span>
    <div class="sms-item-body">
      HELP! Track me: <a href="${mapsUrl}" target="_blank">${mapsUrl}</a> - via Nirbhaya
    </div>
  `;
  el.smsLogContainer.prepend(item);
}

function closeSosOverlay() {
  audio.stopSiren();
  el.sosOverlay.classList.add('hidden');
}

/* ==========================================================================
   9. SOS 2-SECOND HOLD BUTTON LOGIC
   ========================================================================== */

let holdTimer = null;
let holdStartTime = 0;
const HOLD_REQUIRED_MS = 2000;

function startSosHold(e) {
  e.preventDefault();
  audio.init();
  holdStartTime = Date.now();
  el.sosCaption.textContent = 'KEEP HOLDING…';

  clearInterval(holdTimer);
  holdTimer = setInterval(() => {
    const elapsed = Date.now() - holdStartTime;
    const progress = Math.min(elapsed / HOLD_REQUIRED_MS, 1);
    el.sosProgressFill.style.transform = `scale(${progress})`;

    if (progress >= 1) {
      clearInterval(holdTimer);
      el.sosProgressFill.style.transform = 'scale(0)';
      el.sosCaption.textContent = 'HOLD 2 SEC';
      executeSosDispatch();
    }
  }, 25);
}

function cancelSosHold() {
  clearInterval(holdTimer);
  el.sosProgressFill.style.transform = 'scale(0)';
  el.sosCaption.textContent = 'HOLD 2 SEC';
}

/* ==========================================================================
   10. COUNTDOWN (I'M UNSAFE 3S)
   ========================================================================== */

function startUnsafeCountdown() {
  audio.init();
  state.countdown.seconds = 3;
  el.countdownNumber.textContent = '3';
  el.countdownModal.classList.remove('hidden');

  clearInterval(state.countdown.timerId);
  state.countdown.timerId = setInterval(() => {
    state.countdown.seconds -= 1;
    if (state.countdown.seconds <= 0) {
      clearInterval(state.countdown.timerId);
      executeSosDispatch();
    } else {
      el.countdownNumber.textContent = String(state.countdown.seconds);
    }
  }, 1000);
}

function closeCountdownModal() {
  clearInterval(state.countdown.timerId);
  el.countdownModal.classList.add('hidden');
}

/* ==========================================================================
   11. FAKE CALL ("MAA") ENGINE
   ========================================================================== */

function startFakeCallFlow() {
  audio.startRingtone();
  state.call.active = false;
  state.call.seconds = 0;

  el.callHeaderStatus.textContent = 'Mobile · Jio 4G';
  el.callStatusLabel.textContent = 'Incoming call…';
  el.callStatusLabel.className = 'call-state-label';
  el.callRingingControls.classList.remove('hidden');
  el.callActiveControls.classList.add('hidden');
  el.callRing1.classList.remove('hidden');
  el.callRing2.classList.remove('hidden');
}

function acceptFakeCall() {
  audio.stopRingtone();
  state.call.active = true;
  state.call.seconds = 0;

  el.callHeaderStatus.textContent = 'HD Voice Connected';
  el.callStatusLabel.textContent = '00:00';
  el.callStatusLabel.className = 'call-state-label call-duration-timer';
  el.callRingingControls.classList.add('hidden');
  el.callActiveControls.classList.remove('hidden');
  el.callRing1.classList.add('hidden');
  el.callRing2.classList.add('hidden');

  clearInterval(state.call.timerId);
  state.call.timerId = setInterval(() => {
    state.call.seconds += 1;
    el.callStatusLabel.textContent = formatDuration(state.call.seconds);
  }, 1000);
}

function stopFakeCallFlow() {
  audio.stopRingtone();
  clearInterval(state.call.timerId);
  state.call.active = false;
}

function declineOrEndFakeCall() {
  stopFakeCallFlow();
  el.callStatusLabel.textContent = 'Call ended';
  setTimeout(() => {
    navigate(state.walk.active ? 'walk' : 'home');
  }, 400);
}

/* ==========================================================================
   12. EVENT LISTENERS
   ========================================================================== */

// Auto Splash Screen Timer (1.5s as specified)
setTimeout(() => {
  if (state.currentScreen === 'splash') {
    navigate('home');
  }
}, 1500);

// Clock updater
function updateClock() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  el.statusClock.textContent = `${hh}:${mm}`;
}
setInterval(updateClock, 10000);
updateClock();

// Demo Mode Toggle
el.toggleDemo.addEventListener('change', e => {
  state.demoMode = e.target.checked;
  localStorage.setItem('nirbhaya_demomode', state.demoMode);
  updateHomeUI();
});

// Contacts Modal
el.btnOpenContacts.addEventListener('click', () => {
  state.contacts.forEach((c, i) => {
    const nameInput = document.getElementById(`contact-name-${i}`);
    const phoneInput = document.getElementById(`contact-phone-${i}`);
    if (nameInput) nameInput.value = c.name;
    if (phoneInput) phoneInput.value = c.phone;
  });
  el.contactsModal.classList.remove('hidden');
});

el.btnCloseContacts.addEventListener('click', () => {
  el.contactsModal.classList.add('hidden');
});

el.btnSaveContacts.addEventListener('click', () => {
  const updated = [0, 1, 2].map(i => ({
    name: (document.getElementById(`contact-name-${i}`).value || '').trim(),
    phone: (document.getElementById(`contact-phone-${i}`).value || '').trim(),
  }));
  state.contacts = updated;
  localStorage.setItem('nirbhaya_contacts', JSON.stringify(updated));
  el.contactsModal.classList.add('hidden');
  updateHomeUI();
});

// Start Walk
el.btnStartWalk.addEventListener('click', () => {
  audio.init();
  startWalkMode();
});

// Walk Back (End Walk)
el.btnWalkBack.addEventListener('click', () => {
  if (confirm('Stop tracking and return home?')) {
    stopWalkMode();
  }
});

// Walk 3 Action Buttons
el.btnImSafe.addEventListener('click', () => {
  stopWalkMode();
});

el.btnFeelingUneasy.addEventListener('click', () => {
  navigate('call');
});

el.btnImUnsafe.addEventListener('click', () => {
  startUnsafeCountdown();
});

// 2s Hold SOS Button
el.sosHoldBtn.addEventListener('mousedown', startSosHold);
el.sosHoldBtn.addEventListener('touchstart', startSosHold);
window.addEventListener('mouseup', cancelSosHold);
window.addEventListener('touchend', cancelSosHold);

// Countdown Modal buttons
el.btnCountdownNow.addEventListener('click', executeSosDispatch);
el.btnCountdownCancel.addEventListener('click', closeCountdownModal);

// SOS Fullscreen Controls
el.btnToggleSiren.addEventListener('click', () => {
  if (audio.isSirenPlaying) {
    audio.stopSiren();
    el.sirenBtnText.textContent = 'PLAY SIREN';
    el.sirenBtnIcon.textContent = '🔊';
  } else {
    audio.startSiren();
    el.sirenBtnText.textContent = 'STOP SIREN';
    el.sirenBtnIcon.textContent = '🔇';
  }
});

el.btnSosImSafe.addEventListener('click', () => {
  stopWalkMode();
});

el.btnSosDismiss.addEventListener('click', () => {
  closeSosOverlay();
});

// Fake Call Buttons
el.btnAcceptCall.addEventListener('click', acceptFakeCall);
el.btnDeclineCall.addEventListener('click', declineOrEndFakeCall);
el.btnEndActiveCall.addEventListener('click', declineOrEndFakeCall);

// Active Call Controls toggles
[el.ctrlMute, el.ctrlKeypad, el.ctrlSpeaker].forEach(btn => {
  btn.addEventListener('click', () => btn.classList.toggle('active'));
});

// Sidebar Simulator Actions
el.simTriggerDev.addEventListener('click', () => {
  if (!state.walk.active) {
    startWalkMode();
  }
  const moved = offsetCoords(state.walk.startCoords, 350, 45);
  state.walk.currentCoords = moved;
  state.walk.distanceMeters = 350;
  updateWalkUI();
});

el.simTriggerFake.addEventListener('click', () => {
  navigate('call');
});

el.simTriggerSos.addEventListener('click', () => {
  if (!state.walk.active) {
    startWalkMode();
  }
  executeSosDispatch();
});

el.simResetWalk.addEventListener('click', () => {
  stopWalkMode();
});

// Initial boot
updateHomeUI();
