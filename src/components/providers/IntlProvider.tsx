"use client";

import { NextIntlClientProvider } from "next-intl";
import { ReactNode } from "react";
// import { useSyncExternalStore } from "react"; // Commented out for MVP

// Default messages for English - loaded statically to avoid async in client
import enMessages from "../../../messages/en.json";
import esMessages from "../../../messages/es.json";

const messages: Record<string, typeof enMessages> = {
  en: enMessages,
  es: esMessages,
};

/*
// Commented out for MVP - force English only
function getLocaleFromCookie(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
  return match ? match[1] : "en";
}

// Use useSyncExternalStore for reading cookie without hydration issues
function subscribeToLocale(callback: () => void) {
  // Re-check on storage events (cross-tab) or manual refresh
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getServerSnapshot(): string {
  return "en";
}
*/

interface IntlProviderProps {
  children: ReactNode;
}

export function IntlProvider({ children }: IntlProviderProps) {
  // Forced to 'en' for MVP until translations are complete
  const locale = "en";
  /*
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getLocaleFromCookie,
    getServerSnapshot
  );
  */

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages[locale] || messages.en}
      timeZone="UTC"
    >
      {children}
    </NextIntlClientProvider>
  );
}
