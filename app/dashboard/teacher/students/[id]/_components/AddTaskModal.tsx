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
} from "lucide-react";

type TaskType = "ders" | "deneme" | "bras_deneme";

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
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const selectedSubject = subjects.find((s) => String(s.id) === subjectId);
  const topics = selectedSubject?.topics ?? [];
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
  }, [planDate]);

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
          className="relative w-full max-w-lg animate-in fade-in zoom-in-95 fill-mode-both rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d0d2b] to-[#07070f] shadow-2xl shadow-[#7B2FFF]/20 duration-200"
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
