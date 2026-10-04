import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Screen, insets} from '../components/Screen';
import {AppButton} from '../components/AppButton';
import {SosHoldButton} from '../components/SosHoldButton';
import {useFocusedBackHandler, useNavigation} from '../navigation/Navigator';
import {loadContacts, loadSettings, usableContacts} from '../services/storage';
import {resolveSosLocation, watchLocation} from '../services/location';
import {buzz, startAlarm, stopAlarm} from '../services/sound';
import {retryFailed, sendSosToContacts} from '../services/sos';
import {
  distanceMeters,
  formatCoord,
  formatDistance,
  formatDuration,
  mapsLink,
} from '../utils/geo';
import type {AppSettings, ContactSendStatus, Coords, EmergencyContact} from '../types';
import {colors, font, radius, spacing} from '../theme';

const DEVIATION_LIMIT_M = 300;
const UNSAFE_COUNTDOWN_S = 3;

type SosPhase = 'idle' | 'locating' | 'sending' | 'done' | 'error';

export function WalkModeScreen() {
  const nav = useNavigation();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [start, setStart] = useState<Coords | null>(null);
  const [current, setCurrent] = useState<Coords | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const [sosPhase, setSosPhase] = useState<SosPhase>('idle');
  const [sosStatuses, setSosStatuses] = useState<ContactSendStatus[]>([]);
  const [sosCoords, setSosCoords] = useState<Coords | null>(null);
  const [sosError, setSosError] = useState<string | null>(null);
  const [sirenOn, setSirenOn] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const startRef = useRef<Coords | null>(null);
  const lastKnownRef = useRef<Coords | null>(null);
  const sosBusyRef = useRef(false);
  const deviatedRef = useRef(false);
  const live = useRef(new Animated.Value(0)).current;
  const bannerPulse = useRef(new Animated.Value(0)).current;

  const demoMode = settings?.demoMode ?? false;
  const usable = useMemo(() => usableContacts(contacts), [contacts]);

  /* ----------------------------- bootstrapping ----------------------------- */

  useEffect(() => {
    Promise.all([loadSettings(), loadContacts()]).then(([s, c]) => {
      setContacts(c);
      setSettings(s);
    });
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    const liveLoop = Animated.loop(
      Animated.timing(live, {toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true}),
    );
    liveLoop.start();
    return () => {
      clearInterval(timer);
      liveLoop.stop();
      stopAlarm();
    };
  }, [live]);

  // GPS watch (or simulated demo walk) for as long as the walk lasts.
  useEffect(() => {
    if (!settings) {
      return;
    }
    const watcher = watchLocation({
      demoMode: settings.demoMode,
      onUpdate: c => {
        lastKnownRef.current = c;
        if (!startRef.current) {
          startRef.current = c;
          setStart(c);
        }
        setCurrent(c);
        setGpsError(null);
      },
      onError: setGpsError,
    });
    return () => watcher.stop();
  }, [settings]);

  /* ------------------------------- deviation ------------------------------- */

  const distance = start && current ? distanceMeters(start, current) : 0;
  const deviated = distance > DEVIATION_LIMIT_M;

  useEffect(() => {
    if (deviated && !deviatedRef.current) {
      buzz([0, 300, 150, 300]);
    }
    deviatedRef.current = deviated;

    if (!deviated) {
      bannerPulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bannerPulse, {toValue: 1, duration: 700, useNativeDriver: true}),
        Animated.timing(bannerPulse, {toValue: 0, duration: 700, useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [deviated, bannerPulse]);

  /* ---------------------------------- SOS ---------------------------------- */

  const triggerSos = useCallback(async () => {
    if (sosBusyRef.current) {
      return;
    }
    sosBusyRef.current = true;
    setCountdown(null);
    setSosError(null);
    setSosCoords(null);
    setSosStatuses(usable.map(contact => ({contact, state: 'pending'})));
    setSosPhase('locating');

    try {
      // 1. Location
      let coords: Coords;
      try {
        coords = await resolveSosLocation({demoMode, lastKnown: lastKnownRef.current});
      } catch (e) {
        setSosError((e as Error).message || 'Could not get your location');
        setSosPhase('error');
        startAlarm();
        setSirenOn(true);
        return;
      }
      setSosCoords(coords);

      // 2. SMS to every contact
      setSosPhase('sending');
      if (usable.length === 0) {
        setSosError('No emergency contacts saved - SMS not sent.');
      } else {
        await sendSosToContacts(usable, coords, setSosStatuses);
      }

      // 3. Vibrate + siren
      startAlarm();
      setSirenOn(true);
      setSosPhase('done');
    } finally {
      sosBusyRef.current = false;
    }
  }, [demoMode, usable]);

  const retry = async () => {
    if (!sosCoords || sosBusyRef.current) {
      triggerSos();
      return;
    }
    sosBusyRef.current = true;
    setSosPhase('sending');
    try {
      const res = await retryFailed(sosStatuses, sosCoords, setSosStatuses);
      setSosStatuses(res);
    } finally {
      sosBusyRef.current = false;
      setSosPhase('done');
    }
  };

  // "I'm Unsafe" -> 3 second cancellable countdown -> SOS
  useEffect(() => {
    if (countdown === null) {
      return;
    }
    if (countdown <= 0) {
      triggerSos();
      return;
    }
    buzz(80);
    const t = setTimeout(() => setCountdown(c => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, triggerSos]);

  const toggleSiren = () => {
    if (sirenOn) {
      stopAlarm();
    } else {
      startAlarm();
    }
    setSirenOn(!sirenOn);
  };

  const closeSos = () => {
    stopAlarm();
    setSirenOn(false);
    setSosPhase('idle');
  };

  /* ------------------------------ navigation ------------------------------- */

  const endWalk = useCallback(() => {
    stopAlarm();
    nav.reset('Home');
  }, [nav]);

  useFocusedBackHandler(() => {
    if (countdown !== null) {
      setCountdown(null);
      return true;
    }
    Alert.alert('End walk?', 'Stop tracking and return home?', [
      {text: 'Keep walking', style: 'cancel'},
      {text: "I'm safe, end", onPress: endWalk},
    ]);
    return true;
  });

  /* --------------------------------- render -------------------------------- */

  const sosActive = sosPhase !== 'idle';
  const progress = Math.min(distance / DEVIATION_LIMIT_M, 1);
  const anyFailed = sosStatuses.some(s => s.state === 'failed');
  const sentCount = sosStatuses.filter(s => s.state === 'sent' || s.state === 'queued').length;

  return (
    <Screen scroll contentStyle={styles.content}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          testID="walk-back"
          onPress={() =>
            Alert.alert('End walk?', 'Stop tracking and return home?', [
              {text: 'Keep walking', style: 'cancel'},
              {text: "I'm safe, end", onPress: endWalk},
            ])
          }
          hitSlop={12}
          style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.title}>Walk Mode</Text>
          <Text style={styles.subtitle}>Tracking for {formatDuration(elapsed)}</Text>
        </View>
        <View style={[styles.livePill, demoMode && styles.demoPill]}>
          <View style={styles.liveDotWrap}>
            <Animated.View
              style={[
                styles.liveRing,
                {
                  backgroundColor: demoMode ? colors.accent : colors.safe,
                  opacity: live.interpolate({inputRange: [0, 1], outputRange: [0.6, 0]}),
                  transform: [{scale: live.interpolate({inputRange: [0, 1], outputRange: [1, 2.6]})}],
                },
              ]}
            />
            <View style={[styles.liveDot, {backgroundColor: demoMode ? colors.accent : colors.safe}]} />
          </View>
          <Text style={[styles.liveText, {color: demoMode ? colors.accent : colors.safe}]}>
            {demoMode ? 'DEMO' : 'LIVE'}
          </Text>
        </View>
      </View>

      {/* Deviation alert */}
      {deviated && (
        <Animated.View
          testID="deviation-alert"
          style={[
            styles.banner,
            {opacity: bannerPulse.interpolate({inputRange: [0, 1], outputRange: [1, 0.75]})},
          ]}>
          <Text style={styles.bannerIcon}>⚠️</Text>
          <View style={styles.flex}>
            <Text style={styles.bannerTitle}>You're {formatDistance(distance)} from your start</Text>
            <Text style={styles.bannerSub}>
              More than {DEVIATION_LIMIT_M} m off. Feeling uneasy? Use the fake call or SOS.
            </Text>
          </View>
        </Animated.View>
      )}

      {gpsError && (
        <View style={styles.gpsError}>
          <Text style={styles.gpsErrorText}>📡 {gpsError}</Text>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsCard}>
        <Text style={styles.statLabel}>DISTANCE FROM START</Text>
        <View style={styles.distanceRow}>
          <Text style={[styles.distance, deviated && {color: colors.warn}]}>
            {current ? formatDistance(distance) : '—'}
          </Text>
          <Text style={styles.limit}>/ {DEVIATION_LIMIT_M} m</Text>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.trackFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: deviated ? colors.warn : progress > 0.7 ? '#FBBF24' : colors.safe,
              },
            ]}
          />
        </View>

        <View style={styles.coordGrid}>
          <CoordBlock label="LIVE POSITION" coords={current} accent={colors.safe} />
          <View style={styles.divider} />
          <CoordBlock label="START POINT" coords={start} accent={colors.textMuted} />
        </View>
        {current?.accuracy != null && (
          <Text style={styles.accuracy}>GPS accuracy ±{Math.round(current.accuracy)} m</Text>
        )}
        {!current && !gpsError && (
          <View style={styles.locating}>
            <ActivityIndicator color={colors.safe} size="small" />
            <Text style={styles.locatingText}>Getting GPS fix…</Text>
          </View>
        )}
      </View>

      {/* SOS */}
      <View style={styles.sosWrap}>
        <SosHoldButton onTrigger={triggerSos} disabled={sosActive} />
        <Text style={styles.sosCaption}>
          {usable.length > 0
            ? `Alerts ${usable.map(c => c.name).join(', ')}`
            : 'No emergency contacts saved'}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <AppButton id="btn-im-safe" label="I'M SAFE" sublabel="End walk" icon="✓" variant="safe" onPress={endWalk} />
        <AppButton
          id="btn-feeling-uneasy"
          label="FEELING UNEASY"
          sublabel="Get a fake call from Maa"
          icon="📞"
          variant="warn"
          onPress={() => nav.navigate('FakeCall', {callerName: 'Maa'})}
        />
        <AppButton
          id="btn-im-unsafe"
          label="I'M UNSAFE"
          sublabel={`Send SOS in ${UNSAFE_COUNTDOWN_S}s`}
          icon="🚨"
          variant="sos"
          onPress={() => setCountdown(UNSAFE_COUNTDOWN_S)}
          disabled={sosActive}
        />
      </View>

      {/* Countdown overlay */}
      <Modal visible={countdown !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setCountdown(null)}>
        <View style={styles.countdownBackdrop}>
          <Text style={styles.countdownLabel}>SENDING SOS IN</Text>
          <Text style={styles.countdownNum}>{countdown ?? ''}</Text>
          <Text style={styles.countdownSub}>Your location will be texted to {usable.length} contact(s)</Text>
          <View style={styles.countdownActions}>
            <AppButton id="countdown-send-now" label="SEND NOW" variant="sos" onPress={triggerSos} style={styles.flex} />
            <AppButton id="countdown-cancel" label="CANCEL" variant="outline" onPress={() => setCountdown(null)} style={styles.flex} />
          </View>
        </View>
      </Modal>

      {/* SOS overlay */}
      <Modal visible={sosActive} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <ScrollView style={styles.sosRoot} contentContainerStyle={styles.sosContent}>
          <View style={styles.sosHeader}>
            <Animated.View
              style={[
                styles.sosBeacon,
                {
                  opacity: live.interpolate({inputRange: [0, 1], outputRange: [0.7, 0]}),
                  transform: [{scale: live.interpolate({inputRange: [0, 1], outputRange: [1, 2.2]})}],
                },
              ]}
            />
            <View style={styles.sosBeaconCore}>
              <Text style={styles.sosBeaconText}>SOS</Text>
            </View>
          </View>
          <Text style={styles.sosTitle}>
            {sosPhase === 'locating'
              ? 'Getting your location…'
              : sosPhase === 'sending'
              ? 'Alerting your contacts…'
              : sosPhase === 'error'
              ? 'Location unavailable'
              : 'SOS sent'}
          </Text>
          <Text style={styles.sosSub}>
            {sosPhase === 'done'
              ? `${sentCount} of ${sosStatuses.length} contacts alerted · siren ${sirenOn ? 'on' : 'off'}`
              : sosError ?? 'Stay calm. Keep the phone with you.'}
          </Text>
          {sosError && sosPhase === 'done' && <Text style={styles.sosErr}>{sosError}</Text>}

          {sosCoords && (
            <Pressable onPress={() => Linking.openURL(mapsLink(sosCoords))} style={styles.locCard}>
              <Text style={styles.locLabel}>📍 LOCATION SHARED</Text>
              <Text style={styles.locCoords}>
                {formatCoord(sosCoords.latitude)}, {formatCoord(sosCoords.longitude)}
              </Text>
              <Text style={styles.locLink} numberOfLines={1}>{mapsLink(sosCoords)}</Text>
            </Pressable>
          )}

          <View style={styles.statusList}>
            {sosStatuses.map((s, i) => (
              <ContactStatusRow key={i} status={s} />
            ))}
          </View>

          <View style={styles.sosActions}>
            {anyFailed && sosPhase === 'done' && (
              <AppButton id="sos-retry" label="RETRY FAILED" variant="warn" onPress={retry} />
            )}
            {sosPhase === 'error' && (
              <AppButton id="sos-retry-location" label="TRY AGAIN" variant="warn" onPress={triggerSos} />
            )}
            <AppButton
              id="sos-toggle-siren"
              label={sirenOn ? 'STOP SIREN' : 'PLAY SIREN'}
              icon={sirenOn ? '🔇' : '🔊'}
              variant="surface"
              onPress={toggleSiren}
            />
            <AppButton id="sos-im-safe" label="I'M SAFE NOW" sublabel="End SOS & walk" variant="safe" onPress={endWalk} />
            <AppButton id="sos-close" label="Back to Walk Mode" variant="ghost" onPress={closeSos} disabled={sosPhase === 'locating' || sosPhase === 'sending'} />
          </View>
        </ScrollView>
      </Modal>
    </Screen>
  );
}

/* ------------------------------ sub-components ------------------------------ */

function CoordBlock({label, coords, accent}: {label: string; coords: Coords | null; accent: string}) {
  return (
    <View style={styles.coordBlock}>
      <Text style={[styles.coordLabel, {color: accent}]}>{label}</Text>
      <Text style={styles.coordValue}>{coords ? formatCoord(coords.latitude) : '--.------'}</Text>
      <Text style={styles.coordValue}>{coords ? formatCoord(coords.longitude) : '--.------'}</Text>
    </View>
  );
}

function ContactStatusRow({status}: {status: ContactSendStatus}) {
  const {contact, state, error} = status;
  const meta = {
    pending: {color: colors.textDim, text: 'Waiting'},
    sending: {color: colors.warn, text: 'Sending…'},
    sent: {color: colors.safe, text: 'Sent'},
    queued: {color: colors.warn, text: 'Queued'},
    failed: {color: colors.sos, text: error ?? 'Failed'},
  }[state];
  return (
    <View style={styles.statusRow}>
      <View style={styles.statusAvatar}>
        <Text style={styles.statusAvatarText}>{(contact.name || '?').charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.statusName}>{contact.name}</Text>
        <Text style={styles.statusPhone}>{contact.phone}</Text>
      </View>
      <View style={styles.statusRight}>
        {state === 'sending' ? (
          <ActivityIndicator color={meta.color} size="small" />
        ) : (
          <Text style={[styles.statusIcon, {color: meta.color}]}>
            {state === 'sent' || state === 'queued' ? '✓' : state === 'failed' ? '✕' : '•'}
          </Text>
        )}
        <Text style={[styles.statusText, {color: meta.color}]} numberOfLines={1}>{meta.text}</Text>
      </View>
    </View>
  );
}

/* ---------------------------------- styles ---------------------------------- */

const styles = StyleSheet.create({
  flex: {flex: 1},
  content: {paddingBottom: 48},
  header: {flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg},
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  backText: {color: colors.text, fontSize: 28, marginTop: -4},
  title: {color: colors.text, fontSize: font.sizes.xl, fontWeight: '900'},
  subtitle: {color: colors.textMuted, fontSize: font.sizes.sm, fontVariant: ['tabular-nums']},
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.safeSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  demoPill: {backgroundColor: colors.accentSoft},
  liveDotWrap: {width: 10, height: 10, alignItems: 'center', justifyContent: 'center', marginRight: 6},
  liveRing: {position: 'absolute', width: 8, height: 8, borderRadius: 4},
  liveDot: {width: 8, height: 8, borderRadius: 4},
  liveText: {fontSize: font.sizes.xs, fontWeight: '900', letterSpacing: 1.5},

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warnSoft,
    borderColor: colors.warn,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  bannerIcon: {fontSize: 24, marginRight: spacing.md},
  bannerTitle: {color: colors.warn, fontWeight: '800', fontSize: font.sizes.md},
  bannerSub: {color: '#FCD34D', fontSize: font.sizes.xs, marginTop: 2, opacity: 0.9},

  gpsError: {
    backgroundColor: colors.sosSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  gpsErrorText: {color: '#FDA4AF', fontSize: font.sizes.sm, fontWeight: '600'},

  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  statLabel: {color: colors.textDim, fontSize: font.sizes.xs, fontWeight: '800', letterSpacing: 1.5},
  distanceRow: {flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.xs},
  distance: {color: colors.text, fontSize: 44, fontWeight: '900', fontVariant: ['tabular-nums']},
  limit: {color: colors.textDim, fontSize: font.sizes.md, marginLeft: spacing.sm, marginBottom: 10},
  track: {height: 6, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden', marginTop: spacing.sm},
  trackFill: {height: 6, borderRadius: 3},
  coordGrid: {flexDirection: 'row', marginTop: spacing.lg},
  coordBlock: {flex: 1},
  divider: {width: 1, backgroundColor: colors.border, marginHorizontal: spacing.md},
  coordLabel: {fontSize: font.sizes.xs, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4},
  coordValue: {color: colors.text, fontFamily: font.mono, fontSize: font.sizes.md},
  accuracy: {color: colors.textDim, fontSize: font.sizes.xs, marginTop: spacing.md},
  locating: {flexDirection: 'row', alignItems: 'center', marginTop: spacing.md},
  locatingText: {color: colors.textMuted, marginLeft: spacing.sm, fontSize: font.sizes.sm},

  sosWrap: {alignItems: 'center', marginVertical: spacing.lg},
  sosCaption: {color: colors.textMuted, fontSize: font.sizes.xs, marginTop: -spacing.md, textAlign: 'center'},

  actions: {gap: spacing.md},

  countdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(13,13,15,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  countdownLabel: {color: colors.sos, fontWeight: '900', letterSpacing: 3, fontSize: font.sizes.md},
  countdownNum: {color: colors.white, fontSize: 140, fontWeight: '900', fontVariant: ['tabular-nums']},
  countdownSub: {color: colors.textMuted, fontSize: font.sizes.sm, marginBottom: spacing.xxl},
  countdownActions: {flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch'},

  sosRoot: {flex: 1, backgroundColor: '#14060A'},
  sosContent: {padding: spacing.xl, paddingTop: insets.top + spacing.xl, paddingBottom: 48},
  sosHeader: {alignItems: 'center', justifyContent: 'center', height: 140},
  sosBeacon: {position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: colors.sos},
  sosBeaconCore: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.sos,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 20,
    shadowColor: colors.sos,
  },
  sosBeaconText: {color: colors.white, fontWeight: '900', fontSize: 26, letterSpacing: 3},
  sosTitle: {color: colors.white, fontSize: font.sizes.xxl, fontWeight: '900', textAlign: 'center'},
  sosSub: {color: '#FDA4AF', fontSize: font.sizes.sm, textAlign: 'center', marginTop: spacing.xs},
  sosErr: {color: colors.warn, fontSize: font.sizes.sm, textAlign: 'center', marginTop: spacing.xs},
  locCard: {
    backgroundColor: 'rgba(225,29,72,0.12)',
    borderColor: 'rgba(225,29,72,0.4)',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  locLabel: {color: '#FDA4AF', fontWeight: '800', fontSize: font.sizes.xs, letterSpacing: 1.5},
  locCoords: {color: colors.white, fontFamily: font.mono, fontSize: font.sizes.lg, marginTop: 4},
  locLink: {color: '#FB7185', fontSize: font.sizes.xs, marginTop: 4, textDecorationLine: 'underline'},
  statusList: {marginTop: spacing.lg, gap: spacing.sm},
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  statusAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.sosSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  statusAvatarText: {color: colors.sos, fontWeight: '900'},
  statusName: {color: colors.white, fontWeight: '700'},
  statusPhone: {color: colors.textDim, fontSize: font.sizes.xs, fontFamily: font.mono},
  statusRight: {alignItems: 'flex-end', maxWidth: 140},
  statusIcon: {fontSize: 20, fontWeight: '900'},
  statusText: {fontSize: font.sizes.xs, fontWeight: '700'},
  sosActions: {gap: spacing.md, marginTop: spacing.xl},
});
