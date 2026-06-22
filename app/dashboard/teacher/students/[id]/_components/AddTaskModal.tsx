"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "./SearchableSelect";
import type { ProgramSubject } from "./program-types";
import {
  BookOpen,
  Tag,
  Save,
  Loader2,
  X,
  FileText,
  BookMarked,
} from "lucide-react";

type TaskType = "ders" | "deneme" | "bras_deneme";

interface StudyResourceTopicOption {
  id: number;
  name: string;
  target_count: number;
  order_index: number;
}

interface StudyResourceOption {
  id: number;
  name: string;
  exam: { name: string } | null;
  subject: { name: string } | null;
  topics: StudyResourceTopicOption[];
}

function mapStudyResource(row: {
  id: number;
  name: string;
  exam: { name: string } | { name: string }[] | null;
  subject: { name: string } | { name: string }[] | null;
  topics: StudyResourceTopicOption[] | null;
}): StudyResourceOption {
  const examRaw = row.exam;
  const exam = Array.isArray(examRaw) ? examRaw[0] ?? null : examRaw;
  const subjectRaw = row.subject;
  const subject = Array.isArray(subjectRaw) ? subjectRaw[0] ?? null : subjectRaw;
  const topics = [...(row.topics ?? [])].sort(
    (a, b) => a.order_index - b.order_index
  );
  return {
    id: row.id,
    name: row.name,
    exam: exam as { name: string } | null,
    subject: subject as { name: string } | null,
    topics,
  };
}

const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: "ders", label: "Ders" },
  { value: "deneme", label: "Deneme" },
  { value: "bras_deneme", label: "Branş Denemesi" },
];

function buildSuggestedTitle(
  taskType: TaskType,
  subject: ProgramSubject | undefined,
  topicName: string | undefined
) {
  if (taskType === "deneme") return "Deneme";
  if (taskType === "bras_deneme") {
    return subject ? `${subject.name} Branş Denemesi` : "Branş Denemesi";
  }
  if (subject && topicName) {
    const prefix = subject.exam ? `${subject.exam} ` : "";
    return `${prefix}${subject.name} — ${topicName}`;
  }
  if (subject) {
    const prefix = subject.exam ? `${subject.exam} ` : "";
    return `${prefix}${subject.name}`;
  }
  return "Ders";
}

interface Props {
  onClose: () => void;
  studentId: string;
  subjects: ProgramSubject[];
  planDate: string;
  dayLabel: string;
  taskCountForDate: (date: string) => number;
  onSuccess: (planDate: string) => void;
  onError: (message: string) => void;
}

export default function AddTaskModal({
  onClose,
  studentId,
  subjects,
  planDate,
  dayLabel,
  taskCountForDate,
  onSuccess,
  onError,
}: Props) {
  const supabase = createClient();

  const [taskType, setTaskType] = useState<TaskType>("ders");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [title, setTitle] = useState("Ders");
  const [titleEdited, setTitleEdited] = useState(false);
  const [resourceId, setResourceId] = useState("");
  const [resourceTopicId, setResourceTopicId] = useState("");
  const [resources, setResources] = useState<StudyResourceOption[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const selectedSubject = subjects.find((s) => String(s.id) === subjectId);
  const topics = selectedSubject?.topics ?? [];
  const selectedResource = resources.find((r) => String(r.id) === resourceId);
  const resourceTopics = selectedResource?.topics ?? [];
  const showSubject = taskType !== "deneme";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTaskType("ders");
    setSubjectId("");
    setTopicId("");
    setTitle("Ders");
    setTitleEdited(false);
    setResourceId("");
    setResourceTopicId("");
  }, [planDate]);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    (async () => {
      setResourcesLoading(true);
      const { data } = await supabase
        .from("study_resources")
        .select(
          "id, name, exam:exams(name), subject:subjects(name), topics:study_resource_topics(id, name, target_count, order_index)"
        )
        .order("order_index");

      if (!cancelled) {
        setResources(
          (data ?? []).map((row) =>
            mapStudyResource(row as Parameters<typeof mapStudyResource>[0])
          )
        );
        setResourcesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, supabase]);

  useEffect(() => {
    if (titleEdited) return;
    const topicName = topics.find((t) => String(t.id) === topicId)?.name;
    setTitle(buildSuggestedTitle(taskType, selectedSubject, topicName));
  }, [taskType, subjectId, topicId, selectedSubject, topics, titleEdited]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, []);

  const handleTaskTypeChange = useCallback((v: string) => {
    const next = v as TaskType;
    setTaskType(next);
    if (next === "deneme") {
      setSubjectId("");
      setTopicId("");
    }
  }, []);

  const handleSubjectChange = useCallback((id: string) => {
    setSubjectId(id);
    setTopicId("");
  }, []);

  const handleResourceChange = useCallback((id: string) => {
    setResourceId(id);
    setResourceTopicId("");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!planDate) {
      onError("Geçersiz gün.");
      return;
    }
    if (!title.trim()) {
      onError("Lütfen bir başlık girin.");
      return;
    }
    if (showSubject && taskType === "ders" && !subjectId) {
      onError("Lütfen bir ders seçin.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      onError("Oturum süresi doldu, lütfen tekrar giriş yapın.");
      setLoading(false);
      return;
    }

    // studentId client'tan gelir; RLS (is_teacher_of_student + teacher_id=auth.uid()) yetkiyi doğrular.
    const orderIndex = taskCountForDate(planDate);

    const { error } = await supabase.from("study_plan_tasks").insert({
      student_id: studentId,
      teacher_id: user.id,
      plan_date: planDate,
      subject_id: subjectId ? parseInt(subjectId) : null,
      topic_id: topicId ? parseInt(topicId) : null,
      task_type: taskType,
      title: title.trim(),
      start_time: null,
      end_time: null,
      break_minutes: null,
      order_index: orderIndex,
      is_completed: false,
      study_resource_id: resourceId ? parseInt(resourceId, 10) : null,
      study_resource_topic_id: resourceTopicId ? parseInt(resourceTopicId, 10) : null,
    });

    setLoading(false);

    if (error) {
      onError("Kayıt sırasında hata oluştu: " + error.message);
      return;
    }

    onSuccess(planDate);
    onClose();
  };

  if (!mounted) return null;

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
          aria-labelledby="add-task-modal-title"
          className="relative max-h-[90vh] w-full max-w-lg animate-in fade-in zoom-in-95 fill-mode-both overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d0d2b] to-[#07070f] shadow-2xl shadow-[#7B2FFF]/20 duration-200"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7B2FFF] to-transparent" />

          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
            <div>
              <h2
                id="add-task-modal-title"
                className="text-base font-bold text-white"
              >
                Görev Ekle — {dayLabel}
              </h2>
              <p className="mt-0.5 text-[11px] text-white/35">
                Öğrenciye planlı görev ata
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/8 bg-white/[0.04] p-2 text-white/40 transition-colors hover:text-white"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 overflow-visible p-5">
            <SearchableSelect
              label="Görev Tipi"
              icon={<Tag className="h-3.5 w-3.5" />}
              value={taskType}
              onChange={handleTaskTypeChange}
              searchable={false}
              options={TASK_TYPE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
            />

            {showSubject && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SearchableSelect
                  label="Ders"
                  icon={<BookOpen className="h-3.5 w-3.5" />}
                  value={subjectId}
                  onChange={handleSubjectChange}
                  options={[
                    { value: "", label: "— Ders seçin —" },
                    ...subjects.map((s) => ({
                      value: String(s.id),
                      label: s.name,
                      group: s.exam ?? "Diğer",
                    })),
                  ]}
                  placeholder="— Ders seçin —"
                />

                <SearchableSelect
                  label="Kazanım (opsiyonel)"
                  icon={<Tag className="h-3.5 w-3.5" />}
                  value={topicId}
                  onChange={setTopicId}
                  options={[
                    { value: "", label: "— Kazanım seçin —" },
                    ...topics.map((t) => ({
                      value: String(t.id),
                      label: t.name,
                    })),
                  ]}
                  disabled={!subjectId || topics.length === 0}
                  placeholder="— Kazanım seçin —"
                  emptyText="Bu derse ait kazanım yok"
                />
              </div>
            )}

            <div className="space-y-4 border-t border-white/8 pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
                  Kaynak (opsiyonel)
                </p>
                {resourcesLoading && (
                  <span className="text-[10px] text-white/30">Kaynaklar yükleniyor…</span>
                )}
              </div>

              <SearchableSelect
                label="Kaynak"
                icon={<BookMarked className="h-3.5 w-3.5" />}
                value={resourceId}
                onChange={handleResourceChange}
                disabled={resourcesLoading}
                options={[
                  { value: "", label: "— Kaynak seçin (opsiyonel) —" },
                  ...resources.map((r) => {
                    const hintParts: string[] = [];
                    if (r.exam?.name) hintParts.push(r.exam.name);
                    if (r.subject?.name) hintParts.push(r.subject.name);
                    return {
                      value: String(r.id),
                      label: r.name,
                      hint: hintParts.length > 0 ? hintParts.join(" · ") : undefined,
                    };
                  }),
                ]}
                placeholder="— Kaynak seçin (opsiyonel) —"
                emptyText="Henüz kaynak yok"
              />

              <SearchableSelect
                label="Kaynak Konusu"
                icon={<Tag className="h-3.5 w-3.5" />}
                value={resourceTopicId}
                onChange={setResourceTopicId}
                disabled={!resourceId || resourceTopics.length === 0}
                options={[
                  { value: "", label: "— Konu seçin —" },
                  ...resourceTopics.map((t) => ({
                    value: String(t.id),
                    label:
                      t.target_count > 0
                        ? `${t.name} (${t.target_count} soru)`
                        : t.name,
                  })),
                ]}
                placeholder="— Konu seçin —"
                emptyText="Bu kaynakta konu yok"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                <FileText className="h-3.5 w-3.5" />
                Başlık
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleEdited(true);
                }}
                required
                placeholder="Görev başlığı"
                className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-white/20 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2FFF]/40 focus-visible:ring-offset-0"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] py-3 text-sm font-bold text-white shadow-lg shadow-[#7B2FFF]/25 transition-all duration-300 hover:shadow-[#7B2FFF]/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {loading ? "Kaydediliyor…" : "Görevi Kaydet"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
