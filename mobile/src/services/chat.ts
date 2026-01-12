import { api } from './api';
import { Chat, Message, ChatJobStatus } from '../types/chat';

export const chatService = {
    async getChats(): Promise<Chat[]> {
        const { data } = await api.get('/chat/list');
        return data;
    },

    async createChat(title: string = "New Chat"): Promise<string> {
        const { data } = await api.post('/chat/create', { title });
        return data.chatId;
    },

    async getHistory(chatId: string): Promise<Message[]> {
        const { data } = await api.get(`/chat/history?chatId=${chatId}`);
        return data;
    },

    async sendMessage(chatId: string, message: string): Promise<string> {
        const { data } = await api.post('/chat/stream', { chatId, message });
        return data.jobId;
    },

    async getJobStatus(jobId: string): Promise<ChatJobStatus> {
        const { data } = await api.get(`/chat/status?jobId=${jobId}`);
        return data;
    }
};
