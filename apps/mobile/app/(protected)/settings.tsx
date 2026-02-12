import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

export default function Settings() {
    const { signOut, user } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: signOut }
            ]
        );
    };

    const openGitHub = () => {
        Linking.openURL('https://github.com/noorulahamed/aegis-ai');
    };

    const SettingItem = ({ icon, title, subtitle, onPress, danger = false }: any) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress}>
            <View style={[styles.iconContainer, danger && styles.dangerIcon]}>
                <Ionicons name={icon} size={20} color={danger ? '#EF4444' : '#4F46E5'} />
            </View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, danger && styles.dangerText]}>{title}</Text>
                {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>
            {/* Profile Section */}
            <View style={styles.profile}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{user?.name?.[0] || user?.email?.[0] || 'U'}</Text>
                </View>
                <Text style={styles.name}>{user?.name || 'User'}</Text>
                <Text style={styles.email}>{user?.email}</Text>
            </View>

            {/* Account Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>ACCOUNT</Text>
                <View style={styles.sectionContent}>
                    <SettingItem
                        icon="person-outline"
                        title="Edit Profile"
                        subtitle="Update your name and preferences"
                        onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available soon!')}
                    />
                    <SettingItem
                        icon="key-outline"
                        title="Change Password"
                        subtitle="Update your account password"
                        onPress={() => Alert.alert('Coming Soon', 'Password change will be available soon!')}
                    />
                </View>
            </View>

            {/* App Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>APP</Text>
                <View style={styles.sectionContent}>
                    <SettingItem
                        icon="notifications-outline"
                        title="Notifications"
                        subtitle="Manage notification preferences"
                        onPress={() => Alert.alert('Coming Soon', 'Notification settings will be available soon!')}
                    />
                    <SettingItem
                        icon="moon-outline"
                        title="Theme"
                        subtitle="Dark mode (Default)"
                        onPress={() => Alert.alert('Theme', 'Dark mode is currently the default theme')}
                    />
                    <SettingItem
                        icon="language-outline"
                        title="Language"
                        subtitle="English"
                        onPress={() => Alert.alert('Language', 'Multi-language support coming soon!')}
                    />
                </View>
            </View>

            {/* About Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>ABOUT</Text>
                <View style={styles.sectionContent}>
                    <SettingItem
                        icon="information-circle-outline"
                        title="Version"
                        subtitle={`${Constants.expoConfig?.version || '1.0.0'} (${Constants.expoConfig?.extra?.buildNumber || '1'})`}
                        onPress={() => {}}
                    />
                    <SettingItem
                        icon="logo-github"
                        title="GitHub Repository"
                        subtitle="View source code"
                        onPress={openGitHub}
                    />
                    <SettingItem
                        icon="shield-checkmark-outline"
                        title="Privacy Policy"
                        subtitle="How we protect your data"
                        onPress={() => Alert.alert('Privacy', 'Your data is encrypted and secure.')}
                    />
                    <SettingItem
                        icon="document-text-outline"
                        title="Terms of Service"
                        subtitle="App usage terms"
                        onPress={() => Alert.alert('Terms', 'Standard terms of service apply.')}
                    />
                </View>
            </View>

            {/* Danger Zone */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>DANGER ZONE</Text>
                <View style={styles.sectionContent}>
                    <SettingItem
                        icon="log-out-outline"
                        title="Sign Out"
                        subtitle="Log out of your account"
                        onPress={handleLogout}
                        danger
                    />
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Aegis AI Mobile</Text>
                <Text style={styles.footerSubtext}>Secure. Intelligent. Private.</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    profile: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarText: {
        fontSize: 32,
        color: '#FFF',
        fontWeight: 'bold',
    },
    name: {
        fontSize: 24,
        color: '#F8FAFC',
        fontWeight: 'bold',
        marginBottom: 8,
    },
    email: {
        fontSize: 16,
        color: '#94A3B8',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        paddingHorizontal: 20,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    sectionContent: {
        backgroundColor: '#1E293B',
        marginHorizontal: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#4F46E520',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    dangerIcon: {
        backgroundColor: '#EF444420',
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        color: '#F8FAFC',
        fontWeight: '500',
        marginBottom: 2,
    },
    dangerText: {
        color: '#EF4444',
    },
    settingSubtitle: {
        fontSize: 13,
        color: '#94A3B8',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingBottom: 60,
    },
    footerText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 4,
    },
    footerSubtext: {
        fontSize: 12,
        color: '#475569',
    },
});
