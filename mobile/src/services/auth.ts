import { api } from './api';
import { enhancedGet, enhancedPost } from './apiClient';
import { storage } from './storage';
import { User } from '../types/auth';

export const authService = {
    async register(email: string, password: string, name: string): Promise<User> {
        return await enhancedPost<User>('/auth/register', { email, password, name });
    },

    async login(email: string, pass: string): Promise<User> {
        // Use raw api for login to handle set-cookie manually if needed via interceptors,
        // but apiClient also works. Let's use enhanced for consistency and retry.
        await enhancedPost('/auth/login', { email, password: pass });

        // Backend only returns a message; fetch profile after cookies are set
        const user = await this.getCurrentUser();
        if (!user) throw new Error('Unable to load user after login');
        return user;
    },

    async logout(): Promise<void> {
        try {
            await enhancedPost('/auth/logout', {});
        } catch (e) { /* ignore */ }
        await storage.clearTokens();
    },

    async getCurrentUser(): Promise<User | null> {
        try {
            return await enhancedGet<User>('/auth/me', { useCache: false, skipRetry: true });
        } catch (e) {
            return null;
        }
    }
};
