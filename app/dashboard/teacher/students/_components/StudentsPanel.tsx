"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import { addStudent } from "@/app/dashboard/teacher/actions";

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

export default function StudentsPanel({
  students,
  currentCount,
  maxStudents,
}: StudentsPanelProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const quotaPercent =
    maxStudents > 0 ? Math.min(100, (currentCount / maxStudents) * 100) : 100;
  const quotaFull = maxStudents > 0 && currentCount >= maxStudents;

  useEffect(() => {
    if (!isModalOpen) {
      setError(null);
    }
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Öğrenci Yönetimi
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Kendi öğrencilerinizi ekleyin ve yönetin.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={quotaFull}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#7B2FFF]/20 transition-all hover:shadow-[#7B2FFF]/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          Yeni Öğrenci Ekle
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 flex items-center justify-between gap-4 text-sm">
          <span className="font-medium text-white/80">Kota Durumu</span>
          <span className="tabular-nums text-white">
            {currentCount} / {maxStudents} Öğrenci
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all ${
              quotaFull
                ? "bg-red-500"
                : "bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF]"
            }`}
            style={{ width: `${quotaPercent}%` }}
          />
        </div>
        {quotaFull ? (
          <p className="mt-2 text-xs text-red-400">
            Öğrenci kotanız dolmuştur. Lütfen paketinizi yükseltin.
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                Ad Soyad
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                Telefon
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                Eklenme Tarihi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {students.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-white/40">
                  Henüz öğrenci eklenmemiş. &quot;Yeni Öğrenci Ekle&quot; ile
                  başlayın.
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr
                  key={student.id}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-4 font-medium text-white">
                    {student.full_name ?? "İsimsiz Öğrenci"}
                  </td>
                  <td className="px-6 py-4 text-white/70">
                    {student.phone ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-white/50">
                    {student.created_at
                      ? new Date(student.created_at).toLocaleDateString("tr-TR")
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => !isPending && setIsModalOpen(false)}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-xl border border-white/10 bg-[#0f0f23] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <h2 className="text-lg font-bold text-white">
                  Yeni Öğrenci Ekle
                </h2>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPending}
                  className="text-white/40 transition-colors hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div>
                  <label className="mb-2 block text-sm text-white/80">
                    Ad Soyad *
                  </label>
                  <input
                    name="full_name"
                    required
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white focus:border-[#7B2FFF]/50 focus:outline-none"
                    placeholder="Öğrenci adı"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/80">
                    E-posta *
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white focus:border-[#7B2FFF]/50 focus:outline-none"
                    placeholder="ogrenci@ornek.com"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/80">
                    Şifre *
                  </label>
                  <input
                    name="password"
                    type="password"
                    minLength={6}
                    required
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white focus:border-[#7B2FFF]/50 focus:outline-none"
                    placeholder="En az 6 karakter"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/80">
                    Telefon
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-white focus:border-[#7B2FFF]/50 focus:outline-none"
                    placeholder="05XX XXX XX XX"
                  />
                </div>

                {error ? (
                  <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs text-red-400">
                    {error}
                  </div>
                ) : null}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isPending}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white/80 disabled:opacity-50"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] px-4 py-2 font-medium text-white disabled:opacity-50"
                  >
                    {isPending ? "Ekleniyor..." : "Öğrenci Ekle"}
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
