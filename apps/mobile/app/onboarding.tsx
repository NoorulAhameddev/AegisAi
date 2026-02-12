import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';


const { width } = Dimensions.get('window');

export default function Onboarding() {
    const router = useRouter();

    const features = [
        {
            icon: 'shield-checkmark',
            title: 'Secure & Private',
            description: 'Your conversations are encrypted end-to-end'
        },
        {
            icon: 'flash',
            title: 'Lightning Fast',
            description: 'Get instant AI responses powered by advanced models'
        },
        {
            icon: 'infinite',
            title: 'Unlimited Chats',
            description: 'Create as many conversations as you need'
        }
    ];

    return (
        <View style={styles.container}>
            {/* Hero Section */}
            <View style={styles.hero}>
                <View style={styles.logoContainer}>
                    <View style={styles.logo}>
                        <Ionicons name="shield" size={60} color="#4F46E5" />
                    </View>
                </View>
                <Text style={styles.title}>Welcome to Aegis AI</Text>
                <Text style={styles.subtitle}>Your Intelligent AI Assistant</Text>
            </View>

            {/* Features */}
            <View style={styles.features}>
                {features.map((feature, index) => (
                    <View key={index} style={styles.featureCard}>
                        <View style={styles.featureIcon}>
                            <Ionicons name={feature.icon as any} size={28} color="#4F46E5" />
                        </View>
                        <View style={styles.featureContent}>
                            <Text style={styles.featureTitle}>{feature.title}</Text>
                            <Text style={styles.featureDescription}>{feature.description}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* CTA Buttons */}
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => router.replace('/(auth)/register')}
                >
                    <Text style={styles.primaryButtonText}>Get Started</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => router.replace('/(auth)/login')}
                >
                    <Text style={styles.secondaryButtonText}>I Already Have an Account</Text>
                </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    By continuing, you agree to our{' '}
                    <Text style={styles.link}>Terms</Text> and{' '}
                    <Text style={styles.link}>Privacy Policy</Text>
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
        paddingHorizontal: 20,
    },
    hero: {
        alignItems: 'center',
        paddingTop: 80,
        paddingBottom: 40,
    },
    logoContainer: {
        marginBottom: 24,
    },
    logo: {
        width: 120,
        height: 120,
        borderRadius: 30,
        backgroundColor: '#1E293B',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#4F46E5',
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
    },
    features: {
        flex: 1,
        justifyContent: 'center',
        gap: 20,
    },
    featureCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155',
    },
    featureIcon: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#4F46E520',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#F8FAFC',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 14,
        color: '#94A3B8',
        lineHeight: 20,
    },
    actions: {
        paddingVertical: 20,
        gap: 12,
    },
    primaryButton: {
        flexDirection: 'row',
        backgroundColor: '#4F46E5',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    secondaryButtonText: {
        color: '#94A3B8',
        fontSize: 16,
        fontWeight: '500',
    },
    footer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 18,
    },
    link: {
        color: '#4F46E5',
        fontWeight: '600',
    },
});
