import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Column,
  Section,
  Text,
  Img,
} from "@react-email/components";
import type { OrderNotificationPayload } from "@timsan/domain";

interface OrderNotificationEmailProps {
  payload: OrderNotificationPayload;
}

export function OrderNotificationEmail({ payload }: OrderNotificationEmailProps) {
  const totalKzt = (payload.totalCents / 100).toLocaleString("ru-KZ");

  return (
    <Html lang="ru">
      <Head />
      <Preview>
        Новый заказ №{payload.orderNumber} на {totalKzt} ₸
      </Preview>
      <Body
        style={{
          fontFamily: "Arial, sans-serif",
          backgroundColor: "#f4f4f4",
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            padding: "20px",
          }}
        >
          <Heading style={{ color: "#333", fontSize: "24px", marginBottom: "20px" }}>
            🛒 Новый заказ №{payload.orderNumber}
          </Heading>

          <Section>
            <Text style={{ fontSize: "16px", color: "#555" }}>
              <strong>Клиент:</strong> {payload.customerName}
            </Text>
            <Text style={{ fontSize: "16px", color: "#555" }}>
              <strong>Телефон:</strong> {payload.customerPhone}
            </Text>
            <Text style={{ fontSize: "16px", color: "#555" }}>
              <strong>Email:</strong> {payload.customerEmail}
            </Text>
            <Text style={{ fontSize: "16px", color: "#555" }}>
              <strong>Адрес доставки:</strong> {payload.shippingAddress}
            </Text>
            <Text style={{ fontSize: "16px", color: "#555" }}>
              <strong>Способ оплаты:</strong> {payload.paymentMethod}
            </Text>
            {payload.notes && (
              <Text style={{ fontSize: "16px", color: "#555" }}>
                <strong>Комментарий:</strong> {payload.notes}
              </Text>
            )}
          </Section>

          <Hr style={{ borderColor: "#e0e0e0", margin: "20px 0" }} />

          <Heading as="h2" style={{ fontSize: "18px", color: "#333" }}>
            Состав заказа
          </Heading>

          {payload.items.map((item, i) => (
            <Row
              key={i}
              style={{
                marginBottom: "12px",
                borderBottom: "1px solid #f0f0f0",
                paddingBottom: "12px",
              }}
            >
              <Column style={{ width: "60px" }}>
                {item.imageUrl && (
                  <Img
                    src={item.imageUrl}
                    width="50"
                    height="50"
                    alt={item.name}
                    style={{ objectFit: "cover", borderRadius: "4px" }}
                  />
                )}
              </Column>
              <Column>
                <Text
                  style={{ margin: 0, fontSize: "14px", fontWeight: "bold", color: "#333" }}
                >
                  {item.name}
                </Text>
                <Text style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                  Арт: {item.sku}
                </Text>
                <Text style={{ margin: 0, fontSize: "14px", color: "#555" }}>
                  {item.quantity} × {(item.unitPriceCents / 100).toLocaleString("ru-KZ")} ₸
                </Text>
              </Column>
            </Row>
          ))}

          <Hr style={{ borderColor: "#e0e0e0", margin: "20px 0" }} />

          <Text
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              color: "#333",
              textAlign: "right" as const,
            }}
          >
            Итого: {totalKzt} ₸
          </Text>

          <Section style={{ textAlign: "center" as const, marginTop: "30px" }}>
            <Link
              href={payload.adminUrl}
              style={{
                backgroundColor: "#0070f3",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              Открыть заказ в админке →
            </Link>
          </Section>

          <Hr style={{ borderColor: "#e0e0e0", margin: "20px 0" }} />
          <Text
            style={{ fontSize: "12px", color: "#aaa", textAlign: "center" as const }}
          >
            Заказ создан: {payload.createdAt.toLocaleString("ru-KZ")}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
