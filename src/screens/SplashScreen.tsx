import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Logo} from '../components/Logo';
import {useNavigation} from '../navigation/Navigator';
import {colors, font, spacing} from '../theme';

const SPLASH_MS = 1500;

export function SplashScreen() {
  const nav = useNavigation();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {toValue: 1, duration: 600, useNativeDriver: true}),
      Animated.timing(rise, {
        toValue: 1,
        duration: 800,
        delay: 150,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
    ]).start();
    const t = setTimeout(() => nav.reset('Home'), SPLASH_MS);
    return () => clearTimeout(t);
  }, [fade, rise, nav]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.glow} />
      <Animated.View
        style={{
          opacity: fade,
          transform: [{scale: fade.interpolate({inputRange: [0, 1], outputRange: [0.85, 1]})}],
        }}>
        <Logo size={128} />
      </Animated.View>
      <Animated.View
        style={[
          styles.texts,
          {
            opacity: rise,
            transform: [{translateY: rise.interpolate({inputRange: [0, 1], outputRange: [16, 0]})}],
          },
        ]}>
        <Text style={styles.title}>Nirbhaya</Text>
        <Text style={styles.tagline}>Bina dare, har raah pe</Text>
      </Animated.View>
      <Text style={styles.footer}>OFFLINE · PRIVATE · ALWAYS READY</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center'},
  glow: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: colors.sosSoft,
    top: '22%',
  },
  texts: {alignItems: 'center', marginTop: spacing.lg},
  title: {
    color: colors.text,
    fontSize: font.sizes.hero,
    fontWeight: '900',
    letterSpacing: 2,
  },
  tagline: {
    color: colors.sos,
    fontSize: font.sizes.lg,
    fontWeight: '600',
    fontStyle: 'italic',
    marginTop: spacing.xs,
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    color: colors.textDim,
    fontSize: font.sizes.xs,
    fontWeight: '700',
    letterSpacing: 3,
  },
});
