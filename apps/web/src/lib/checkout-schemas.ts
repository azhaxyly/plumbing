/**
 * Zod schemas for checkout form validation.
 */

import { z } from "zod";

export const checkoutSchema = z.object({
  /** Customer name (required) */
  name: z
    .string()
    .min(2, "Имя должно содержать не менее 2 символов")
    .max(100, "Имя слишком длинное"),

  /** Phone in format +7XXXXXXXXXX (required) */
  phone: z
    .string()
    .regex(
      /^\+7\d{10}$/,
      "Введите номер в формате +7XXXXXXXXXX"
    ),

  /** Street (required) */
  street: z
    .string()
    .min(2, "Укажите улицу")
    .max(200, "Слишком длинное значение"),

  /** Building / house number (required) */
  building: z
    .string()
    .min(1, "Укажите номер дома")
    .max(20, "Слишком длинное значение"),

  /** Apartment (optional) */
  apartment: z
    .string()
    .max(20, "Слишком длинное значение")
    .optional()
    .or(z.literal("")),

  /** Order comment (optional) */
  comment: z
    .string()
    .max(1000, "Комментарий слишком длинный")
    .optional()
    .or(z.literal("")),

  /** Consent to personal data processing (required) */
  consent: z.literal(true, {
    errorMap: () => ({
      message: "Необходимо согласие на обработку персональных данных",
    }),
  }),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
