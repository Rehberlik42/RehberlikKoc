/**
 * Geçersiz / süresi dolmuş refresh token ve oturum hatalarını
 * zarifçe ele almak için ortak yardımcılar.
 */

export const SESSION_EXPIRED_PARAM = "session";
export const SESSION_EXPIRED_VALUE = "expired";
export const SESSION_EXPIRED_HREF = `/?${SESSION_EXPIRED_PARAM}=${SESSION_EXPIRED_VALUE}`;
export const SESSION_EXPIRED_MESSAGE =
  "Oturumun süresi doldu, tekrar giriş yap.";

/** Intentional logout sırasında AuthSessionGuard'ın mesaj göstermemesi için */
export const INTENTIONAL_SIGNOUT_KEY = "mindora:intentional-signout";

const REFRESH_ERROR_CODES = new Set([
  "refresh_token_not_found",
  "refresh_token_already_used",
  "session_expired",
  "session_not_found",
  "bad_jwt",
]);

function readErrorField(error: unknown, field: "code" | "message" | "status" | "name") {
  if (!error || typeof error !== "object") return undefined;
  const value = (error as Record<string, unknown>)[field];
  return value;
}

/** Refresh / oturum bozulması (400/401 AuthApiError veya JWT expired throw). */
export function isInvalidSessionError(error: unknown): boolean {
  if (!error) return false;

  const code = readErrorField(error, "code");
  if (typeof code === "string" && REFRESH_ERROR_CODES.has(code)) {
    return true;
  }

  const status = readErrorField(error, "status");
  const message = String(readErrorField(error, "message") ?? "");
  const lower = message.toLowerCase();

  if (
    lower.includes("invalid refresh token") ||
    lower.includes("refresh token not found") ||
    lower.includes("refresh token already used") ||
    lower.includes("jwt has expired") ||
    lower.includes("session missing") ||
    lower.includes("auth session missing")
  ) {
    return true;
  }

  // Auth API 400/401 + refresh/jwt kelimesi
  if (
    (status === 400 || status === 401) &&
    (lower.includes("refresh") || lower.includes("jwt") || lower.includes("session"))
  ) {
    return true;
  }

  return false;
}

export function markIntentionalSignOut() {
  try {
    sessionStorage.setItem(INTENTIONAL_SIGNOUT_KEY, "1");
  } catch {
    // private mode / SSR
  }
}

export function consumeIntentionalSignOut(): boolean {
  try {
    const flagged = sessionStorage.getItem(INTENTIONAL_SIGNOUT_KEY) === "1";
    if (flagged) sessionStorage.removeItem(INTENTIONAL_SIGNOUT_KEY);
    return flagged;
  } catch {
    return false;
  }
}
