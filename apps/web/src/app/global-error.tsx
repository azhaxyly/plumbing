"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ru">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            padding: "1rem",
          }}
        >
          <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>
            Критическая ошибка
          </h1>
          <p style={{ color: "#6b7280" }}>
            Произошла критическая ошибка приложения. Попробуйте обновить
            страницу.
          </p>
          {error.digest != null && (
            <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
              Код ошибки: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "1rem",
              borderRadius: "0.375rem",
              backgroundColor: "#1a1a1a",
              padding: "0.5rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#ffffff",
              cursor: "pointer",
              border: "none",
            }}
          >
            Попробовать снова
          </button>
        </div>
      </body>
    </html>
  );
}
