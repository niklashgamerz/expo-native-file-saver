import { requireNativeModule } from 'expo-modules-core';

// This loads the native module from the native side.
const ExpoNativeFileSaverModule = requireNativeModule('ExpoNativeFileSaver');

export default ExpoNativeFileSaverModule;
