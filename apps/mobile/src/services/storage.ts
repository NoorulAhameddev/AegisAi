import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';

// Web support wrapper (SecureStore doesn't work on web)
const isWeb = Platform.OS === 'web';

export const storage = {
    async getAccessToken(): Promise<string | null> {
        if (isWeb) return localStorage.getItem(ACCESS_TOKEN_KEY);
        return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    },

    async setAccessToken(token: string) {
        if (isWeb) localStorage.setItem(ACCESS_TOKEN_KEY, token);
        else await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    },

    async getRefreshToken(): Promise<string | null> {
        if (isWeb) return localStorage.getItem(REFRESH_TOKEN_KEY);
        return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    },

    async setRefreshToken(token: string) {
        if (isWeb) localStorage.setItem(REFRESH_TOKEN_KEY, token);
        else await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    },

    async clearTokens() {
        if (isWeb) {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
        } else {
            await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        }
    }
};
