"use client";

import { Button } from "@whitehouse/ui";
import { X, Cookie } from "lucide-react";
import { useState, useEffect } from "react";

interface CookieConsent {
  essential: true;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_NAME = "cookie_consent";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days in seconds

function readConsentCookie(): CookieConsent | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  try {
    const value = decodeURIComponent(match.split("=")[1] ?? "");
    return JSON.parse(value) as CookieConsent;
  } catch {
    return null;
  }
}

function writeConsentCookie(consent: CookieConsent): void {
  const value = encodeURIComponent(JSON.stringify(consent));
  document.cookie = `${COOKIE_NAME}=${value}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
}

export function CookiesBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsentCookie();
    if (!existing) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function acceptAll() {
    const consent: CookieConsent = {
      essential: true,
      analytics: true,
      marketing: true,
    };
    writeConsentCookie(consent);
    setVisible(false);
  }

  function saveCustom() {
    const consent: CookieConsent = {
      essential: true,
      analytics,
      marketing,
    };
    writeConsentCookie(consent);
    setVisible(false);
  }

  function dismiss() {
    // Save minimal consent (essential only) and hide
    const consent: CookieConsent = {
      essential: true,
      analytics: false,
      marketing: false,
    };
    writeConsentCookie(consent);
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Настройки файлов cookie"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-2xl md:bottom-4 md:left-4 md:right-auto md:max-w-md md:rounded-xl md:border"
    >
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Cookie className="h-5 w-5 shrink-0 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-900">
              Файлы cookie
            </h2>
          </div>
          <button
            onClick={dismiss}
            aria-label="Закрыть"
            className="rounded-sm text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Description */}
        <p className="mt-2 text-xs text-gray-500 leading-relaxed">
          Мы используем файлы cookie для улучшения работы сайта. Обязательные
          cookie необходимы для работы сайта и не могут быть отключены.
        </p>

        {/* Detailed settings */}
        {showDetails && (
          <div className="mt-4 space-y-3 rounded-lg border bg-gray-50 p-3">
            {/* Essential — always on */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-gray-800">
                  Обязательные
                </p>
                <p className="text-xs text-gray-500">
                  Необходимы для работы сайта (сессия, корзина)
                </p>
              </div>
              <div className="flex h-5 w-9 shrink-0 items-center justify-end rounded-full bg-green-500 px-0.5">
                <div className="h-4 w-4 rounded-full bg-white shadow" />
              </div>
            </div>

            {/* Analytics */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-gray-800">
                  Аналитические
                </p>
                <p className="text-xs text-gray-500">
                  Помогают понять, как посетители используют сайт
                </p>
              </div>
              <button
                role="switch"
                aria-checked={analytics}
                aria-label="Аналитические cookie"
                onClick={() => setAnalytics((v) => !v)}
                className={`flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full px-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                  analytics
                    ? "justify-end bg-blue-500 focus:ring-blue-400"
                    : "justify-start bg-gray-300 focus:ring-gray-400"
                }`}
              >
                <div className="h-4 w-4 rounded-full bg-white shadow" />
              </button>
            </div>

            {/* Marketing */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-gray-800">
                  Маркетинговые
                </p>
                <p className="text-xs text-gray-500">
                  Используются для показа релевантной рекламы
                </p>
              </div>
              <button
                role="switch"
                aria-checked={marketing}
                aria-label="Маркетинговые cookie"
                onClick={() => setMarketing((v) => !v)}
                className={`flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full px-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                  marketing
                    ? "justify-end bg-blue-500 focus:ring-blue-400"
                    : "justify-start bg-gray-300 focus:ring-gray-400"
                }`}
              >
                <div className="h-4 w-4 rounded-full bg-white shadow" />
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={acceptAll}
            className="flex-1 min-w-[120px]"
          >
            Принять все
          </Button>

          {showDetails ? (
            <Button
              size="sm"
              variant="outline"
              onClick={saveCustom}
              className="flex-1 min-w-[120px]"
            >
              Сохранить настройки
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDetails(true)}
              className="flex-1 min-w-[120px]"
            >
              Настроить
            </Button>
          )}
        </div>

        {/* Privacy policy link */}
        <p className="mt-3 text-center text-xs text-gray-400">
          Подробнее в{" "}
          <a
            href="/privacy-policy"
            className="underline hover:text-gray-600 transition-colors"
          >
            политике конфиденциальности
          </a>
        </p>
      </div>
    </div>
  );
}
