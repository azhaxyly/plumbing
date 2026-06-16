import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface PasswordResetEmailProps {
  resetUrl: string;
  expiresInMinutes?: number;
}

export function PasswordResetEmail({
  resetUrl,
  expiresInMinutes = 60,
}: PasswordResetEmailProps) {
  return (
    <Html lang="ru">
      <Head />
      <Preview>Сброс пароля — ссылка действует {String(expiresInMinutes)} минут</Preview>
      <Body
        style={{
          fontFamily: "Arial, sans-serif",
          backgroundColor: "#f0f2f5",
          margin: 0,
          padding: "40px 0",
        }}
      >
        <Container
          style={{
            maxWidth: "520px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {/* Header strip with text logo */}
          <Section
            style={{
              backgroundColor: "#1a1a2e",
              padding: "28px 32px",
              textAlign: "center" as const,
            }}
          >
            <Text
              style={{
                color: "#ffffff",
                fontSize: "26px",
                fontWeight: "bold",
                margin: 0,
                letterSpacing: "3px",
              }}
            >
              TIMSAN
            </Text>
            <Text
              style={{
                color: "#8899aa",
                fontSize: "11px",
                margin: "4px 0 0",
                letterSpacing: "1px",
              }}
            >
              интернет-магазин сантехники
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: "40px 36px 32px" }}>
            <Heading
              style={{
                color: "#111",
                fontSize: "24px",
                fontWeight: "700",
                margin: "0 0 12px",
              }}
            >
              Сброс пароля
            </Heading>

            <Text style={{ fontSize: "15px", color: "#555", lineHeight: "1.6", margin: "0 0 32px" }}>
              Мы получили запрос на смену пароля для вашего аккаунта. Нажмите кнопку
              ниже, чтобы задать новый пароль.
            </Text>

            <Section style={{ textAlign: "center" as const, margin: "0 0 32px" }}>
              <Button
                href={resetUrl}
                style={{
                  backgroundColor: "#0070f3",
                  color: "#ffffff",
                  padding: "15px 36px",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  textDecoration: "none",
                  display: "inline-block",
                  letterSpacing: "0.3px",
                }}
              >
                Сбросить пароль
              </Button>
            </Section>

            <Text style={{ fontSize: "13px", color: "#999", lineHeight: "1.5", margin: "0 0 20px" }}>
              Ссылка действует {String(expiresInMinutes)} минут. Если вы не запрашивали
              смену пароля — просто проигнорируйте это письмо, ваш пароль останется прежним.
            </Text>

            <Text style={{ fontSize: "12px", color: "#bbb", lineHeight: "1.5", margin: 0, wordBreak: "break-all" as const }}>
              Если кнопка не работает, скопируйте ссылку в браузер: {resetUrl}
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: "#eee", margin: 0 }} />
          <Section style={{ padding: "20px 36px", backgroundColor: "#fafafa" }}>
            <Text
              style={{
                fontSize: "12px",
                color: "#bbb",
                textAlign: "center" as const,
                margin: 0,
              }}
            >
              © {new Date().getFullYear()} Timsan — интернет-магазин сантехники
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
