"use client";

import { useEffect, useState } from "react";
import { Library, Plus, CheckCheck, AlertCircle } from "lucide-react";
import type {
  ExamOption,
  SubjectOption,
} from "@/app/dashboard/teacher/resources/_components/resource-types";
import StudentResourceDetailModal from "./StudentResourceDetailModal";
import StudentAddResourceModal from "./StudentAddResourceModal";

export interface StudentAssignedResource {
  assignmentId: string;
  note: string | null;
  id: string;
  name: string;
  publisher: string | null;
  cover_color: string;
  exam: { name: string } | null;
  subject: { name: string; color: string | null } | null;
  topicCount: number;
  totalQuestions: number;
  solvedTotal: number;
  correctTotal: number;
  wrongTotal: number;
  completionPct: number;
}

interface Props {
  initialResources: StudentAssignedResource[];
  studentId: string;
  canAddResources: boolean;
  teacherId: string | null;
  examOptions: ExamOption[];
  subjectOptions: SubjectOption[];
}

type ToastState = { type: "success" | "error"; message: string };

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose, toast]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3.5 text-sm font-semibold shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${
        toast.type === "success"
          ? "border-green-500/30 bg-[#0d1f0d] text-green-400 shadow-green-500/10"
          : "border-red-500/30 bg-[#1f0d0d] text-red-400 shadow-red-500/10"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCheck className="h-4.5 w-4.5 shrink-0" />
      ) : (
        <AlertCircle className="h-4.5 w-4.5 shrink-0" />
      )}
      {toast.message}
    </div>
  );
}

function calcResourceNet(correct: number, wrong: number): number {
  return correct - wrong / 4;
}

function ResourceCard({
  resource,
  onOpen,
}: {
  resource: StudentAssignedResource;
  onOpen: () => void;
}) {
  const badge =
    resource.exam?.name && resource.subject?.name
      ? `${resource.exam.name} · ${resource.subject.name}`
      : resource.exam?.name ?? resource.subject?.name ?? null;

  const hasProgress = resource.solvedTotal > 0;
  const allDone = resource.completionPct >= 100;
  const net = calcResourceNet(resource.correctTotal, resource.wrongTotal);
  const barWidth =
    resource.totalQuestions > 0
      ? Math.min(100, (resource.solvedTotal / resource.totalQuestions) * 100)
      : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[var(--border)] hover:shadow-lg hover:shadow-[var(--primary)]/10"
    >
      <div
        className="relative min-h-[6.5rem] p-5"
        style={{ backgroundColor: resource.cover_color }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <div className="relative">
          <h3 className="text-base font-bold leading-snug text-[var(--text-primary)]">
            {resource.name}
          </h3>
          {resource.publisher && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{resource.publisher}</p>
          )}
        </div>
      </div>
      <div className="space-y-3 p-4">
        {badge && (
          <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
            {badge}
          </span>
        )}
        {resource.note && (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[11px] italic text-[var(--text-muted)]">
            {resource.note}
          </p>
        )}
        <p className="text-xs text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-secondary)]">{resource.topicCount}</span>{" "}
          konu
          <span className="mx-1.5 text-[var(--text-muted)]">·</span>
          <span className="font-semibold text-[var(--text-secondary)]">
            {resource.totalQuestions}
          </span>{" "}
          soru hedef
        </p>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className={hasProgress ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"}>
              {hasProgress ? (
                <>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {resource.solvedTotal}
                  </span>
                  <span className="text-[var(--text-muted)]"> / </span>
                  <span>{resource.totalQuestions}</span> soru
                </>
              ) : (
                "Henüz çözüm yok"
              )}
            </span>
            {hasProgress && (
              <span className="font-semibold text-[var(--accent)]">%{resource.completionPct}</span>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                allDone
                  ? "bg-green-500"
                  : "bg-gradient-to-r from-[var(--primary)] via-[var(--primary-2)] to-[var(--primary-3)]"
              }`}
              style={{ width: `${hasProgress ? Math.max(barWidth, 2) : 0}%` }}
            />
          </div>
        </div>

        {hasProgress && (
          <p className="text-[10px] text-[var(--text-muted)]">
            <span className="text-green-400/90">{resource.correctTotal}D</span>
            <span className="mx-1 text-[var(--text-muted)]">·</span>
            <span className="text-red-400/90">{resource.wrongTotal}Y</span>
            <span className="mx-1 text-[var(--text-muted)]">·</span>
            <span className="text-[var(--text-secondary)]">
              net {net >= 0 ? "+" : ""}
              {net.toFixed(2)}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export default function StudentResourcesClient({
  initialResources,
  studentId,
  canAddResources,
  teacherId,
  examOptions,
  subjectOptions,
}: Props) {
  const [detailResource, setDetailResource] = useState<StudentAssignedResource | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showAddButton = canAddResources && teacherId != null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)] sm:text-3xl">Kaynaklarım</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {showAddButton
              ? "Koçunun atadığı ve senin eklediğin kaynaklar"
              : "Koçunun sana atadığı kaynaklar ve ilerlemen"}
          </p>
        </div>

        {showAddButton && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] shadow-lg shadow-[var(--primary)]/25 transition-all hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            Kaynak Ekle
          </button>
        )}
      </div>

      {initialResources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-6 py-16 text-center">
          <Library className="mb-4 h-10 w-10 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">
            {showAddButton
              ? "Henüz kaynağın yok. İlk kitabını ekleyerek başlayabilirsin!"
              : "Henüz sana atanmış kaynak yok. Koçun kaynak atadığında burada görünecek."}
          </p>
          {showAddButton && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-2 text-sm font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--primary)]/20"
            >
              <Plus className="h-4 w-4" />
              Kaynak Ekle
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initialResources.map((resource) => (
            <ResourceCard
              key={resource.assignmentId}
              resource={resource}
              onOpen={() => setDetailResource(resource)}
            />
          ))}
        </div>
      )}

      {detailResource && (
        <StudentResourceDetailModal
          resource={detailResource}
          studentId={studentId}
          onClose={() => setDetailResource(null)}
        />
      )}

      {showAddButton && teacherId && (
        <StudentAddResourceModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          studentId={studentId}
          teacherId={teacherId}
          examOptions={examOptions}
          subjectOptions={subjectOptions}
          onSuccess={(message) => setToast({ type: "success", message })}
          onError={(message) => setToast({ type: "error", message })}
        />
      )}
    </div>
  );
}
