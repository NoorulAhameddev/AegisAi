import { Slot } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';
import { GlobalStateProvider } from '../src/context/GlobalStateContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { logger } from '../src/utils/logger';
import ErrorBoundary from '../src/components/ErrorBoundary';

export default function RootLayout() {
  useEffect(() => {
    logger.info('App initialized');
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GlobalStateProvider>
          <AuthProvider>
            <StatusBar style="auto" />
            <Slot />
          </AuthProvider>
        </GlobalStateProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
