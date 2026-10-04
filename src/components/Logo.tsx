import React, {useEffect, useRef} from 'react';
import {Animated, Easing, Image, StyleSheet, View} from 'react-native';
import {colors} from '../theme';

const LOGO = require('../assets/logo.png');

/** Nirbhaya shield logo with a softly breathing crimson halo. */
export function Logo({size = 120, animated = true}: {size?: number; animated?: boolean}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) {
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animated, pulse]);

  const haloSize = size * 1.45;

  return (
    <View style={[styles.wrap, {width: haloSize, height: haloSize}]}>
      <Animated.View
        style={[
          styles.halo,
          {
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            opacity: pulse.interpolate({inputRange: [0, 1], outputRange: [0.25, 0.6]}),
            transform: [{scale: pulse.interpolate({inputRange: [0, 1], outputRange: [0.9, 1.05]})}],
          },
        ]}
      />
      <Image
        source={LOGO}
        style={{width: size, height: size, borderRadius: size * 0.24}}
        resizeMode="cover"
        accessibilityLabel="Nirbhaya logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {alignItems: 'center', justifyContent: 'center'},
  halo: {position: 'absolute', backgroundColor: colors.sosGlow},
});
