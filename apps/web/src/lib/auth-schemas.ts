/**
 * Zod validation schemas for authentication forms.
 * Kept in a separate file (no "use server") to avoid Next.js
 * treating .refine() callbacks as Server Actions.
 */
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export const registerSchema = z
  .object({
    email: z.string().email("Введите корректный email"),
    password: z
      .string()
      .min(8, "Пароль должен содержать не менее 8 символов")
      .max(128, "Пароль слишком длинный"),
    confirmPassword: z.string().min(1, "Подтвердите пароль"),
    pdnConsent: z.literal(true, {
      errorMap: () => ({
        message: "Необходимо согласие на обработку персональных данных",
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Введите корректный email"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Пароль должен содержать не менее 8 символов")
      .max(128, "Пароль слишком длинный"),
    confirmPassword: z.string().min(1, "Подтвердите пароль"),
    token: z.string().min(1, "Токен сброса пароля отсутствует"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });
