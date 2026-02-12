export interface Chat {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

export interface Message {
    id: string;
    role: 'USER' | 'ASSISTANT';
    content: string;
    createdAt: string;
}

export interface ChatJobStatus {
    jobId: string;
    state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
    result?: any;
    error?: string;
}
