import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  Lightbulb,
  MessageSquare,
  RotateCcw,
  StickyNote,
  X,
} from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/get-current-user";

export const dynamic = "force-dynamic";

function causeLabel(
  causeType: string,
  causeReason: string | null
): string {
  if (causeReason?.trim()) return causeReason.trim();
  if (causeType === "bilgi_eksigi") return "Bilgi eksiği";
  if (causeType === "dikkatsizlik") return "Dikkatsizlik";
  return causeType;
}

function formatLongDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.abs(b - a) / (1000 * 60 * 60 * 24);
}

function resultLabel(result: string | null): {
  text: string;
  className: string;
  icon: "check" | "x" | "wait";
} {
  if (result === "dogru") {
    return {
      text: "Doğru",
      className: "text-emerald-300",
      icon: "check",
    };
  }
  if (result === "yanlis") {
    return {
      text: "Yanlış",
      className: "text-rose-300",
      icon: "x",
    };
  }
  return {
    text: "Bekliyor",
    className: "text-amber-200",
    icon: "wait",
  };
}

function oneName(
  raw: { name: string } | { name: string }[] | null | undefined
): string | null {
  if (!raw) return null;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v?.name ?? null;
}

export default async function MistakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const entryId = Number(idParam);
  if (!Number.isFinite(entryId)) notFound();

  const { user, supabase } = await getCurrentUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "student") redirect("/dashboard/teacher");

  const { data: entry } = await supabase
    .from("mistake_entries")
    .select(
      `id, student_id, subject_id, topic_id, resource_label, test_label,
       question_number, cause_type, cause_reason, reflection_note,
       student_note, coach_comment, status, stage, solved_date,
       next_review_date, created_at,
       subject:subjects(name), topic:topics(name),
       study_resource:study_resources(name)`
    )
    .eq("id", entryId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!entry) notFound();

  const { data: reviewsRaw } = await supabase
    .from("mistake_reviews")
    .select("id, review_stage, scheduled_date, result, reviewed_at, created_at")
    .eq("mistake_entry_id", entryId)
    .order("created_at", { ascending: true })
    .order("review_stage", { ascending: true });

  const reviews = reviewsRaw ?? [];

  const subjectName = oneName(
    entry.subject as { name: string } | { name: string }[] | null
  );
  const topicName = oneName(
    entry.topic as { name: string } | { name: string }[] | null
  );
  const resourceName =
    entry.resource_label?.trim() ||
    oneName(
      entry.study_resource as { name: string } | { name: string }[] | null
    ) ||
    null;

  const titleParts = [
    subjectName ?? "Ders",
    topicName,
    resourceName,
    entry.test_label,
    entry.question_number ? `Soru ${entry.question_number}` : null,
  ].filter(Boolean);

  const isBilgi = entry.cause_type === "bilgi_eksigi";
  const isDone = entry.status === "tamamlandi";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/student/mistakes"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)] transition-opacity hover:opacity-80"
      >
        <ArrowLeft className="h-4 w-4" />
        Hata Defteri
      </Link>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
              isBilgi
                ? "bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/40"
                : "bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isBilgi ? "bg-rose-400" : "bg-amber-400"
              }`}
            />
            {isBilgi ? "Bilgi eksiği" : "Dikkatsizlik"}
          </span>
          <span
            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
              isDone
                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                : "bg-[var(--surface-2)] text-[var(--text-secondary)] ring-1 ring-[var(--border)]"
            }`}
          >
            {isDone ? "Tamamlandı" : "Aktif"}
          </span>
        </div>
        <h1 className="text-xl font-black text-[var(--text-primary)] sm:text-2xl">
          {titleParts.join(" – ")}
        </h1>
      </div>

      <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <DetailRow
          icon={<CalendarDays className="h-4 w-4" />}
          label="İlk kayıt"
          value={formatLongDate(entry.solved_date as string)}
        />
        <DetailRow
          icon={<BookOpen className="h-4 w-4" />}
          label="Hata türü"
          value={causeLabel(
            entry.cause_type as string,
            (entry.cause_reason as string | null) ?? null
          )}
        />
        <DetailRow
          icon={<Lightbulb className="h-4 w-4" />}
          label="Öğrendiğim bilgi"
          value={(entry.reflection_note as string | null)?.trim() || "—"}
          multiline
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)]">
          Kontrol tarihçesi
        </h2>

        {reviews.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Henüz kontrol denemesi yok.
          </p>
        ) : (
          <ol className="space-y-0">
            {reviews.map((review, index) => {
              const prev = index > 0 ? reviews[index - 1] : null;
              const stageDown =
                prev != null &&
                Number(review.review_stage) < Number(prev.review_stage);
              const sameStageAgain =
                prev != null &&
                Number(review.review_stage) === Number(prev.review_stage);
              const bigGap =
                prev != null &&
                daysBetween(
                  prev.created_at as string,
                  review.created_at as string
                ) >= 14;
              const showRestart = stageDown || sameStageAgain || bigGap;

              const rl = resultLabel((review.result as string | null) ?? null);

              return (
                <li key={review.id as number}>
                  {showRestart && (
                    <div className="my-3 flex items-center gap-2">
                      <div className="h-px flex-1 bg-[var(--border)]" />
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        <RotateCcw className="h-3 w-3" />
                        yeniden başladı
                      </span>
                      <div className="h-px flex-1 bg-[var(--border)]" />
                    </div>
                  )}
                  <div className="flex items-start gap-3 rounded-xl px-1 py-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-xs font-black text-[var(--text-secondary)]">
                      {review.review_stage as number}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {review.review_stage as number}. kontrol:{" "}
                        {formatLongDate(review.scheduled_date as string)}
                        {" – "}
                        <span className={rl.className}>{rl.text}</span>
                      </p>
                      {review.reviewed_at && (
                        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                          Cevaplandı:{" "}
                          {new Date(
                            review.reviewed_at as string
                          ).toLocaleString("tr-TR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                    {rl.icon === "check" && (
                      <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />
                    )}
                    {rl.icon === "x" && (
                      <X className="mt-1 h-4 w-4 shrink-0 text-rose-400" />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <DetailRow
          icon={<StickyNote className="h-4 w-4" />}
          label="Öğrenci notu"
          value={(entry.student_note as string | null)?.trim() || "—"}
          multiline
        />
        <DetailRow
          icon={<MessageSquare className="h-4 w-4" />}
          label="Koç yorumu"
          value={(entry.coach_comment as string | null)?.trim() || "—"}
          multiline
        />
      </section>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  multiline,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-[var(--accent)]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </p>
        <p
          className={`mt-0.5 text-sm text-[var(--text-primary)] ${
            multiline ? "whitespace-pre-wrap" : ""
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
