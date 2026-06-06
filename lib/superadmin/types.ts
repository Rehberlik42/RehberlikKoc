import type { SubscriptionStatus } from "./constants";

export interface SaasClient {
  id: string;
  company_name: string;
  contact_name: string;
  max_students: number;
  subscription_status: SubscriptionStatus;
  expires_at: string | null;
  email?: string | null;
  phone?: string | null;
  auth_user_id?: string | null;
  created_at?: string;
}

export interface ClientFormData {
  company_name: string;
  contact_name: string;
  max_students: number;
  subscription_status: SubscriptionStatus;
  expires_at: string | null;
  email?: string;
  phone?: string | null;
}

export interface OnboardingFormData extends ClientFormData {
  email: string;
  phone: string | null;
  password: string;
}

export type ActionResult =
  | { success: true; message?: string }
  | { error: string };
