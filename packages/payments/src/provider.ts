/**
 * Abstract PaymentProvider interface.
 * All payment integrations (Kaspi, Invoice, COD) implement this contract.
 */

import type { Money } from "@whitehouse/domain";

export interface CreatePaymentInput {
  orderId: string;
  amount: Money;
  currency: string;
  returnUrl: string;
  failedUrl: string;
  webhookUrl: string;
  idempotencyKey: string;
  description?: string;
}

export interface CreatePaymentResult {
  providerPaymentId: string;
  redirectUrl?: string;
  qrPayload?: string;
  status: "pending" | "created";
}

export interface RefundInput {
  providerPaymentId: string;
  amount: Money;
  reason?: string;
  idempotencyKey: string;
}

export interface WebhookVerificationInput {
  rawBody: string;
  headers: Record<string, string | string[] | undefined>;
}

export type WebhookEventType = "paid" | "failed" | "refunded" | "pending";

export interface WebhookEvent {
  eventId: string;
  providerPaymentId: string;
  type: WebhookEventType;
  amount: Money;
  rawPayload: unknown;
}

export interface PaymentProvider {
  readonly name: string;

  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;

  getStatus(
    providerPaymentId: string,
  ): Promise<{ status: WebhookEventType; amount: Money }>;

  refund(input: RefundInput): Promise<{ success: boolean; refundId?: string }>;

  verifyWebhook(input: WebhookVerificationInput): Promise<WebhookEvent>;
}
