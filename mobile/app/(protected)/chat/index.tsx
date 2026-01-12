import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Chat } from '../../../src/types/chat';
import { chatService } from '../../../src/services/chat';
import { Ionicons } from '@expo/vector-icons';

export default function ChatList() {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    useEffect(() => {
        loadChats();
    }, []);

    const loadChats = async () => {
        try {
            const data = await chatService.getChats();
            setChats(data || []);
        } catch (e) {
            console.log('Failed to load chats');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadChats();
    };

    const createNewChat = async () => {
        try {
            const id = await chatService.createChat();
            router.push(`/(protected)/chat/${id}`);
        } catch (e) {
            Alert.alert('Error', 'Failed to create chat');
        }
    };

    const handleDeleteChat = (chatId: string, chatTitle: string) => {
        Alert.alert(
            'Delete Chat',
            `Are you sure you want to delete "${chatTitle || 'New Chat'}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // await chatService.deleteChat(chatId);
                            setChats(prev => prev.filter(c => c.id !== chatId));
                            Alert.alert('Success', 'Chat deleted successfully');
                        } catch (e) {
                            Alert.alert('Error', 'Failed to delete chat');
                        }
                    }
                }
            ]
        );
    };

    const handleRenameChat = (chatId: string, currentTitle: string) => {
        Alert.prompt(
            'Rename Chat',
            'Enter a new name for this conversation',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Rename',
                    onPress: async (newTitle?: string) => {
                        if (!newTitle?.trim()) return;
                        try {
                            // await chatService.renameChat(chatId, newTitle);
                            setChats(prev => prev.map(c =>
                                c.id === chatId ? { ...c, title: newTitle } : c
                            ));
                            Alert.alert('Success', 'Chat renamed successfully');
                        } catch (e) {
                            Alert.alert('Error', 'Failed to rename chat');
                        }
                    }
                }
            ],
            'plain-text',
            currentTitle || 'New Chat'
        );
    };

    const handleLongPress = (chat: Chat) => {
        Alert.alert(
            chat.title || 'New Chat',
            'Choose an action',
            [
                {
                    text: 'Rename',
                    onPress: () => handleRenameChat(chat.id, chat.title || '')
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => handleDeleteChat(chat.id, chat.title || '')
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const renderItem = ({ item }: { item: Chat }) => (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => router.push(`/(protected)/chat/${item.id}`)}
            onLongPress={() => handleLongPress(item)}
            delayLongPress={500}
        >
            <View style={styles.chatIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFF" />
            </View>
            <View style={styles.chatInfo}>
                <Text style={styles.chatTitle} numberOfLines={1}>{item.title || 'New Chat'}</Text>
                <Text style={styles.chatDate}>{new Date(item.createdAt || Date.now()).toLocaleDateString()}</Text>
            </View>
            <TouchableOpacity
                style={styles.moreButton}
                onPress={() => handleLongPress(item)}
            >
                <Ionicons name="ellipsis-vertical" size={20} color="#64748B" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color="#4F46E5" size="large" />
                <Text style={styles.loadingText}>Loading conversations...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={chats}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="chatbubbles-outline" size={64} color="#334155" />
                        </View>
                        <Text style={styles.emptyTitle}>No conversations yet</Text>
                        <Text style={styles.emptyText}>Start a new chat to begin your AI journey</Text>
                        <TouchableOpacity style={styles.createButton} onPress={createNewChat}>
                            <Ionicons name="add" size={20} color="#FFF" />
                            <Text style={styles.createButtonText}>Start New Chat</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {chats.length > 0 && (
                <TouchableOpacity style={styles.fab} onPress={createNewChat}>
                    <Ionicons name="add" size={30} color="#FFF" />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    center: {
        flex: 1,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#94A3B8',
        marginTop: 12,
        fontSize: 14,
    },
    list: {
        padding: 16,
        paddingBottom: 100,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    chatIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    chatInfo: {
        flex: 1,
    },
    chatTitle: {
        color: '#F8FAFC',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    chatDate: {
        color: '#94A3B8',
        fontSize: 12,
    },
    moreButton: {
        padding: 8,
        marginLeft: 8,
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIcon: {
        marginBottom: 20,
        opacity: 0.5,
    },
    emptyTitle: {
        color: '#F8FAFC',
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    createButton: {
        flexDirection: 'row',
        backgroundColor: '#4F46E5',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 24,
        alignItems: 'center',
        gap: 8,
    },
    createButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
});

