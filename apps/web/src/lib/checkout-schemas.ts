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

  /** Phone (required, any format) */
  phone: z
    .string()
    .min(5, "Укажите номер телефона")
    .max(30, "Слишком длинное значение"),

  /** City (optional) */
  city: z
    .string()
    .max(100, "Слишком длинное значение")
    .optional()
    .or(z.literal("")),

  /** Street (optional) */
  street: z
    .string()
    .max(200, "Слишком длинное значение")
    .optional()
    .or(z.literal("")),

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
