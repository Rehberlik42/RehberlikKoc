import type { SubscriptionStatus } from "./constants";

export interface SaasClient {
  id: string;
  company_name: string;
  contact_name: string;
  max_students: number;
  subscription_status: SubscriptionStatus;
  expires_at: string | null;
  created_at?: string;
}

export interface ClientFormData {
  company_name: string;
  contact_name: string;
  max_students: number;
  subscription_status: SubscriptionStatus;
  expires_at: string | null;
}
