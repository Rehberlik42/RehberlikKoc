"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  X,
  Search,
  Users,
  ChevronRight,
  User,
  Mail,
  Lock,
  Phone,
  Loader2,
} from "lucide-react";
import { addStudent } from "@/app/dashboard/teacher/actions";
import { initialsFromName } from "@/lib/student-helpers";

export interface TeacherStudentRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string | null;
}

interface StudentsPanelProps {
  students: TeacherStudentRow[];
  currentCount: number;
  maxStudents: number;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffSec = Math.round((date.getTime() - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat("tr", { numeric: "auto" });

  const absSec = Math.abs(diffSec);
  if (absSec < 60) return rtf.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffSec / 3600);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffSec / 86400);
  if (Math.abs(diffDay) < 7) return rtf.format(diffDay, "day");
  const diffWeek = Math.round(diffSec / (86400 * 7));
  if (Math.abs(diffWeek) < 5) return rtf.format(diffWeek, "week");
  const diffMonth = Math.round(diffSec / (86400 * 30));
  if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, "month");
  const diffYear = Math.round(diffSec / (86400 * 365));
  return rtf.format(diffYear, "year");
}

function isNewStudent(createdAt: string | null): boolean {
  if (!createdAt) return false;
  const days =
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 7;
}

function StudentAvatar({ name }: { name: string | null }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] text-[11px] font-black text-[var(--text-primary)] shadow-sm shadow-[var(--primary)]/20">
      {initialsFromName(name)}
    </div>
  );
}

function DateCell({ createdAt }: { createdAt: string | null }) {
  if (!createdAt) {
    return <span className="text-[var(--text-secondary)]">—</span>;
  }

  const full = new Date(createdAt).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <span className="inline-flex items-center gap-2" title={full}>
      <span className="text-[var(--text-secondary)]">{formatRelativeTime(createdAt)}</span>
      {isNewStudent(createdAt) ? (
        <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
          Yeni
        </span>
      ) : null}
    </span>
  );
}

export default function StudentsPanel({
  students,
  currentCount,
  maxStudents,
}: StudentsPanelProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [barMounted, setBarMounted] = useState(false);

  const quotaPercent =
    maxStudents > 0 ? Math.min(100, (currentCount / maxStudents) * 100) : 100;
  const quotaFull = maxStudents > 0 && currentCount >= maxStudents;
  const remainingSlots = Math.max(0, maxStudents - currentCount);

  const quotaBarClass =
    quotaFull || quotaPercent >= 100
      ? "bg-red-500"
      : quotaPercent >= 70
        ? "bg-gradient-to-r from-amber-500 to-amber-400"
        : "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)]";

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = (s.full_name ?? "").toLowerCase();
      const phone = (s.phone ?? "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [students, query]);

  useEffect(() => {
    if (!isModalOpen) {
      setError(null);
    }
  }, [isModalOpen]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setBarMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [isModalOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await addStudent(formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setIsModalOpen(false);
      router.refresh();
    });
  };

  const openModal = () => setIsModalOpen(true);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            Öğrenci Yönetimi
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Kendi öğrencilerinizi ekleyin ve yönetin.
          </p>
        </div>

        <button
          type="button"
          onClick={openModal}
          disabled={quotaFull}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] shadow-lg shadow-[var(--primary)]/20 transition-all hover:shadow-[var(--primary)]/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          Yeni Öğrenci Ekle
        </button>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
        <div className="mb-3 flex items-center justify-between gap-4 text-sm">
          <span className="font-medium text-[var(--text-secondary)]">Kota Durumu</span>
          <span className="tabular-nums text-[var(--text-primary)]">
            {currentCount} / {maxStudents} Öğrenci
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${quotaBarClass}`}
            style={{ width: barMounted ? `${quotaPercent}%` : "0%" }}
          />
        </div>
        {quotaFull ? (
          <p className="mt-2 text-xs text-red-400">
            Öğrenci kotanız dolmuştur. Lütfen paketinizi yükseltin.
          </p>
        ) : (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {remainingSlots} kontenjan kaldı
          </p>
        )}
      </div>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--primary)]/25 bg-gradient-to-br from-white/[0.03] to-[var(--surface)]/40 px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--primary)]/25 bg-[var(--primary)]/10">
            <Users className="h-7 w-7 text-[var(--accent)]" />
          </div>
          <p className="text-lg font-semibold text-[var(--text-secondary)]">
            Henüz öğrenciniz yok
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-muted)]">
            İlk öğrencinizi ekleyerek çalışma takibi, deneme sonuçları ve
            rehberlik sürecini başlatın.
          </p>
          <button
            type="button"
            onClick={openModal}
            disabled={quotaFull}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] shadow-lg shadow-[var(--primary)]/20 transition-all hover:shadow-[var(--primary)]/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            İlk Öğrenciyi Ekle
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="İsim veya telefon ara..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-all focus:border-[var(--primary)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/25"
            />
          </div>

          {filteredStudents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-white/[0.02] px-6 py-10 text-center">
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                Aramayla eşleşen öğrenci yok
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Farklı bir arama deneyin veya aramayı temizleyin.
              </p>
            </div>
          ) : (
            <>
              {/* Masaüstü tablo */}
              <div className="hidden overflow-x-auto rounded-xl border border-[var(--border)] md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        Öğrenci
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        Telefon
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                        Eklenme Tarihi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.id}
                        onClick={() =>
                          router.push(
                            `/dashboard/teacher/students/${student.id}`
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(
                              `/dashboard/teacher/students/${student.id}`
                            );
                          }
                        }}
                        tabIndex={0}
                        role="link"
                        className="cursor-pointer transition-colors hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)] focus:outline-none"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <StudentAvatar name={student.full_name} />
                            <span className="font-medium text-[var(--text-primary)]">
                              {student.full_name ?? "İsimsiz Öğrenci"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[var(--text-secondary)]">
                          {student.phone ?? "—"}
                        </td>
                        <td className="px-6 py-4">
                          <DateCell createdAt={student.created_at} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobil kartlar */}
              <div className="space-y-3 md:hidden">
                {filteredStudents.map((student) => (
                  <Link
                    key={student.id}
                    href={`/dashboard/teacher/students/${student.id}`}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 transition-colors hover:border-[var(--primary)]/25 hover:bg-white/[0.05]"
                  >
                    <StudentAvatar name={student.full_name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-[var(--text-primary)]">
                          {student.full_name ?? "İsimsiz Öğrenci"}
                        </p>
                        {isNewStudent(student.created_at) ? (
                          <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                            Yeni
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                        {student.phone ?? "Telefon yok"}
                      </p>
                      {student.created_at ? (
                        <p
                          className="mt-1 text-[11px] text-[var(--text-muted)]"
                          title={new Date(student.created_at).toLocaleDateString(
                            "tr-TR"
                          )}
                        >
                          {formatRelativeTime(student.created_at)}
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {isModalOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 animate-in fade-in bg-black/60 backdrop-blur-sm duration-200"
            onClick={() => !isPending && setIsModalOpen(false)}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="w-full max-w-md animate-in fade-in zoom-in-95 fill-mode-both rounded-xl border border-[var(--border)] bg-[#0f0f23] shadow-2xl duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Yeni Öğrenci Ekle
                </h2>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPending}
                  className="rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)] disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                    <User className="h-3.5 w-3.5 text-[var(--accent)]" />
                    Ad Soyad *
                  </label>
                  <input
                    name="full_name"
                    required
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[var(--text-primary)] transition-all focus:border-[var(--primary)]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/25"
                    placeholder="Öğrenci adı"
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                    <Mail className="h-3.5 w-3.5 text-[var(--accent)]" />
                    E-posta *
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[var(--text-primary)] transition-all focus:border-[var(--primary)]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/25"
                    placeholder="ogrenci@ornek.com"
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                    <Lock className="h-3.5 w-3.5 text-[var(--accent)]" />
                    Şifre *
                  </label>
                  <input
                    name="password"
                    type="password"
                    minLength={6}
                    required
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[var(--text-primary)] transition-all focus:border-[var(--primary)]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/25"
                    placeholder="En az 6 karakter"
                  />
                </div>

                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                    <Phone className="h-3.5 w-3.5 text-[var(--accent)]" />
                    Telefon
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[var(--text-primary)] transition-all focus:border-[var(--primary)]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/25"
                    placeholder="05XX XXX XX XX"
                  />
                </div>

                {error ? (
                  <div className="animate-in fade-in duration-200 rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs text-red-400">
                    {error}
                  </div>
                ) : null}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isPending}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-[var(--text-secondary)] transition-colors hover:bg-white/10 disabled:opacity-50"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] px-4 py-2 font-medium text-[var(--text-primary)] transition-all disabled:opacity-50"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Ekleniyor...
                      </>
                    ) : (
                      "Öğrenci Ekle"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
