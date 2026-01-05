export interface SearchResult {
    resumeId: string;
    title: string;
    userName: string;
    userId: string;
    skills?: string[];
    location?: string;
    createdAt: string;
    accessStatus?: "none" | "pending" | "approved" | "denied";
}

export interface RecruiterSearchResponse {
    results: SearchResult[];
    count: number;
    query: string;
}
