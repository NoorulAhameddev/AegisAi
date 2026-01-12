import { api } from './api';
import { storage } from './storage';
import { User, AuthResponse } from '../types/auth';

export const authService = {
    async register(email: string, password: string, name: string): Promise<User> {
        const { data } = await api.post('/auth/register', { email, password, name });
        // Assuming register logs in automatically or returns user
        // Inspecting backend is skipped, assuming standard flow. 
        // If it doesn't auto-login, we might need to login after.
        // Usually register -> returns { user, ... }
        return data;
    },

    async login(email: string, pass: string): Promise<User> {
        const response = await api.post('/auth/login', { email, password: pass });

        if (response.status !== 200) {
            throw new Error(response.data?.error || 'Login failed');
        }

        // Backend only returns a message; fetch profile after cookies are set
        const user = await this.getCurrentUser();
        if (!user) throw new Error('Unable to load user after login');
        return user;
    },

    async logout(): Promise<void> {
        try {
            await api.post('/auth/logout');
        } catch (e) { /* ignore */ }
        await storage.clearTokens();
    },

    async getCurrentUser(): Promise<User | null> {
        try {
            const { data } = await api.get('/auth/me');
            return data;
        } catch (e) {
            return null;
        }
    }
};
