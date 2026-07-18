import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type {
  AvailabilityRule,
  AvailabilityException,
  AppointmentSettings,
} from "@/lib/appointments";
import { DEFAULT_SETTINGS } from "@/lib/appointments";
import AvailabilityClient from "./_components/AvailabilityClient";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role === "student") redirect("/dashboard/student");

  const [settingsRes, rulesRes, exceptionsRes] = await Promise.all([
    supabase
      .from("teacher_appointment_settings")
      .select("slot_minutes, buffer_minutes, max_daily")
      .eq("teacher_id", user.id)
      .maybeSingle(),
    supabase
      .from("teacher_availability_rules")
      .select("id, day_of_week, start_time, end_time")
      .eq("teacher_id", user.id)
      .order("day_of_week")
      .order("start_time"),
    supabase
      .from("teacher_availability_exceptions")
      .select("id, date, start_time, end_time, reason")
      .eq("teacher_id", user.id)
      .gte("date", new Date().toISOString().slice(0, 10))
      .order("date"),
  ]);

  const settings: AppointmentSettings = settingsRes.data ?? DEFAULT_SETTINGS;
  const rules = (rulesRes.data ?? []) as AvailabilityRule[];
  const exceptions = (exceptionsRes.data ?? []) as AvailabilityException[];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1.5">
        <Link
          href="/dashboard/teacher/appointments"
          className="inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Randevulara Dön
        </Link>
        <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] flex items-center gap-2">
          <CalendarClock className="w-7 h-7 text-[var(--accent)]" />
          Müsaitlik Ayarları
        </h2>
        <p className="text-[var(--text-muted)] text-sm">
          Öğrencilerin yalnızca burada tanımladığın saatlerde randevu talebi
          oluşturabilir.
        </p>
      </div>

      <AvailabilityClient
        teacherId={user.id}
        initialSettings={settings}
        initialRules={rules}
        initialExceptions={exceptions}
      />
    </div>
  );
}
