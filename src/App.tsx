import React from 'react';
import {StatusBar} from 'react-native';
import {Navigator} from './navigation/Navigator';
import {SplashScreen} from './screens/SplashScreen';
import {HomeScreen} from './screens/HomeScreen';
import {WalkModeScreen} from './screens/WalkModeScreen';
import {FakeCallScreen} from './screens/FakeCallScreen';

const screens = {
  Splash: SplashScreen,
  Home: HomeScreen,
  WalkMode: WalkModeScreen,
  FakeCall: FakeCallScreen,
};

export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Navigator screens={screens} initialRoute="Splash" />
    </>
  );
}
