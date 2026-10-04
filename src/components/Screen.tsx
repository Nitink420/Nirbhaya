import React from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {colors, spacing} from '../theme';

const TOP_INSET = Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 44;

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  background?: string;
}

/** Full-screen container that accounts for the translucent status bar. */
export function Screen({children, scroll, style, contentStyle, background = colors.bg}: Props) {
  if (scroll) {
    return (
      <ScrollView
        style={[styles.flex, {backgroundColor: background}, style]}
        contentContainerStyle={[styles.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    );
  }
  return (
    <View style={[styles.flex, styles.content, {backgroundColor: background}, style, contentStyle]}>
      {children}
    </View>
  );
}

export const insets = {top: TOP_INSET};

const styles = StyleSheet.create({
  flex: {flex: 1},
  content: {
    paddingTop: TOP_INSET + spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});
