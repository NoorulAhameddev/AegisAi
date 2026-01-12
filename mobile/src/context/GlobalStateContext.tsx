/**
 * Global App State Management
 * Centralized state for app-wide concerns
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { networkManager } from '../utils/network';
import { logger } from '../utils/logger';
import { AppState, AppStateStatus } from 'react-native';

interface GlobalState {
  isOnline: boolean;
  appState: AppStateStatus;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
}

interface GlobalContextType extends GlobalState {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const useGlobalState = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalState must be used within GlobalStateProvider');
  }
  return context;
};

interface Props {
  children: ReactNode;
}

export const GlobalStateProvider: React.FC<Props> = ({ children }) => {
  const [state, setState] = useState<GlobalState>({
    isOnline: true,
    appState: AppState.currentState,
    isLoading: false,
    hasError: false,
    errorMessage: null,
  });

  useEffect(() => {
    // Network status monitoring
    const unsubscribeNetwork = networkManager.addListener((isOnline) => {
      setState((prev) => ({ ...prev, isOnline }));
      logger.info('Network status changed in global state', { isOnline });
    });

    // App state monitoring (foreground/background)
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      setState((prev) => ({ ...prev, appState: nextAppState }));
      logger.info('App state changed', { state: nextAppState });
    });

    return () => {
      unsubscribeNetwork();
      appStateSubscription.remove();
    };
  }, []);

  const setLoading = (loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }));
  };

  const setError = (error: string | null) => {
    setState((prev) => ({
      ...prev,
      hasError: !!error,
      errorMessage: error,
    }));
    if (error) {
      logger.error('Global error set', null, { message: error });
    }
  };

  const clearError = () => {
    setState((prev) => ({
      ...prev,
      hasError: false,
      errorMessage: null,
    }));
  };

  const value: GlobalContextType = {
    ...state,
    setLoading,
    setError,
    clearError,
  };

  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
};
