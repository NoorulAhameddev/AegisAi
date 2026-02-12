export interface User {
    id: string;
    email: string;
    name?: string;
    role?: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export interface ApiError {
    message: string;
    code?: string;
    status?: number;
}
