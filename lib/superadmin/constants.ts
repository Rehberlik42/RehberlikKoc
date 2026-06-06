export const SUPERADMIN_SESSION_COOKIE = "mindora_superadmin_session";
export const SUPERADMIN_SESSION_VALUE = "authenticated";

export const SUPERADMIN_USERNAME = "seydisehir42";
export const SUPERADMIN_PASSWORD = "admin123";

export const SUBSCRIPTION_STATUSES = ["trial", "active", "expired"] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_LABELS: Record<SubscriptionStatus, string> = {
  trial: "Deneme Sürümü",
  active: "Satın Aldı",
  expired: "Süresi Biten",
};
