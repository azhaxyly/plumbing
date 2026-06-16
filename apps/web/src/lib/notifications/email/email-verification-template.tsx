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

interface EmailVerificationProps {
  verifyUrl: string;
}

export function EmailVerificationEmail({ verifyUrl }: EmailVerificationProps) {
  return (
    <Html lang="ru">
      <Head />
      <Preview>Подтвердите ваш email — одна кнопка</Preview>
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

          <Section style={{ padding: "40px 36px 32px" }}>
            <Heading
              style={{
                color: "#111",
                fontSize: "22px",
                fontWeight: "700",
                margin: "0 0 12px",
              }}
            >
              Подтвердите ваш email
            </Heading>

            <Text style={{ fontSize: "15px", color: "#555", lineHeight: "1.6", margin: "0 0 32px" }}>
              Вы создали аккаунт в Timsan. Нажмите кнопку ниже, чтобы подтвердить
              email и активировать аккаунт.
            </Text>

            <Section style={{ textAlign: "center" as const, margin: "0 0 32px" }}>
              <Button
                href={verifyUrl}
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
                Подтвердить email
              </Button>
            </Section>

            <Text style={{ fontSize: "13px", color: "#999", lineHeight: "1.5", margin: "0 0 16px" }}>
              Ссылка действует 24 часа. Если вы не регистрировались — просто
              проигнорируйте это письмо.
            </Text>

            <Text style={{ fontSize: "12px", color: "#bbb", lineHeight: "1.5", margin: 0, wordBreak: "break-all" as const }}>
              Если кнопка не работает, скопируйте ссылку в браузер: {verifyUrl}
            </Text>
          </Section>

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
