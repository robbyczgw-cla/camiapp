// Polyfill crypto.getRandomValues for React Native
// Required by @noble/ed25519 (used in expo-openclaw-chat for device identity)
import * as ExpoCrypto from 'expo-crypto';
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = {};
}
if (typeof globalThis.crypto.getRandomValues === 'undefined') {
  globalThis.crypto.getRandomValues = ExpoCrypto.getRandomValues as any;
}

import 'react-native-reanimated';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
