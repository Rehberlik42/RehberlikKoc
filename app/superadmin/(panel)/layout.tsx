import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SUPERADMIN_SESSION_COOKIE,
  SUPERADMIN_SESSION_VALUE,
} from "@/lib/superadmin/constants";
import SuperadminShell from "../_components/SuperadminShell";

export default async function SuperadminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get(SUPERADMIN_SESSION_COOKIE);
  const isAuthenticated = session?.value === SUPERADMIN_SESSION_VALUE;

  if (!isAuthenticated) {
    redirect("/superadmin/login");
  }

  return <SuperadminShell>{children}</SuperadminShell>;
}
