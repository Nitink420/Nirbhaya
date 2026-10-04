import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import {Animated, BackHandler, Easing, StyleSheet, View} from 'react-native';
import type {RouteName, RouteParams} from '../types';
import {colors} from '../theme';

/**
 * Tiny dependency-free stack navigator.
 *
 * Screens lower in the stack stay MOUNTED (just hidden) - so WalkMode keeps its
 * GPS watch, timer and SOS state alive while the FakeCall screen is on top.
 */

interface StackEntry<N extends RouteName = RouteName> {
  key: string;
  name: N;
  params: RouteParams[N];
}

interface Navigation {
  navigate<N extends RouteName>(name: N, params?: RouteParams[N]): void;
  goBack(): void;
  reset<N extends RouteName>(name: N, params?: RouteParams[N]): void;
  canGoBack(): boolean;
}

const NavigationContext = createContext<Navigation | null>(null);
const RouteContext = createContext<{entry: StackEntry; focused: boolean} | null>(null);

export function useNavigation(): Navigation {
  const nav = useContext(NavigationContext);
  if (!nav) {
    throw new Error('useNavigation must be used inside <Navigator>');
  }
  return nav;
}

export function useRouteParams<N extends RouteName>(): RouteParams[N] {
  return useContext(RouteContext)?.entry.params as RouteParams[N];
}

export function useIsFocused(): boolean {
  return useContext(RouteContext)?.focused ?? false;
}

/** Hardware back handler that is only active while the screen is focused. Return true to consume. */
export function useFocusedBackHandler(handler: () => boolean) {
  const focused = useIsFocused();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!focused) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => ref.current());
    return () => sub.remove();
  }, [focused]);
}

let keyCounter = 0;
const makeEntry = <N extends RouteName>(name: N, params?: RouteParams[N]): StackEntry =>
  ({key: `${name}-${++keyCounter}`, name, params: params as RouteParams[N]}) as StackEntry;

type ScreenMap = {[N in RouteName]: ComponentType};

export function Navigator({screens, initialRoute}: {screens: ScreenMap; initialRoute: RouteName}) {
  const [stack, setStack] = useState<StackEntry[]>(() => [makeEntry(initialRoute)]);
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const navigation = useMemo<Navigation>(
    () => ({
      navigate: (name, params) => setStack(s => [...s, makeEntry(name, params)]),
      goBack: () => setStack(s => (s.length > 1 ? s.slice(0, -1) : s)),
      reset: (name, params) => setStack([makeEntry(name, params)]),
      canGoBack: () => stackRef.current.length > 1,
    }),
    [],
  );

  // Default back behaviour (screens can override with useFocusedBackHandler).
  const onBack = useCallback(() => {
    if (stackRef.current.length > 1) {
      navigation.goBack();
      return true;
    }
    return false;
  }, [navigation]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [onBack]);

  return (
    <NavigationContext.Provider value={navigation}>
      <View style={styles.root}>
        {stack.map((entry, index) => {
          const focused = index === stack.length - 1;
          const Screen = screens[entry.name];
          return (
            <RouteContext.Provider key={entry.key} value={{entry, focused}}>
              <AnimatedScreen focused={focused}>
                <Screen />
              </AnimatedScreen>
            </RouteContext.Provider>
          );
        })}
      </View>
    </NavigationContext.Provider>
  );
}

function AnimatedScreen({focused, children}: {focused: boolean; children: React.ReactNode}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [focused, anim]);

  return (
    <Animated.View
      pointerEvents={focused ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFill,
        styles.screen,
        !focused && styles.hidden,
        {
          opacity: anim,
          transform: [{translateY: anim.interpolate({inputRange: [0, 1], outputRange: [18, 0]})}],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  screen: {backgroundColor: colors.bg},
  hidden: {display: 'none'},
});
