import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Link } from 'expo-router';
import { ENV } from '../../src/config/env';
import { securityManager } from '../../src/utils/security';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const { signIn } = useAuth();

    useEffect(() => {
        if (ENV.REQUIRE_BIOMETRIC && ENV.IS_PROD) {
            handleBiometricAuth();
        }
    }, []);

    const handleBiometricAuth = async () => {
        const available = await securityManager.isBiometricAvailable();
        if (available) {
            const success = await securityManager.authenticateWithBiometrics('Sign in to Aegis AI');
            if (success) {
                // If we have saved credentials, we could auto-login here.
                // For now, we just acknowledge the security check.
                console.log('Biometric auth success');
            }
        }
    };

    const handleLogin = async () => {
        if (!email || !password) return Alert.alert('Error', 'Please fill all fields');

        if (ENV.REQUIRE_BIOMETRIC && ENV.IS_PROD) {
            const success = await securityManager.authenticateWithBiometrics();
            if (!success) return;
        }

        setBusy(true);
        try {
            await signIn(email, password);
        } catch (e: any) {
            Alert.alert('Login Failed', e?.message || 'Unknown error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.form}>
                <Text style={styles.title}>Aegis AI</Text>
                <Text style={styles.subtitle}>Welcome Back</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleLogin}
                    disabled={busy}
                >
                    {busy ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.buttonText}>Sign In</Text>
                    )}
                </TouchableOpacity>

                <Link href="/(auth)/register" asChild>
                    <TouchableOpacity style={styles.linkButton}>
                        <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
                    </TouchableOpacity>
                </Link>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        padding: 20,
    },
    form: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#F8FAFC',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
        marginBottom: 32,
    },
    input: {
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        color: '#F8FAFC',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    button: {
        backgroundColor: '#4F46E5',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
    },
    linkButton: {
        marginTop: 20,
        alignItems: 'center',
    },
    linkText: {
        color: '#818CF8',
        fontSize: 14,
    },
});
