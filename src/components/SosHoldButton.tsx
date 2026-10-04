import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, Pressable, StyleSheet, Text, View} from 'react-native';
import {colors, font} from '../theme';
import {buzz} from '../services/sound';

interface Props {
  onTrigger: () => void;
  holdMs?: number;
  size?: number;
  disabled?: boolean;
}

/**
 * Big red SOS button. Must be held for `holdMs` (default 2s) to fire, which
 * prevents accidental triggers in a pocket or bag.
 */
export function SosHoldButton({onTrigger, holdMs = 2000, size = 190, disabled}: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const [holding, setHolding] = useState(false);

  // Idle "radar" pulse.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [ring]);

  const start = () => {
    if (disabled) {
      return;
    }
    setHolding(true);
    buzz(40);
    anim.current = Animated.timing(progress, {
      toValue: 1,
      duration: holdMs,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    anim.current.start(({finished}) => {
      setHolding(false);
      if (finished) {
        buzz([0, 120, 80, 220]);
        progress.setValue(0);
        onTrigger();
      }
    });
  };

  const cancel = () => {
    anim.current?.stop();
    setHolding(false);
    Animated.timing(progress, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const ringStyle = (delay: number) => ({
    opacity: ring.interpolate({
      inputRange: [0, delay, 1],
      outputRange: [0, 0.55, 0],
      extrapolate: 'clamp' as const,
    }),
    transform: [
      {
        scale: ring.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.2 + delay],
        }),
      },
    ],
  });

  const outer = size * 1.0;

  return (
    <View style={[styles.wrap, {width: outer * 1.5, height: outer * 1.5}]}>
      {[0.15, 0.45].map(d => (
        <Animated.View
          key={d}
          pointerEvents="none"
          style={[
            styles.ring,
            {width: outer, height: outer, borderRadius: outer / 2},
            ringStyle(d),
          ]}
        />
      ))}

      <Pressable
        testID="sos-hold-button"
        nativeID="sos-hold-button"
        accessibilityRole="button"
        accessibilityLabel="SOS. Press and hold for two seconds to alert your emergency contacts."
        onPressIn={start}
        onPressOut={cancel}
        disabled={disabled}
        style={[
          styles.button,
          {width: size, height: size, borderRadius: size / 2},
          disabled && styles.disabled,
        ]}>
        {/* Fill that grows while holding */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fill,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [{scale: progress}],
              opacity: progress.interpolate({inputRange: [0, 0.05, 1], outputRange: [0, 0.9, 1]}),
            },
          ]}
        />
        <View style={[styles.innerRing, {width: size - 18, height: size - 18, borderRadius: size}]} />
        <Text style={styles.sos}>SOS</Text>
        <Text style={styles.hint}>{holding ? 'KEEP HOLDING…' : 'HOLD 2 SEC'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {alignItems: 'center', justifyContent: 'center'},
  ring: {position: 'absolute', borderWidth: 2, borderColor: colors.sos},
  button: {
    backgroundColor: colors.sos,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 24,
    shadowColor: colors.sos,
    borderWidth: 3,
    borderColor: '#FB7185',
  },
  fill: {position: 'absolute', backgroundColor: colors.sosDeep},
  innerRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  sos: {
    color: colors.white,
    fontSize: font.sizes.hero + 8,
    fontWeight: '900',
    letterSpacing: 6,
  },
  hint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: font.sizes.xs,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 4,
  },
  disabled: {opacity: 0.5},
});
