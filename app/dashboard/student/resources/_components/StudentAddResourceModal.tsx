"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  X,
  Library,
  BookOpen,
  GraduationCap,
  Loader2,
  Save,
  Type,
  Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/app/dashboard/teacher/students/[id]/_components/SearchableSelect";
import TopicEditor from "@/app/dashboard/teacher/resources/_components/TopicEditor";
import {
  COVER_COLOR_PALETTE,
  examGroupFromName,
  type ExamOption,
  type SubjectOption,
  type TopicDraft,
} from "@/app/dashboard/teacher/resources/_components/resource-types";

interface Props {
  open: boolean;
  onClose: () => void;
  studentId: string;
  teacherId: string;
  examOptions: ExamOption[];
  subjectOptions: SubjectOption[];
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

function ResourcePreviewCard({
  name,
  publisher,
  coverColor,
  examName,
  subjectName,
}: {
  name: string;
  publisher: string;
  coverColor: string;
  examName: string | null;
  subjectName: string | null;
}) {
  const badge =
    examName && subjectName
      ? `${examName} · ${subjectName}`
      : examName ?? subjectName ?? null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] shadow-xl">
      <div className="relative min-h-[7rem] p-5" style={{ backgroundColor: coverColor }}>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <div className="relative">
          <h4 className="text-lg font-bold leading-snug text-[var(--text-primary)]">
            {name || "Kaynak Adı"}
          </h4>
          {publisher && <p className="mt-1 text-sm text-[var(--text-secondary)]">{publisher}</p>}
        </div>
      </div>
      <div className="bg-[var(--surface)] px-5 py-4">
        {badge ? (
          <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
            {badge}
          </span>
        ) : (
          <span className="text-[11px] text-[var(--text-muted)]">Önizleme</span>
        )}
      </div>
    </div>
  );
}

export default function StudentAddResourceModal({
  open,
  onClose,
  studentId,
  teacherId,
  examOptions,
  subjectOptions,
  onSuccess,
  onError,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [publisher, setPublisher] = useState("");
  const [examId, setExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [coverColor, setCoverColor] = useState<string>(COVER_COLOR_PALETTE[0].value);
  const [topics, setTopics] = useState<TopicDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setName("");
    setPublisher("");
    setExamId("");
    setSubjectId("");
    setCoverColor(COVER_COLOR_PALETTE[0].value);
    setTopics([]);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [open]);

  const filteredSubjects = useMemo(() => {
    if (!examId) return [];
    return subjectOptions.filter((s) => String(s.exam_id) === examId);
  }, [examId, subjectOptions]);

  const handleExamChange = useCallback((id: string) => {
    setExamId(id);
    setSubjectId("");
  }, []);

  const selectedExam = examOptions.find((e) => String(e.id) === examId);
  const selectedSubject = subjectOptions.find((s) => String(s.id) === subjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !examId || !subjectId) return;

    const validTopics = topics
      .filter((t) => t.name.trim())
      .map((t) => ({
        name: t.name.trim(),
        target_count: t.target_count || 0,
      }));

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      onError("Oturum bulunamadı.");
      return;
    }

    const { data: resource, error: resourceError } = await supabase
      .from("study_resources")
      .insert({
        teacher_id: teacherId,
        created_by: user.id,
        name: name.trim(),
        publisher: publisher.trim() || null,
        exam_id: parseInt(examId, 10),
        subject_id: parseInt(subjectId, 10),
        cover_color: coverColor,
        order_index: 0,
      })
      .select("id")
      .single();

    if (resourceError || !resource) {
      setLoading(false);
      onError("Kaynak eklenemedi: " + (resourceError?.message ?? "bilinmeyen hata"));
      return;
    }

    const resourceId = String(resource.id);

    if (validTopics.length > 0) {
      const { error: topicsError } = await supabase.from("study_resource_topics").insert(
        validTopics.map((t, i) => ({
          resource_id: resourceId,
          name: t.name,
          target_count: t.target_count,
          order_index: i,
        }))
      );

      if (topicsError) {
        await supabase.from("study_resources").delete().eq("id", resourceId);
        setLoading(false);
        onError("Kaynak oluşturuldu ancak konular eklenemedi: " + topicsError.message);
        return;
      }
    }

    const { error: assignError } = await supabase.from("resource_assignments").insert({
      study_resource_id: resourceId,
      student_id: studentId,
      assigned_by: user.id,
    });

    if (assignError) {
      await supabase.from("study_resource_topics").delete().eq("resource_id", resourceId);
      await supabase.from("study_resources").delete().eq("id", resourceId);
      setLoading(false);
      onError("Kaynak oluşturuldu ancak atama yapılamadı: " + assignError.message);
      return;
    }

    setLoading(false);
    onSuccess("Kaynağın eklendi ve listene atandı!");
    onClose();
    router.refresh();
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <button
        type="button"
        aria-label="Modalı kapat"
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-add-resource-title"
          className="relative flex max-h-[90vh] w-full max-w-4xl flex-col animate-in fade-in zoom-in-95 fill-mode-both rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] shadow-2xl shadow-[var(--primary)]/20 duration-200"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/15 text-[var(--accent)]">
                <Library className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 id="student-add-resource-title" className="text-base font-bold text-[var(--text-primary)]">
                  Kaynak Ekle
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Kendi kitabını ekle; otomatik olarak sana atanır ve koçun da görür.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-2">
              <div className="space-y-5">
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    <Type className="h-3.5 w-3.5" />
                    Kaynak Adı *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Örn. 345 TYT Matematik"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    <Building2 className="h-3.5 w-3.5" />
                    Yayınevi
                  </label>
                  <input
                    type="text"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                    placeholder="Opsiyonel"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                  />
                </div>

                <SearchableSelect
                  label="Sınav Türü *"
                  icon={<GraduationCap className="h-3.5 w-3.5" />}
                  value={examId}
                  onChange={handleExamChange}
                  options={[
                    { value: "", label: "— Sınav seçin —" },
                    ...examOptions.map((e) => ({
                      value: String(e.id),
                      label: e.name,
                      group: examGroupFromName(e.name),
                    })),
                  ]}
                  placeholder="— Sınav seçin —"
                />

                <SearchableSelect
                  label="Ders *"
                  icon={<BookOpen className="h-3.5 w-3.5" />}
                  value={subjectId}
                  onChange={setSubjectId}
                  disabled={!examId}
                  options={[
                    {
                      value: "",
                      label: examId ? "— Ders seçin —" : "Önce sınav türü seçin",
                    },
                    ...filteredSubjects.map((s) => ({
                      value: String(s.id),
                      label: s.name,
                      group: s.examName ?? undefined,
                    })),
                  ]}
                  placeholder={examId ? "— Ders seçin —" : "Önce sınav türü seçin"}
                  emptyText="Bu sınava ait ders yok"
                />

                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Kapak Rengi
                  </span>
                  <div className="grid grid-cols-6 gap-2">
                    {COVER_COLOR_PALETTE.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        title={c.label}
                        onClick={() => setCoverColor(c.value)}
                        className={`aspect-square rounded-xl transition-all duration-200 ${
                          coverColor === c.value
                            ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--surface)] scale-105"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.value }}
                        aria-label={c.label}
                        aria-pressed={coverColor === c.value}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:sticky lg:top-0 lg:self-start">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                  Önizleme
                </p>
                <ResourcePreviewCard
                  name={name.trim()}
                  publisher={publisher.trim()}
                  coverColor={coverColor}
                  examName={selectedExam?.name ?? null}
                  subjectName={selectedSubject?.name ?? null}
                />
              </div>
            </div>

            <div className="border-t border-[var(--border)] px-5 pb-5 sm:px-6 sm:pb-6">
              <TopicEditor topics={topics} onChange={setTopics} />

              <button
                type="submit"
                disabled={loading || !name.trim() || !examId || !subjectId}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] via-[var(--primary-2)] to-[var(--primary-3)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] shadow-lg shadow-[var(--primary)]/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Kaydet ve Listeme Ekle
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
