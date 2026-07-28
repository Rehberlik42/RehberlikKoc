"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Library,
  BookOpen,
  GraduationCap,
  Loader2,
  Save,
  Type,
  Building2,
  Search,
  Users,
  Layers,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/app/dashboard/teacher/students/[id]/_components/SearchableSelect";
import {
  COVER_COLOR_PALETTE,
  calcCompletionPct,
  EMPTY_RESOURCE_PROGRESS,
  examGroupFromName,
  type ExamOption,
  type StudyResource,
  type StudyResourceWithTopics,
  type StudentLite,
  type SubjectOption,
} from "./resource-types";
import dynamic from "next/dynamic";

const TopicEditor = dynamic(() => import("./TopicEditor"), {
  loading: () => (
    <div className="h-40 animate-pulse rounded-xl bg-[var(--surface-2)]" />
  ),
});

type InputMode = "manual" | "library";
type ModalStep = "form" | "assign";

type ContentKind =
  | "soru_bankasi"
  | "konu_anlatimi"
  | "fasikul"
  | "deneme"
  | "paragraf"
  | "diger";

const CONTENT_KIND_OPTIONS: { value: ContentKind; label: string }[] = [
  { value: "soru_bankasi", label: "Soru Bankası" },
  { value: "konu_anlatimi", label: "Konu Anlatımı" },
  { value: "fasikul", label: "Fasikül" },
  { value: "deneme", label: "Deneme" },
  { value: "paragraf", label: "Paragraf" },
  { value: "diger", label: "Diğer" },
];

const DEFAULT_CONTENT_KIND: ContentKind = "soru_bankasi";

interface ResourceLibraryRow {
  id: number;
  publisher: string | null;
  content: string | null;
  exam_label: string;
  subject_label: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  teacherId: string;
  examOptions: ExamOption[];
  subjectOptions: SubjectOption[];
  orderIndex: number;
  editing?: StudyResourceWithTopics | null;
  onCreated: (resource: StudyResource) => void;
  onUpdated?: (resource: StudyResource) => void;
  onError: (message: string) => void;
}

function uniqSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v?.trim())))].sort(
    (a, b) => a.localeCompare(b, "tr")
  );
}

const RESOURCE_LIBRARY_PAGE_SIZE = 1000;

/** PostgREST varsayılan satır limiti (1000) distinct exam_label'ları eksik bırakır; tüm sayfaları tarar. */
async function fetchDistinctResourceLabels(
  supabase: ReturnType<typeof createClient>,
  column: "exam_label" | "subject_label",
  examLabelFilter?: string
): Promise<string[]> {
  const collected: string[] = [];
  let offset = 0;

  for (;;) {
    let query = supabase
      .from("resource_library")
      .select(column)
      .range(offset, offset + RESOURCE_LIBRARY_PAGE_SIZE - 1);

    if (examLabelFilter) {
      query = query.eq("exam_label", examLabelFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    if (rows.length === 0) break;

    for (const row of rows) {
      const value = row[column];
      if (value) collected.push(value);
    }

    if (rows.length < RESOURCE_LIBRARY_PAGE_SIZE) break;
    offset += RESOURCE_LIBRARY_PAGE_SIZE;
  }

  return uniqSorted(collected);
}

function matchExamId(examLabel: string, examOptions: ExamOption[]): string {
  const found = examOptions.find(
    (e) => e.name.toLowerCase() === examLabel.toLowerCase()
  );
  return found ? String(found.id) : "";
}

function matchSubjectId(
  subjectLabel: string,
  examId: string,
  subjectOptions: SubjectOption[]
): string {
  if (!examId) return "";
  const found = subjectOptions.find(
    (s) =>
      String(s.exam_id) === examId &&
      s.name.toLowerCase() === subjectLabel.toLowerCase()
  );
  return found ? String(found.id) : "";
}

export default function AddResourceModal({
  open,
  onClose,
  teacherId,
  examOptions,
  subjectOptions,
  orderIndex,
  editing = null,
  onCreated,
  onUpdated,
  onError,
}: Props) {
  const supabase = createClient();
  const isEditMode = editing != null;

  const [name, setName] = useState("");
  const [publisher, setPublisher] = useState("");
  const [contentKind, setContentKind] = useState<ContentKind>(DEFAULT_CONTENT_KIND);
  const [examId, setExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [coverColor, setCoverColor] = useState<string>(COVER_COLOR_PALETTE[0].value);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [inputMode, setInputMode] = useState<InputMode>("manual");
  const [step, setStep] = useState<ModalStep>("form");
  const [createdResource, setCreatedResource] = useState<StudyResource | null>(null);

  const [libExamLabels, setLibExamLabels] = useState<string[]>([]);
  const [libExamLabel, setLibExamLabel] = useState("");
  const [libSubjectLabels, setLibSubjectLabels] = useState<string[]>([]);
  const [libSubjectLabel, setLibSubjectLabel] = useState("");
  const [libSearch, setLibSearch] = useState("");
  const [libEntries, setLibEntries] = useState<ResourceLibraryRow[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [libListDismissed, setLibListDismissed] = useState(false);

  const [students, setStudents] = useState<StudentLite[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    () => new Set()
  );
  const [assignLoading, setAssignLoading] = useState(false);

  const stepRef = useRef(step);
  const createdResourceRef = useRef(createdResource);
  const onCloseRef = useRef(onClose);
  const onCreatedRef = useRef(onCreated);

  stepRef.current = step;
  createdResourceRef.current = createdResource;
  onCloseRef.current = onClose;
  onCreatedRef.current = onCreated;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    if (editing) {
      setStep("form");
      setCreatedResource(null);
      setInputMode("manual");
      setName(editing.name);
      setPublisher(editing.publisher ?? "");
      setContentKind(DEFAULT_CONTENT_KIND);
      setExamId(editing.exam_id != null ? String(editing.exam_id) : "");
      setSubjectId(editing.subject_id != null ? String(editing.subject_id) : "");
      setCoverColor(editing.cover_color);

      let cancelled = false;
      void (async () => {
        const withKind = editing as StudyResourceWithTopics & {
          content_kind?: ContentKind | null;
        };
        if (withKind.content_kind) {
          setContentKind(withKind.content_kind);
          return;
        }

        const { data } = await supabase
          .from("study_resources")
          .select("content_kind")
          .eq("id", editing.id)
          .single();

        if (cancelled) return;
        setContentKind((data?.content_kind as ContentKind) ?? DEFAULT_CONTENT_KIND);
      })();

      return () => {
        cancelled = true;
      };
    } else {
      setStep("form");
      setCreatedResource(null);
      setInputMode("manual");
      setName("");
      setPublisher("");
      setContentKind(DEFAULT_CONTENT_KIND);
      setExamId("");
      setSubjectId("");
      setCoverColor(COVER_COLOR_PALETTE[0].value);
      setLibExamLabel("");
      setLibSubjectLabel("");
      setLibSearch("");
      setLibEntries([]);
      setLibListDismissed(false);
      setSelectedStudentIds(new Set());
    }
  }, [open, editing]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (stepRef.current === "assign" && createdResourceRef.current) {
        onCreatedRef.current(createdResourceRef.current);
      }
      onCloseRef.current();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [open]);

  useEffect(() => {
    if (!open || isEditMode || inputMode !== "library") return;

    let cancelled = false;
    setLibLoading(true);

    (async () => {
      try {
        const labels = await fetchDistinctResourceLabels(
          createClient(),
          "exam_label"
        );

        if (cancelled) return;
        setLibLoading(false);
        setLibExamLabels(labels);
      } catch (error) {
        if (cancelled) return;
        setLibLoading(false);
        setLibExamLabels([]);
        onError(
          "Kütüphane yüklenemedi: " +
            (error instanceof Error ? error.message : "bilinmeyen hata")
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isEditMode, inputMode, onError]);

  useEffect(() => {
    if (!open || isEditMode || inputMode !== "library" || !libExamLabel) {
      setLibSubjectLabels([]);
      return;
    }

    let cancelled = false;
    setLibLoading(true);

    (async () => {
      try {
        const labels = await fetchDistinctResourceLabels(
          createClient(),
          "subject_label",
          libExamLabel
        );

        if (cancelled) return;
        setLibLoading(false);
        setLibSubjectLabels(labels);
      } catch {
        if (cancelled) return;
        setLibLoading(false);
        setLibSubjectLabels([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isEditMode, inputMode, libExamLabel]);

  useEffect(() => {
    if (
      !open ||
      isEditMode ||
      inputMode !== "library" ||
      !libExamLabel ||
      !libSubjectLabel ||
      libListDismissed
    ) {
      if (libListDismissed) return;
      setLibEntries([]);
      return;
    }

    let cancelled = false;
    const searchQ = libSearch.trim();
    const timer = setTimeout(() => {
      (async () => {
        setLibLoading(true);
        let query = supabase
          .from("resource_library")
          .select("id, publisher, content, exam_label, subject_label")
          .eq("exam_label", libExamLabel)
          .eq("subject_label", libSubjectLabel);

        if (searchQ) {
          query = query.or(
            `publisher.ilike.%${searchQ}%,content.ilike.%${searchQ}%`
          );
        }

        const { data, error } = await query
          .order("publisher", { ascending: true })
          .limit(80);

        if (cancelled) return;
        setLibLoading(false);

        if (error) {
          setLibEntries([]);
          return;
        }

        setLibEntries((data ?? []) as ResourceLibraryRow[]);
      })();
    }, searchQ ? 250 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    open,
    isEditMode,
    inputMode,
    libExamLabel,
    libSubjectLabel,
    libSearch,
    libListDismissed,
    supabase,
  ]);

  useEffect(() => {
    if (!open || step !== "assign") return;

    let cancelled = false;
    setStudentsLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("teacher_id", teacherId)
        .eq("role", "student")
        .order("full_name");

      if (cancelled) return;
      setStudentsLoading(false);

      if (error) {
        setStudents([]);
        onError("Öğrenci listesi yüklenemedi: " + error.message);
        return;
      }

      setStudents(
        (data ?? []).map((s) => ({
          id: s.id,
          full_name: s.full_name,
        }))
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [open, step, teacherId, supabase, onError]);

  const filteredSubjects = useMemo(() => {
    if (!examId) return [];
    return subjectOptions.filter((s) => String(s.exam_id) === examId);
  }, [examId, subjectOptions]);

  const handleExamChange = useCallback((id: string) => {
    setExamId(id);
    setSubjectId("");
  }, []);

  const handleLibExamChange = (label: string) => {
    setLibExamLabel(label);
    setLibSubjectLabel("");
    setLibSearch("");
    setLibEntries([]);
    setLibListDismissed(false);
  };

  const handleLibraryPick = (row: ResourceLibraryRow) => {
    const resourceName =
      row.content?.trim() ||
      `${row.publisher ?? ""} ${row.subject_label}`.trim();
    setName(resourceName);
    setPublisher(row.publisher?.trim() ?? "");

    const matchedExamId = matchExamId(row.exam_label, examOptions);
    setExamId(matchedExamId);
    if (matchedExamId) {
      setSubjectId(
        matchSubjectId(row.subject_label, matchedExamId, subjectOptions)
      );
    } else {
      setSubjectId("");
    }

    setLibSearch("");
    setLibEntries([]);
    setLibListDismissed(true);
  };

  const finishCreate = (resource: StudyResource) => {
    onCreated(resource);
    onClose();
  };

  const handleClose = () => {
    if (step === "assign" && createdResource) {
      finishCreate(createdResource);
      return;
    }
    onClose();
  };

  const handleSkipAssign = () => {
    if (createdResource) finishCreate(createdResource);
  };

  const handleAssignAndFinish = async () => {
    if (!createdResource || selectedStudentIds.size === 0) {
      handleSkipAssign();
      return;
    }

    setAssignLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setAssignLoading(false);
      onError("Oturum bulunamadı");
      return;
    }

    const inserts = [...selectedStudentIds].map((studentId) =>
      supabase.from("resource_assignments").insert({
        study_resource_id: createdResource.id,
        student_id: studentId,
        assigned_by: user.id,
      })
    );

    const results = await Promise.all(inserts);
    const failed = results.find((r) => r.error);

    setAssignLoading(false);

    if (failed?.error) {
      onError("Atama kaydedilemedi: " + failed.error.message);
      return;
    }

    finishCreate(createdResource);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;
    if (!examId) return;
    if (!subjectId) return;

    setLoading(true);

    if (isEditMode && editing) {
      const { data, error } = await supabase
        .from("study_resources")
        .update({
          name: name.trim(),
          publisher: publisher.trim() || null,
          content_kind: contentKind,
          exam_id: parseInt(examId, 10),
          subject_id: parseInt(subjectId, 10),
          cover_color: coverColor,
        })
        .eq("id", editing.id)
        .select(
          "id, name, publisher, cover_color, order_index, exam:exams(name), subject:subjects(name, color)"
        )
        .single();

      setLoading(false);

      if (error || !data) {
        onError("Kaynak güncellenemedi: " + (error?.message ?? "bilinmeyen hata"));
        return;
      }

      const examRaw = data.exam;
      const exam = Array.isArray(examRaw) ? examRaw[0] ?? null : examRaw;
      const subjectRaw = data.subject;
      const subject = Array.isArray(subjectRaw) ? subjectRaw[0] ?? null : subjectRaw;

      onUpdated?.({
        id: data.id,
        name: data.name,
        publisher: data.publisher,
        cover_color: data.cover_color ?? coverColor,
        order_index: data.order_index,
        exam: exam as { name: string } | null,
        subject: subject as { name: string; color: string | null } | null,
        topicCount: editing.topicCount,
        totalQuestions: editing.totalQuestions,
        solvedTotal: editing.solvedTotal,
        correctTotal: editing.correctTotal,
        wrongTotal: editing.wrongTotal,
        completionPct: calcCompletionPct(editing.solvedTotal, editing.totalQuestions),
      });
      onClose();
      return;
    }

    const { data, error } = await supabase
      .from("study_resources")
      .insert({
        teacher_id: teacherId,
        name: name.trim(),
        publisher: publisher.trim() || null,
        content_kind: contentKind,
        exam_id: parseInt(examId, 10),
        subject_id: parseInt(subjectId, 10),
        cover_color: coverColor,
        order_index: orderIndex,
      })
      .select(
        "id, name, publisher, cover_color, order_index, exam:exams(name), subject:subjects(name, color)"
      )
      .single();

    setLoading(false);

    if (error || !data) {
      onError("Kaynak eklenemedi: " + (error?.message ?? "bilinmeyen hata"));
      return;
    }

    const examRaw = data.exam;
    const exam = Array.isArray(examRaw) ? examRaw[0] ?? null : examRaw;
    const subjectRaw = data.subject;
    const subject = Array.isArray(subjectRaw) ? subjectRaw[0] ?? null : subjectRaw;

    const resource: StudyResource = {
      id: data.id,
      name: data.name,
      publisher: data.publisher,
      cover_color: data.cover_color ?? coverColor,
      order_index: data.order_index,
      exam: exam as { name: string } | null,
      subject: subject as { name: string; color: string | null } | null,
      topicCount: 0,
      totalQuestions: 0,
      ...EMPTY_RESOURCE_PROGRESS,
    };

    setCreatedResource(resource);
    setSelectedStudentIds(new Set());
    setStep("assign");
  };

  if (!open || !mounted) return null;

  const modalTitle =
    step === "assign"
      ? "Öğrencilere Ata"
      : isEditMode
        ? "Kaynağı Düzenle"
        : "Yeni Kaynak Ekle";

  const modalSubtitle =
    step === "assign"
      ? createdResource
        ? `"${createdResource.name}" kaynağını öğrencilerine ata`
        : "Kaynağı öğrencilerine ata"
      : isEditMode
        ? "Kaynak bilgilerini ve konuları güncelle"
        : "Kaynak bilgilerini gir, konuları ekle, kapak rengini seç";

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <button
        type="button"
        aria-label="Modalı kapat"
        onClick={handleClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-resource-modal-title"
          className="relative flex max-h-[90vh] w-full max-w-lg flex-col animate-in fade-in zoom-in-95 fill-mode-both rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] shadow-2xl shadow-[var(--primary)]/20 duration-200"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent" />

          <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/15 text-[var(--accent)]">
                {step === "assign" ? (
                  <Users className="h-4.5 w-4.5" />
                ) : (
                  <Library className="h-4.5 w-4.5" />
                )}
              </div>
              <div>
                <h2 id="add-resource-modal-title" className="text-base font-bold text-[var(--text-primary)]">
                  {modalTitle}
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">{modalSubtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {step === "assign" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 sm:p-6">
              {studentsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
                  <p className="mt-3 text-sm">Öğrenciler yükleniyor…</p>
                </div>
              ) : students.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border)] px-4 py-10 text-center">
                  <p className="text-sm text-[var(--text-muted)]">
                    Henüz öğrenciniz yok — kaynak oluşturuldu, istediğiniz zaman atayabilirsiniz.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {students.map((student) => {
                    const checked = selectedStudentIds.has(student.id);
                    return (
                      <label
                        key={student.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3 transition-colors ${
                          checked ? "bg-[var(--primary)]/5" : "bg-[var(--surface-2)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedStudentIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(student.id)) next.delete(student.id);
                              else next.add(student.id);
                              return next;
                            });
                          }}
                          className="h-4 w-4 shrink-0 rounded border-[var(--border)] accent-[var(--primary)]"
                        />
                        <span className="min-w-0 flex-1 text-sm text-[var(--text-primary)]">
                          {student.full_name ?? "Öğrenci"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleSkipAssign}
                  disabled={assignLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
                >
                  Atla
                </button>
                <button
                  type="button"
                  onClick={() => void handleAssignAndFinish()}
                  disabled={assignLoading || studentsLoading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] via-[var(--primary-2)] to-[var(--primary-3)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] shadow-lg shadow-[var(--primary)]/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {assignLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  Ata ve Bitir
                  {selectedStudentIds.size > 0 && (
                    <span className="text-[11px] font-semibold opacity-80">
                      ({selectedStudentIds.size})
                    </span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto"
            >
              {!isEditMode && (
                <div className="border-b border-[var(--border)] px-5 pt-4 sm:px-6">
                  <div className="flex w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[12px] font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setInputMode("manual");
                        setLibListDismissed(false);
                      }}
                      className={`flex-1 px-3 py-2.5 text-center transition-colors ${
                        inputMode === "manual"
                          ? "bg-[var(--primary)]/20 text-[var(--accent)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      Manuel Gir
                    </button>
                    <div className="w-px shrink-0 self-stretch bg-[var(--border)]" aria-hidden />
                    <button
                      type="button"
                      onClick={() => {
                        setInputMode("library");
                        setLibListDismissed(false);
                      }}
                      className={`flex-1 px-3 py-2.5 text-center transition-colors ${
                        inputMode === "library"
                          ? "bg-[var(--primary)]/20 text-[var(--accent)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      Kütüphaneden Seç
                    </button>
                  </div>

                  {inputMode === "library" && (
                    <div className="mt-4 space-y-3 pb-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Kütüphane · Sınav Türü
                          </label>
                          <select
                            value={libExamLabel}
                            onChange={(e) => handleLibExamChange(e.target.value)}
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                          >
                            <option value="">— Sınav seçin —</option>
                            {libExamLabels.map((label) => (
                              <option key={label} value={label}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                            Kütüphane · Ders
                          </label>
                          <select
                            value={libSubjectLabel}
                            onChange={(e) => {
                              setLibSubjectLabel(e.target.value);
                              setLibSearch("");
                              setLibListDismissed(false);
                            }}
                            disabled={!libExamLabel}
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 disabled:opacity-50"
                          >
                            <option value="">
                              {libExamLabel ? "— Ders seçin —" : "Önce sınav türü seçin"}
                            </option>
                            {libSubjectLabels.map((label) => (
                              <option key={label} value={label}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {libExamLabel && libSubjectLabel && libListDismissed ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/5 px-3 py-2.5">
                          <p className="min-w-0 truncate text-sm text-[var(--text-secondary)]">
                            <span className="font-semibold text-[var(--accent)]">
                              Seçildi:
                            </span>{" "}
                            {publisher ? `${publisher} — ` : ""}
                            {name || "Kaynak"}
                          </p>
                          <button
                            type="button"
                            onClick={() => setLibListDismissed(false)}
                            className="shrink-0 text-[11px] font-semibold text-[var(--accent)] hover:underline"
                          >
                            Değiştir
                          </button>
                        </div>
                      ) : (
                        libExamLabel &&
                        libSubjectLabel && (
                          <>
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                              <input
                                type="search"
                                value={libSearch}
                                onChange={(e) => setLibSearch(e.target.value)}
                                placeholder="Yayınevi veya içerik ara…"
                                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                              />
                            </div>

                            <div className="max-h-44 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40">
                              {libLoading ? (
                                <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Yükleniyor…
                                </div>
                              ) : libEntries.length === 0 ? (
                                <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                                  Kayıt bulunamadı
                                </p>
                              ) : (
                                <ul className="divide-y divide-[var(--border)]">
                                  {libEntries.map((row) => (
                                    <li key={row.id}>
                                      <button
                                        type="button"
                                        onClick={() => handleLibraryPick(row)}
                                        className="flex w-full px-3 py-2.5 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--primary)]/10 hover:text-[var(--accent)]"
                                      >
                                        {(row.publisher ?? "—") +
                                          " — " +
                                          (row.content?.trim() || row.subject_label)}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-6 p-5 sm:p-6">
                {/* Grup 1 — Temel Bilgiler */}
                <div className="space-y-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Temel Bilgiler
                  </p>
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
                </div>

                <div className="border-t border-[var(--border)]" />

                {/* Grup 2 — Sınıflandırma */}
                <div className="space-y-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Sınıflandırma
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      <Layers className="h-3.5 w-3.5" />
                      Kaynak Türü
                    </label>
                    <select
                      value={contentKind}
                      onChange={(e) => setContentKind(e.target.value as ContentKind)}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                    >
                      {CONTENT_KIND_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
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
                </div>

                <div className="border-t border-[var(--border)]" />

                {/* Grup 3 — Kapak Tasarımı */}
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Kapak Tasarımı
                  </p>
                  <div className="grid grid-cols-12 gap-1.5">
                    {COVER_COLOR_PALETTE.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        title={c.label}
                        onClick={() => setCoverColor(c.value)}
                        className={`aspect-square rounded-md transition-all duration-200 ${
                          coverColor === c.value
                            ? "ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--surface)] scale-105"
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

              <div className="border-t border-[var(--border)] px-5 pb-5 sm:px-6 sm:pb-6">
                {isEditMode && (
                  <p className="mb-3 text-[10px] leading-relaxed text-amber-400/80">
                    Ders değiştirilirse, kaynağın hiç konusu yoksa yeni derse ait kazanımlar otomatik eklenir.
                  </p>
                )}
                <TopicEditor
                  subjectId={subjectId ? parseInt(subjectId, 10) : null}
                  contentKind={contentKind}
                />

                <button
                  type="submit"
                  disabled={loading || !name.trim() || !examId || !subjectId}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] via-[var(--primary-2)] to-[var(--primary-3)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] shadow-lg shadow-[var(--primary)]/25 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isEditMode ? "Güncelle" : "Kaydet"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
