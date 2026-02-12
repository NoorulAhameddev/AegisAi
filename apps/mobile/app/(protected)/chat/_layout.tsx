import { Stack } from 'expo-router';

export default function ChatLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#0F172A',
                },
                headerTintColor: '#F8FAFC',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Messages' }} />
            <Stack.Screen name="[id]" options={{ title: 'Chat' }} />
        </Stack>
    );
}
