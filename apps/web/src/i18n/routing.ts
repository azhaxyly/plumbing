import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Supported locales
  locales: ["ru-KZ"],

  // Default locale (no prefix for default)
  defaultLocale: "ru-KZ",

  // Don't add locale prefix for the default locale
  localePrefix: "never",
});
