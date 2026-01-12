import { View, ActivityIndicator } from 'react-native';

export default function Index() {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
            <ActivityIndicator size="large" color="#4F46E5" />
        </View>
    );
}
