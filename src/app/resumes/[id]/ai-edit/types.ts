export interface Message {
    id: string;
    content: string;
    isUser: boolean;
    timestamp: Date;
}

export interface SessionData {
    [key: string]: unknown;
}

export interface ResumeMeta {
    title?: string | null;
    summary?: string | null;
    updatedAt?: string | null;
    numericId?: number | string | null;
}
