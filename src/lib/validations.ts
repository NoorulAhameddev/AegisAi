import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name too long")
        .regex(/^[a-zA-Z0-9\s]+$/, "Name contains special characters"),
    email: z.string().email("Invalid email address"),
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
});

export const updateProfileSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50).optional(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters")
        .regex(/[A-Z]/, "One uppercase required")
        .regex(/[0-9]/, "One number required"),
});

export const chatMessageSchema = z.object({
    message: z.string().min(1, "Message cannot be empty").max(4000, "Message too long"),
    chatId: z.string().uuid().optional(),
    fileId: z.string().uuid().optional(),
});

export const banUserSchema = z.object({
    ban: z.boolean(),
});
