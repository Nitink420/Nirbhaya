import React, {useRef} from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {colors, radius, spacing, font} from '../theme';

export type ButtonVariant = 'sos' | 'safe' | 'warn' | 'surface' | 'outline' | 'ghost';

interface Props {
  id?: string;
  label: string;
  sublabel?: string;
  icon?: string;
  variant?: ButtonVariant;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

const VARIANTS: Record<ButtonVariant, {bg: string; fg: string; border: string; glow?: string}> = {
  sos: {bg: colors.sos, fg: colors.white, border: '#FB7185', glow: colors.sos},
  safe: {bg: colors.safe, fg: '#03140D', border: '#34D399', glow: colors.safe},
  warn: {bg: colors.warn, fg: '#1A1003', border: '#FCD34D', glow: colors.warn},
  surface: {bg: colors.surfaceAlt, fg: colors.text, border: colors.border},
  outline: {bg: 'transparent', fg: colors.text, border: colors.border},
  ghost: {bg: 'transparent', fg: colors.textMuted, border: 'transparent'},
};

export function AppButton({
  id,
  label,
  sublabel,
  icon,
  variant = 'surface',
  onPress,
  onLongPress,
  disabled,
  loading,
  size = 'md',
  style,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const v = VARIANTS[variant];

  const animate = (to: number) =>
    Animated.spring(scale, {toValue: to, useNativeDriver: true, speed: 40, bounciness: 6}).start();

  return (
    <Animated.View style={[{transform: [{scale}]}, style]}>
      <Pressable
        testID={id}
        nativeID={id}
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled || loading}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => animate(0.96)}
        onPressOut={() => animate(1)}
        android_ripple={{color: 'rgba(255,255,255,0.12)'}}
        style={[
          styles.base,
          size === 'lg' && styles.lg,
          {backgroundColor: v.bg, borderColor: v.border},
          v.glow && {shadowColor: v.glow, elevation: 10},
          (disabled || loading) && styles.disabled,
        ]}>
        {loading ? (
          <ActivityIndicator color={v.fg} />
        ) : (
          <View style={styles.row}>
            {icon ? <Text style={[styles.icon, {color: v.fg}]}>{icon}</Text> : null}
            <View style={styles.texts}>
              <Text style={[styles.label, size === 'lg' && styles.labelLg, {color: v.fg}]}>
                {label}
              </Text>
              {sublabel ? (
                <Text style={[styles.sublabel, {color: v.fg}]}>{sublabel}</Text>
              ) : null}
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lg: {minHeight: 68, borderRadius: radius.xl},
  disabled: {opacity: 0.5},
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center'},
  texts: {alignItems: 'center'},
  icon: {fontSize: 20, marginRight: spacing.sm},
  label: {fontSize: font.sizes.md, fontWeight: '800', letterSpacing: 0.6},
  labelLg: {fontSize: font.sizes.lg, letterSpacing: 1.2},
  sublabel: {fontSize: font.sizes.xs, opacity: 0.8, marginTop: 2, fontWeight: '600'},
});
