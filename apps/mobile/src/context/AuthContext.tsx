import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types/auth';
import { authService } from '../services/auth';
import { useRouter, useSegments } from 'expo-router';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, pass: string) => Promise<void>;
    signUp: (email: string, pass: string, name: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const u = await authService.getCurrentUser();
            setUser(u);
        } catch (e) {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, pass: string) => {
        const u = await authService.login(email, pass);
        setUser(u);
        router.replace('/(protected)/chat');
    };

    const signUp = async (email: string, pass: string, name: string) => {
        const u = await authService.register(email, pass, name);
        // If registration logs you in
        setUser(u);
        router.replace('/(protected)/chat');
    };

    const signOut = async () => {
        await authService.logout();
        setUser(null);
        router.replace('/(auth)/login');
    };

    // Navigation Protection
    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!user && !inAuthGroup) {
            router.replace('/(auth)/login');
        } else if (user && inAuthGroup) {
            router.replace('/(protected)/chat');
        }
    }, [user, loading, segments]);

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
