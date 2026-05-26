import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import { createElement } from "react";
import type { EmailProvider, OrderNotificationPayload } from "@timsan/domain";
import { OrderNotificationEmail } from "./order-notification-template";

export interface NodemailerConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure?: boolean;
}

export class NodemailerEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor(private config: NodemailerConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? config.port === 465,
      auth: config.user
        ? { user: config.user, pass: config.pass }
        : undefined,
    });
  }

  async send(to: string[], subject: string, html: string, text?: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to: to.join(", "),
      subject,
      html,
      text,
    });
  }

  async sendOrderNotification(to: string[], payload: OrderNotificationPayload): Promise<void> {
    const html = await render(createElement(OrderNotificationEmail, { payload }));
    const text = this.buildPlainText(payload);
    const subject = `Новый заказ №${payload.orderNumber} на ${Math.round(payload.totalCents / 100).toLocaleString("ru-KZ")} ₸`;
    await this.send(to, subject, html, text);
  }

  private buildPlainText(payload: OrderNotificationPayload): string {
    const totalKzt = Math.round(payload.totalCents / 100).toLocaleString("ru-KZ");
    const itemsText = payload.items
      .map(
        (it) =>
          `  - ${it.name} (${it.sku}): ${it.quantity} × ${Math.round(it.unitPriceCents / 100).toLocaleString("ru-KZ")} ₸`,
      )
      .join("\n");

    return [
      `Новый заказ №${payload.orderNumber}`,
      ``,
      `Клиент: ${payload.customerName}`,
      `Телефон: ${payload.customerPhone}`,
      `Email: ${payload.customerEmail}`,
      `Адрес: ${payload.shippingAddress}`,
      `Оплата: ${payload.paymentMethod}`,
      payload.notes ? `Комментарий: ${payload.notes}` : null,
      ``,
      `Состав заказа:`,
      itemsText,
      ``,
      `Итого: ${totalKzt} ₸`,
      ``,
      `Открыть в админке: ${payload.adminUrl}`,
    ]
      .filter((line) => line !== null)
      .join("\n");
  }
}
