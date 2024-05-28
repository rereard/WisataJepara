/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import Home from './src/screen/HomeAdmin';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import Router from './src/router';

function App() {
  return (
    <NavigationContainer>
      <GestureHandlerRootView>
        <Router />
      </GestureHandlerRootView>
    </NavigationContainer>
  );
}

export default App;
