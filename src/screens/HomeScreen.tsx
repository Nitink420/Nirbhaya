import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  Easing,
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {Screen} from '../components/Screen';
import {Logo} from '../components/Logo';
import {AppButton} from '../components/AppButton';
import {ContactsModal} from '../components/ContactsModal';
import {useIsFocused, useNavigation} from '../navigation/Navigator';
import {
  emptyContacts,
  loadContacts,
  loadSettings,
  saveContacts,
  saveSettings,
  usableContacts,
} from '../services/storage';
import {requestLocationPermission, requestSmsPermission} from '../services/permissions';
import {DEMO_LOCATION} from '../services/location';
import type {AppSettings, EmergencyContact} from '../types';
import {colors, font, radius, spacing} from '../theme';

export function HomeScreen() {
  const nav = useNavigation();
  const focused = useIsFocused();
  const [contacts, setContacts] = useState<EmergencyContact[]>(emptyContacts());
  const [settings, setSettings] = useState<AppSettings>({demoMode: false});
  const [modalOpen, setModalOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const glow = useRef(new Animated.Value(0)).current;

  const refresh = useCallback(async () => {
    const [c, s] = await Promise.all([loadContacts(), loadSettings()]);
    setContacts(c);
    setSettings(s);
  }, []);

  useEffect(() => {
    if (focused) {
      refresh();
    }
  }, [focused, refresh]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(glow, {toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  const ready = usableContacts(contacts);

  const toggleDemo = async (value: boolean) => {
    const next = {...settings, demoMode: value};
    setSettings(next);
    await saveSettings(next);
  };

  const beginWalk = async () => {
    setStarting(true);
    try {
      if (!settings.demoMode) {
        const loc = await requestLocationPermission();
        if (loc !== 'granted') {
          Alert.alert(
            'Location needed',
            loc === 'blocked'
              ? 'Location permission is blocked. Enable it in Settings, or turn on Demo Mode.'
              : 'Walk Mode needs your location to track your route. You can also try Demo Mode.',
            [
              {text: 'Cancel', style: 'cancel'},
              loc === 'blocked'
                ? {text: 'Open Settings', onPress: () => Linking.openSettings()}
                : {text: 'Use Demo Mode', onPress: () => toggleDemo(true)},
            ],
          );
          return;
        }
      }
      // Ask for SMS now so an SOS never stalls on a permission dialog.
      await requestSmsPermission();
      nav.navigate('WalkMode');
    } finally {
      setStarting(false);
    }
  };

  const onStartWalk = () => {
    if (ready.length === 0) {
      Alert.alert(
        'No emergency contacts',
        'SOS alerts need at least one contact. Add them now?',
        [
          {text: 'Start anyway', style: 'destructive', onPress: beginWalk},
          {text: 'Add contacts', onPress: () => setModalOpen(true)},
        ],
      );
      return;
    }
    beginWalk();
  };

  return (
    <Screen scroll>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <Logo size={44} animated={false} />
        <View style={styles.headerText}>
          <Text style={styles.brand}>Nirbhaya</Text>
          <Text style={styles.tagline}>Bina dare, har raah pe</Text>
        </View>
        <View style={[styles.pill, settings.demoMode ? styles.pillDemo : styles.pillLive]}>
          <View style={[styles.dot, {backgroundColor: settings.demoMode ? colors.accent : colors.safe}]} />
          <Text style={[styles.pillText, {color: settings.demoMode ? colors.accent : colors.safe}]}>
            {settings.demoMode ? 'DEMO' : 'READY'}
          </Text>
        </View>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Walking alone?</Text>
        <Text style={styles.heroSub}>
          Start Walk Mode. We'll watch your route, and one long-press sends your live location to
          your people — even without internet.
        </Text>
      </View>

      <View style={styles.startWrap}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.startGlow,
            {
              opacity: glow.interpolate({inputRange: [0, 1], outputRange: [0.25, 0.6]}),
              transform: [{scaleX: glow.interpolate({inputRange: [0, 1], outputRange: [0.96, 1.04]})}],
            },
          ]}
        />
        <AppButton
          id="start-walk-mode"
          label="START WALK MODE"
          sublabel={settings.demoMode ? 'Demo location · New Delhi' : 'Live GPS tracking'}
          icon="🚶‍♀️"
          variant="sos"
          size="lg"
          loading={starting}
          onPress={onStartWalk}
        />
      </View>

      {/* Contacts */}
      <Pressable
        testID="set-emergency-contacts"
        nativeID="set-emergency-contacts"
        onPress={() => setModalOpen(true)}
        style={({pressed}) => [styles.card, pressed && styles.cardPressed]}>
        <View style={styles.cardRow}>
          <View style={[styles.iconBubble, {backgroundColor: colors.sosSoft}]}>
            <Text style={styles.iconText}>👥</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>Set Emergency Contacts</Text>
            <Text style={styles.cardSub}>
              {ready.length === 0
                ? 'No contacts yet — tap to add up to 3'
                : `${ready.length} of 3 saved`}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
        {ready.length > 0 && (
          <View style={styles.chips}>
            {ready.map((c, i) => (
              <View key={i} style={styles.chip}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(c.name || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.chipName} numberOfLines={1}>{c.name}</Text>
                  <Text style={styles.chipPhone}>{c.phone}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Pressable>

      {/* Demo mode */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={[styles.iconBubble, {backgroundColor: colors.accentSoft}]}>
            <Text style={styles.iconText}>🧪</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>Demo Mode</Text>
            <Text style={styles.cardSub}>
              Uses fixed location {DEMO_LOCATION.latitude}, {DEMO_LOCATION.longitude} and simulates a
              walk. SMS are still really sent.
            </Text>
          </View>
          <Switch
            testID="demo-mode-switch"
            value={settings.demoMode}
            onValueChange={toggleDemo}
            trackColor={{false: colors.border, true: colors.accent}}
            thumbColor={settings.demoMode ? colors.white : colors.textMuted}
          />
        </View>
      </View>

      {/* How it works */}
      <Text style={styles.section}>HOW IT WORKS</Text>
      <View style={styles.steps}>
        {[
          {c: colors.safe, t: "I'm Safe", d: 'Ends the walk and takes you home.'},
          {c: colors.warn, t: 'Feeling Uneasy', d: 'Rings a fake call from "Maa" to help you exit.'},
          {c: colors.sos, t: "I'm Unsafe / SOS", d: 'Texts your live location to all contacts + siren.'},
        ].map(s => (
          <View key={s.t} style={styles.step}>
            <View style={[styles.stepBar, {backgroundColor: s.c}]} />
            <View style={styles.flex}>
              <Text style={styles.stepTitle}>{s.t}</Text>
              <Text style={styles.stepDesc}>{s.d}</Text>
            </View>
          </View>
        ))}
      </View>

      <ContactsModal
        visible={modalOpen}
        initial={contacts}
        onClose={() => setModalOpen(false)}
        onSave={async next => {
          await saveContacts(next);
          await refresh();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  header: {flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl},
  headerText: {flex: 1, marginLeft: spacing.xs},
  brand: {color: colors.text, fontSize: font.sizes.xl, fontWeight: '900', letterSpacing: 0.5},
  tagline: {color: colors.textMuted, fontSize: font.sizes.xs, fontStyle: 'italic'},
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillLive: {backgroundColor: colors.safeSoft, borderColor: 'rgba(16,185,129,0.35)'},
  pillDemo: {backgroundColor: colors.accentSoft, borderColor: 'rgba(167,139,250,0.35)'},
  dot: {width: 7, height: 7, borderRadius: 4, marginRight: 6},
  pillText: {fontSize: font.sizes.xs, fontWeight: '800', letterSpacing: 1.2},

  hero: {marginBottom: spacing.xl},
  heroTitle: {color: colors.text, fontSize: font.sizes.xxl + 4, fontWeight: '900'},
  heroSub: {color: colors.textMuted, fontSize: font.sizes.md, lineHeight: 22, marginTop: spacing.sm},

  startWrap: {marginBottom: spacing.xl, justifyContent: 'center'},
  startGlow: {
    position: 'absolute',
    left: -8,
    right: -8,
    top: -8,
    bottom: -8,
    borderRadius: radius.xl + 8,
    backgroundColor: colors.sosGlow,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: spacing.md,
  },
  cardPressed: {backgroundColor: colors.surfaceAlt},
  cardRow: {flexDirection: 'row', alignItems: 'center'},
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconText: {fontSize: 20},
  cardTitle: {color: colors.text, fontSize: font.sizes.md, fontWeight: '700'},
  cardSub: {color: colors.textMuted, fontSize: font.sizes.sm, marginTop: 2, lineHeight: 18, paddingRight: spacing.sm},
  chevron: {color: colors.textDim, fontSize: 28, marginLeft: spacing.sm},
  chips: {marginTop: spacing.md, gap: spacing.sm},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.sosSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {color: colors.sos, fontWeight: '800'},
  chipName: {color: colors.text, fontWeight: '600', fontSize: font.sizes.sm},
  chipPhone: {color: colors.textDim, fontSize: font.sizes.xs, fontFamily: font.mono},

  section: {
    color: colors.textDim,
    fontSize: font.sizes.xs,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  steps: {gap: spacing.sm},
  step: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  stepBar: {width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: spacing.md},
  stepTitle: {color: colors.text, fontWeight: '700', fontSize: font.sizes.sm},
  stepDesc: {color: colors.textMuted, fontSize: font.sizes.xs, marginTop: 2},
});
