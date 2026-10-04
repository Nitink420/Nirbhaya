import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, Pressable, StatusBar, StyleSheet, Text, View} from 'react-native';
import {insets} from '../components/Screen';
import {useFocusedBackHandler, useNavigation, useRouteParams} from '../navigation/Navigator';
import {startRinging, stopRinging} from '../services/sound';
import {formatDuration} from '../utils/geo';
import {colors, font, spacing} from '../theme';

type CallState = 'ringing' | 'active' | 'ended';

export function FakeCallScreen() {
  const nav = useNavigation();
  const params = useRouteParams<'FakeCall'>();
  const caller = params?.callerName ?? 'Maa';

  const [state, setState] = useState<CallState>('ringing');
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [keypad, setKeypad] = useState(false);

  const pulse = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  // Ringtone + vibration while ringing.
  useEffect(() => {
    if (state !== 'ringing') {
      return;
    }
    startRinging();
    const pulseLoop = Animated.loop(
      Animated.timing(pulse, {toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true}),
    );
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {toValue: 1, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(bob, {toValue: 0, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ]),
    );
    pulseLoop.start();
    bobLoop.start();
    return () => {
      stopRinging();
      pulseLoop.stop();
      bobLoop.stop();
    };
  }, [state, pulse, bob]);

  // Call timer once accepted.
  useEffect(() => {
    if (state !== 'active') {
      return;
    }
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => () => stopRinging(), []);

  const accept = () => {
    setSeconds(0);
    setState('active');
  };

  const hangUp = () => {
    setState('ended');
    stopRinging();
    setTimeout(() => nav.goBack(), state === 'active' ? 700 : 0);
  };

  useFocusedBackHandler(() => {
    hangUp();
    return true;
  });

  const ringScale = (offset: number) => ({
    opacity: pulse.interpolate({inputRange: [0, 1], outputRange: [0.45 - offset * 0.15, 0]}),
    transform: [{scale: pulse.interpolate({inputRange: [0, 1], outputRange: [1, 1.7 + offset * 0.4]})}],
  });

  const statusText =
    state === 'ringing' ? 'Incoming call…' : state === 'active' ? formatDuration(seconds) : 'Call ended';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />

      {/* Caller */}
      <View style={styles.top}>
        <Text style={styles.carrier}>{state === 'ringing' ? 'Mobile · Jio 4G' : 'HD Voice'}</Text>
        <View style={styles.avatarWrap}>
          {state === 'ringing' &&
            [0, 1].map(o => (
              <Animated.View key={o} style={[styles.avatarRing, ringScale(o)]} />
            ))}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{caller.charAt(0).toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.name}>{caller} ❤️</Text>
        <Text style={styles.number}>+91 98XXX XXX21</Text>
        <Text style={[styles.status, state === 'active' && styles.statusActive]}>{statusText}</Text>
      </View>

      {state === 'ringing' ? (
        <View style={styles.bottom}>
          <View style={styles.quickRow}>
            <QuickAction icon="⏰" label="Remind me" />
            <QuickAction icon="💬" label="Message" />
          </View>
          <View style={styles.callRow}>
            <View style={styles.callCol}>
              <Pressable
                testID="fake-call-decline"
                nativeID="fake-call-decline"
                accessibilityLabel="Decline call"
                onPress={hangUp}
                style={({pressed}) => [styles.roundBtn, styles.decline, pressed && styles.pressed]}>
                <Text style={[styles.roundIcon, styles.declineIcon]}>📞</Text>
              </Pressable>
              <Text style={styles.callLabel}>Decline</Text>
            </View>
            <View style={styles.callCol}>
              <Animated.View
                style={{transform: [{translateY: bob.interpolate({inputRange: [0, 1], outputRange: [0, -8]})}]}}>
                <Pressable
                  testID="fake-call-accept"
                  nativeID="fake-call-accept"
                  accessibilityLabel="Accept call"
                  onPress={accept}
                  style={({pressed}) => [styles.roundBtn, styles.accept, pressed && styles.pressed]}>
                  <Text style={styles.roundIcon}>📞</Text>
                </Pressable>
              </Animated.View>
              <Text style={styles.callLabel}>Accept</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.bottom}>
          <View style={styles.grid}>
            <ControlButton icon={muted ? '🔇' : '🎙️'} label="Mute" active={muted} onPress={() => setMuted(m => !m)} />
            <ControlButton icon="⌨️" label="Keypad" active={keypad} onPress={() => setKeypad(k => !k)} />
            <ControlButton icon="🔊" label="Speaker" active={speaker} onPress={() => setSpeaker(s => !s)} />
            <ControlButton icon="➕" label="Add call" />
            <ControlButton icon="⏸️" label="Hold" />
            <ControlButton icon="📹" label="Video" />
          </View>
          <View style={styles.endWrap}>
            <Pressable
              testID="fake-call-end"
              nativeID="fake-call-end"
              accessibilityLabel="End call"
              onPress={hangUp}
              disabled={state === 'ended'}
              style={({pressed}) => [styles.roundBtn, styles.decline, pressed && styles.pressed]}>
              <Text style={[styles.roundIcon, styles.declineIcon]}>📞</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function QuickAction({icon, label}: {icon: string; label: string}) {
  return (
    <View style={styles.quick}>
      <Text style={styles.quickIcon}>{icon}</Text>
      <Text style={styles.quickLabel}>{label}</Text>
    </View>
  );
}

function ControlButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <View style={styles.control}>
      <Pressable
        onPress={onPress}
        style={({pressed}) => [styles.controlBtn, active && styles.controlActive, pressed && styles.pressed]}>
        <Text style={styles.controlIcon}>{icon}</Text>
      </Pressable>
      <Text style={styles.controlLabel}>{label}</Text>
    </View>
  );
}

const ROUND = 74;

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.callBg, justifyContent: 'space-between', overflow: 'hidden'},
  bgOrbTop: {
    position: 'absolute',
    top: -160,
    left: -100,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(59,130,246,0.16)',
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: -180,
    right: -120,
    width: 460,
    height: 460,
    borderRadius: 230,
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  top: {alignItems: 'center', paddingTop: insets.top + 48},
  carrier: {color: 'rgba(255,255,255,0.55)', fontSize: font.sizes.sm, letterSpacing: 0.5},
  avatarWrap: {width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginVertical: spacing.xl},
  avatarRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F472B6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarText: {color: colors.white, fontSize: 52, fontWeight: '700'},
  name: {color: colors.white, fontSize: 38, fontWeight: '400', letterSpacing: 0.5},
  number: {color: 'rgba(255,255,255,0.6)', fontSize: font.sizes.md, marginTop: spacing.xs},
  status: {color: 'rgba(255,255,255,0.75)', fontSize: font.sizes.lg, marginTop: spacing.md},
  statusActive: {fontVariant: ['tabular-nums'], color: colors.callAccept},

  bottom: {paddingBottom: 56, paddingHorizontal: spacing.xxl},
  quickRow: {flexDirection: 'row', justifyContent: 'space-around', marginBottom: 40},
  quick: {alignItems: 'center'},
  quickIcon: {fontSize: 22},
  quickLabel: {color: 'rgba(255,255,255,0.7)', fontSize: font.sizes.xs, marginTop: 4},
  callRow: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg},
  callCol: {alignItems: 'center'},
  roundBtn: {
    width: ROUND,
    height: ROUND,
    borderRadius: ROUND / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
  },
  accept: {backgroundColor: colors.callAccept, shadowColor: colors.callAccept},
  decline: {backgroundColor: colors.callDecline, shadowColor: colors.callDecline},
  roundIcon: {fontSize: 30, color: colors.white},
  declineIcon: {transform: [{rotate: '135deg'}]},
  pressed: {opacity: 0.8, transform: [{scale: 0.95}]},
  callLabel: {color: colors.white, fontSize: font.sizes.sm, marginTop: spacing.sm},

  grid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 40},
  control: {width: '33%', alignItems: 'center', marginBottom: spacing.xl},
  controlBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlActive: {backgroundColor: 'rgba(255,255,255,0.85)'},
  controlIcon: {fontSize: 24},
  controlLabel: {color: 'rgba(255,255,255,0.8)', fontSize: font.sizes.xs, marginTop: spacing.sm},
  endWrap: {alignItems: 'center'},
});
