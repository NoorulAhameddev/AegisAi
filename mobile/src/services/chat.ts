import { enhancedGet, enhancedPost } from './apiClient';
import { Chat, Message, ChatJobStatus } from '../types/chat';

export const chatService = {
    async getChats(): Promise<Chat[]> {
        return await enhancedGet<Chat[]>('/chat/list', { useCache: true });
    },

    async createChat(title: string = "New Chat"): Promise<string> {
        const data = await enhancedPost<{ chatId: string }>('/chat/create', { title });
        return data.chatId;
    },

    async getHistory(chatId: string): Promise<Message[]> {
        return await enhancedGet<Message[]>(`/chat/history?chatId=${chatId}`, { useCache: false });
    },

    async sendMessage(chatId: string, message: string): Promise<string> {
        const data = await enhancedPost<{ jobId: string }>('/chat/stream', { chatId, message });
        return data.jobId;
    },

    async getJobStatus(jobId: string): Promise<ChatJobStatus> {
        return await enhancedGet<ChatJobStatus>(`/chat/status?jobId=${jobId}`, { useCache: false });
    }
};
