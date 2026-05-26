/**
 * @timsan/domain
 * Pure domain logic — no Next.js, no I/O, no side effects.
 * Contains: types, cart logic, order state machine, shipping calculator, etc.
 */

// Branded ID types and Money primitives
export type {
  Currency,
  Money,
  UserId,
  ProductId,
  VariantId,
  CategoryId,
  BrandId,
  CartId,
  OrderId,
  PaymentId,
  AddressId,
  IdempotencyKey,
} from "./types";

// Cart domain — types and pure computation
export type {
  CartItemId,
  CartItem,
  Cart,
  CartItemWithTotal,
  CartTotals,
} from "./cart";
export { computeTotals } from "./cart";

// Order state machine
export type { OrderStatus } from "./order-state";
export {
  ALLOWED_TRANSITIONS,
  canTransition,
  transitionOrder,
} from "./order-state";

// Notification system — provider interfaces and types
export type {
  NotificationChannel,
  OrderNotificationPayload,
  EmailProvider,
  TelegramInlineKeyboardButton,
  TelegramInlineKeyboard,
  TelegramMessageOptions,
  TelegramProvider,
  SmsProvider,
  NotificationResult,
} from "./notifications";
