import { cookies } from "next/headers";
import {
  SUPERADMIN_SESSION_COOKIE,
  SUPERADMIN_SESSION_VALUE,
} from "./constants";

export async function getSuperadminSession() {
  const cookieStore = await cookies();
  return cookieStore.get(SUPERADMIN_SESSION_COOKIE);
}

export async function isSuperadminAuthenticated() {
  const session = await getSuperadminSession();
  return session?.value === SUPERADMIN_SESSION_VALUE;
}

export async function requireSuperadminSession() {
  const authenticated = await isSuperadminAuthenticated();
  if (!authenticated) {
    throw new Error("Yetkisiz erisim.");
  }
}
