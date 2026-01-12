import { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Message } from '../../../src/types/chat';
import { chatService } from '../../../src/services/chat';
import { Ionicons } from '@expo/vector-icons';

export default function ChatDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (id) {
            loadHistory();
            // Setup interval to poll for new messages if needed, 
            // but strictly we only poll after we send a job.
        }
    }, [id]);

    const loadHistory = async () => {
        try {
            const msgs = await chatService.getHistory(id!);
            setMessages(msgs.reverse()); // Inverted list
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const pollJob = async (jobId: string) => {
        const interval = setInterval(async () => {
            try {
                const status = await chatService.getJobStatus(jobId);
                if (status.state === 'completed') {
                    clearInterval(interval);
                    setSending(false);
                    loadHistory(); // Refresh to see AI response
                } else if (status.state === 'failed') {
                    clearInterval(interval);
                    setSending(false);
                    alert('AI Failed to respond');
                }
            } catch (e) {
                clearInterval(interval); // If clean fail
                setSending(false);
            }
        }, 2000); // Poll every 2s
    };

    const handleSend = async () => {
        if (!input.trim() || sending) return;

        const text = input.trim();
        setInput('');
        setSending(true);

        // Optimistic update
        const tempMsg: Message = {
            id: Date.now().toString(),
            role: 'USER',
            content: text,
            createdAt: new Date().toISOString()
        };
        setMessages(prev => [tempMsg, ...prev]);

        try {
            const jobId = await chatService.sendMessage(id!, text);
            pollJob(jobId);
        } catch (e) {
            setSending(false);
            alert('Failed to send message');
        }
    };

    const renderItem = ({ item }: { item: Message }) => {
        const isUser = item.role === 'USER';
        return (
            <View style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.botBubble
            ]}>
                <Text style={styles.messageText}>{item.content}</Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            style={styles.container}
        >
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color="#4F46E5" />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    inverted
                    contentContainerStyle={styles.list}
                />
            )}

            {sending && (
                <View style={styles.typingIndicator}>
                    <ActivityIndicator size="small" color="#94A3B8" />
                    <Text style={styles.typingText}>Aegis is thinking...</Text>
                </View>
            )}

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor="#64748B"
                    value={input}
                    onChangeText={setInput}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendButton, (!input.trim() || sending) && styles.disabledButton]}
                    onPress={handleSend}
                    disabled={!input.trim() || sending}
                >
                    <Ionicons name="send" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        padding: 16,
        paddingBottom: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#4F46E5',
        borderBottomRightRadius: 4,
    },
    botBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#1E293B',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        color: '#F8FAFC',
        fontSize: 16,
        lineHeight: 22,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    input: {
        flex: 1,
        backgroundColor: '#0F172A',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: '#FFF',
        fontSize: 16,
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    disabledButton: {
        backgroundColor: '#334155',
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    typingText: {
        color: '#94A3B8',
        marginLeft: 8,
        fontSize: 12,
    },
});
