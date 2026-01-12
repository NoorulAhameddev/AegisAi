import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage } from './storage';
import { formatCookieHeader, parseSetCookie } from '../utils/cookies';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';
import { performanceMonitor } from '../utils/performance';
import { monitoring } from './monitoring';

const API_URL = ENV.API_URL;

logger.info('API Service Initialized', { url: API_URL });

export const api = axios.create({
    baseURL: API_URL,
    timeout: ENV.API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': '1.0.0',
        'X-Platform': 'mobile',
    },
    withCredentials: true,
    validateStatus: (status) => status < 500,
});

// Helper to keep track of refresh promise to avoid multiple calls
let refreshPromise: Promise<void> | null = null;

const refreshTokens = async () => {
    const refreshToken = await storage.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
            headers: {
                'Cookie': `auth_refresh=${refreshToken}`
            }
        });

        if (response.status === 200 && response.headers['set-cookie']) {
            const newCookies = parseSetCookie(response.headers['set-cookie']);
            if (newCookies['auth_access']) await storage.setAccessToken(newCookies['auth_access']);
            if (newCookies['auth_refresh']) await storage.setRefreshToken(newCookies['auth_refresh']);
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
};

api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const stopTimer = performanceMonitor.startTimer(`API ${config.method?.toUpperCase()} ${config.url}`);
        (config as any)._startTime = Date.now();
        (config as any)._stopTimer = stopTimer;

        logger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`);

        const access = await storage.getAccessToken();
        const refresh = await storage.getRefreshToken();

        const cookies: any = {};
        if (access) cookies['auth_access'] = access;
        if (refresh) cookies['auth_refresh'] = refresh;

        if (Object.keys(cookies).length > 0) {
            config.headers['Cookie'] = formatCookieHeader(cookies);
        }

        return config;
    },
    (error) => {
        logger.error('Request interceptor error', error);
        monitoring.recordError();
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    async (response) => {
        // Record performance metrics
        const startTime = (response.config as any)._startTime;
        const stopTimer = (response.config as any)._stopTimer;
        if (startTime) {
            const duration = Date.now() - startTime;
            monitoring.recordResponseTime(duration);
        }
        if (stopTimer) stopTimer();

        // Capture tokens if present in any response (e.g. login/register)
        if (response.headers['set-cookie']) {
            const cookies = parseSetCookie(response.headers['set-cookie']);
            if (cookies['auth_access']) await storage.setAccessToken(cookies['auth_access']);
            if (cookies['auth_refresh']) await storage.setRefreshToken(cookies['auth_refresh']);
        }

        // Handle 401
        if (response.status === 401) {
            const originalRequest = response.config;

            // Prevent infinite loop
            if ((originalRequest as any)._retry) {
                return Promise.reject(new Error("Unauthorized"));
            }

            (originalRequest as any)._retry = true;

            try {
                if (!refreshPromise) {
                    refreshPromise = refreshTokens().then((success) => {
                        refreshPromise = null;
                        if (!success) throw new Error("Refresh failed");
                    });
                }
                await refreshPromise;

                // Retry original request
                return api(originalRequest);
            } catch (e) {
                await storage.clearTokens();
                monitoring.recordError();
                return Promise.reject(e);
            }
        }

        return response;
    },
    (error: AxiosError) => {
        monitoring.recordError();
        const handledError = ErrorHandler.handle(error, 'API Response');
        return Promise.reject(handledError);
    }
);
