import { z } from "zod";
import { sanitize } from "./security";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name too long")
    .regex(/^[a-zA-Z0-9\s]+$/, "Name contains special characters")
    .transform((val) => sanitize(val)),
  email: z.string().email("Invalid email address").toLowerCase(),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[!@#$%^&*(),.?":{}|<>]/,
      "Password must contain at least one special character",
    ),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50)
    .optional()
    .transform((val) => (val ? sanitize(val) : undefined)),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "One uppercase required")
    .regex(/[a-z]/, "One lowercase required")
    .regex(/[0-9]/, "One number required")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "One special character required"),
});

export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(4000, "Message too long")
    .transform((val) => sanitize(val)), // Apply sanitization
  chatId: z.string().uuid().optional(),
  fileId: z.string().uuid().optional(),
});

export const banUserSchema = z.object({
  ban: z.boolean(),
  reason: z
    .string()
    .optional()
    .transform((val) => (val ? sanitize(val) : undefined)),
  ticketId: z.string().optional(),
});
