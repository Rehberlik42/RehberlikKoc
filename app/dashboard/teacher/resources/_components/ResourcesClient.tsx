"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
  Library,
  Plus,
  Search,
  BookMarked,
  BookOpen,
  GraduationCap,
  Hash,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Percent,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/app/dashboard/teacher/students/[id]/_components/SearchableSelect";
import AddResourceModal from "./AddResourceModal";
import DeleteResourceModal from "./DeleteResourceModal";
import ResourceDetailModal from "./ResourceDetailModal";
import {
  calcCompletionPct,
  calcResourceNet,
  EMPTY_RESOURCE_PROGRESS,
  examGroupFromName,
  type ExamOption,
  type ResourceTopicRow,
  type StudyResource,
  type StudyResourceWithTopics,
  type SubjectOption,
} from "./resource-types";

interface Props {
  teacherId: string;
  initialResources: StudyResource[];
  examOptions: ExamOption[];
  subjectOptions: SubjectOption[];
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#0d0d2b]/60 p-4">
      <div className="mb-2 text-white/35">{icon}</div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function ResourceGridCard({
  resource,
  onOpen,
  onEdit,
  onDelete,
  actionLoading,
}: {
  resource: StudyResource;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  actionLoading: boolean;
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
      className="group cursor-pointer overflow-hidden rounded-2xl border border-white/8 bg-[#0d0d2b]/60 text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/12 hover:shadow-lg hover:shadow-[#7B2FFF]/10"
    >
      <div
        className="relative min-h-[6.5rem] p-5"
        style={{ backgroundColor: resource.cover_color }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            disabled={actionLoading}
            aria-label="Kaynağı düzenle"
            className="rounded-lg border border-white/20 bg-black/30 p-1.5 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white disabled:opacity-50"
          >
            {actionLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Pencil className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={actionLoading}
            aria-label="Kaynağı sil"
            className="rounded-lg border border-white/20 bg-black/30 p-1.5 text-white/80 backdrop-blur-sm transition-colors hover:bg-red-500/40 hover:text-white disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="relative pr-16">
          <h3 className="text-base font-bold leading-snug text-white">{resource.name}</h3>
          {resource.publisher && (
            <p className="mt-1 text-sm text-white/75">{resource.publisher}</p>
          )}
        </div>
      </div>
      <div className="space-y-3 p-4">
        {badge && (
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/55">
            {badge}
          </span>
        )}
        <p className="text-xs text-white/40">
          <span className="font-semibold text-white/60">{resource.topicCount}</span> konu
          <span className="mx-1.5 text-white/20">·</span>
          <span className="font-semibold text-white/60">{resource.totalQuestions}</span> soru hedef
        </p>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className={hasProgress ? "text-white/55" : "text-white/30"}>
              {hasProgress ? (
                <>
                  <span className="font-semibold text-white">{resource.solvedTotal}</span>
                  <span className="text-white/30"> / </span>
                  <span>{resource.totalQuestions}</span> soru
                </>
              ) : (
                "Henüz çözüm yok"
              )}
            </span>
            {hasProgress && (
              <span className="font-semibold text-[#A78BFF]">%{resource.completionPct}</span>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                allDone
                  ? "bg-green-500"
                  : "bg-gradient-to-r from-[#7B2FFF] via-[#4F7CFF] to-[#00D4FF]"
              }`}
              style={{ width: `${hasProgress ? Math.max(barWidth, 2) : 0}%` }}
            />
          </div>
        </div>

        {hasProgress && (
          <p className="text-[10px] text-white/40">
            <span className="text-green-400/90">{resource.correctTotal}D</span>
            <span className="mx-1 text-white/20">·</span>
            <span className="text-red-400/90">{resource.wrongTotal}Y</span>
            <span className="mx-1 text-white/20">·</span>
            <span className="text-white/50">
              net {net >= 0 ? "+" : ""}
              {net.toFixed(2)}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

function mapEditingResource(
  row: {
    id: string | number;
    name: string;
    publisher: string | null;
    cover_color: string | null;
    order_index: number;
    exam_id: number | null;
    subject_id: number | null;
    exam: { name: string } | { name: string }[] | null;
    subject: { name: string; color: string | null } | { name: string; color: string | null }[] | null;
    topics: ResourceTopicRow[] | null;
  },
  progress: Pick<
    StudyResource,
    "solvedTotal" | "correctTotal" | "wrongTotal" | "completionPct"
  >
): StudyResourceWithTopics {
  const examRaw = row.exam;
  const exam = Array.isArray(examRaw) ? examRaw[0] ?? null : examRaw;
  const subjectRaw = row.subject;
  const subject = Array.isArray(subjectRaw) ? subjectRaw[0] ?? null : subjectRaw;
  const topics = row.topics ?? [];
  const topicCount = topics.length;
  const totalQuestions = topics.reduce((sum, t) => sum + (t.target_count ?? 0), 0);

  return {
    id: String(row.id),
    name: row.name,
    publisher: row.publisher,
    cover_color: row.cover_color ?? "#2B4C8C",
    order_index: row.order_index,
    exam: exam as { name: string } | null,
    subject: subject as { name: string; color: string | null } | null,
    topicCount,
    totalQuestions,
    solvedTotal: progress.solvedTotal,
    correctTotal: progress.correctTotal,
    wrongTotal: progress.wrongTotal,
    completionPct: calcCompletionPct(progress.solvedTotal, totalQuestions),
    exam_id: row.exam_id,
    subject_id: row.subject_id,
    topics,
  };
}

export default function ResourcesClient({
  teacherId,
  initialResources,
  examOptions,
  subjectOptions,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [resources, setResources] = useState<StudyResource[]>(initialResources);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<StudyResourceWithTopics | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudyResource | null>(null);
  const [detailResource, setDetailResource] = useState<StudyResource | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterExamId, setFilterExamId] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState("");

  const totalQuestions = useMemo(
    () => resources.reduce((sum, r) => sum + r.totalQuestions, 0),
    [resources]
  );

  const progressStats = useMemo(() => {
    const solvedTotal = resources.reduce((sum, r) => sum + r.solvedTotal, 0);
    const correctTotal = resources.reduce((sum, r) => sum + r.correctTotal, 0);
    const wrongTotal = resources.reduce((sum, r) => sum + r.wrongTotal, 0);
    const completionPct =
      totalQuestions > 0
        ? Math.min(100, Math.round((solvedTotal / totalQuestions) * 100))
        : 0;
    return { solvedTotal, correctTotal, wrongTotal, completionPct };
  }, [resources, totalQuestions]);

  const filterSubjects = useMemo(() => {
    if (!filterExamId) return subjectOptions;
    return subjectOptions.filter((s) => String(s.exam_id) === filterExamId);
  }, [filterExamId, subjectOptions]);

  const filteredResources = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return resources.filter((r) => {
      if (q && !r.name.toLocaleLowerCase("tr-TR").includes(q)) return false;
      if (filterExamId) {
        const exam = examOptions.find((e) => String(e.id) === filterExamId);
        if (exam && r.exam?.name !== exam.name) return false;
      }
      if (filterSubjectId) {
        const subject = subjectOptions.find((s) => String(s.id) === filterSubjectId);
        if (subject && r.subject?.name !== subject.name) return false;
      }
      return true;
    });
  }, [resources, search, filterExamId, filterSubjectId, examOptions, subjectOptions]);

  const openAddModal = () => {
    setEditingResource(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingResource(null);
  };

  const handleEdit = async (resource: StudyResource) => {
    setActionLoadingId(resource.id);

    const { data, error } = await supabase
      .from("study_resources")
      .select(
        "id, name, publisher, cover_color, order_index, exam_id, subject_id, exam:exams(name), subject:subjects(name, color), topics:study_resource_topics(id, name, target_count, order_index)"
      )
      .eq("id", resource.id)
      .single();

    setActionLoadingId(null);

    if (error || !data) {
      toast.error("Kaynak yüklenemedi: " + (error?.message ?? "bilinmeyen hata"));
      return;
    }

    setEditingResource(
      mapEditingResource(data as Parameters<typeof mapEditingResource>[0], {
        solvedTotal: resource.solvedTotal,
        correctTotal: resource.correctTotal,
        wrongTotal: resource.wrongTotal,
        completionPct: resource.completionPct,
      })
    );
    setModalOpen(true);
  };

  const handleCreated = (resource: StudyResource) => {
    setResources((prev) => [...prev, { ...resource, ...EMPTY_RESOURCE_PROGRESS }]);
    toast.success("Kaynak başarıyla eklendi!");
    router.refresh();
  };

  const handleUpdated = (resource: StudyResource) => {
    setResources((prev) =>
      prev.map((r) => (r.id === resource.id ? resource : r))
    );
    toast.success("Kaynak güncellendi!");
    router.refresh();
  };

  const handleDeleted = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
    toast.success("Kaynak silindi.");
    router.refresh();
  };

  const handleModalError = (message: string) => {
    toast.error(message);
  };

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#0d0d2b",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: "14px",
            fontWeight: 600,
          },
          success: {
            iconTheme: { primary: "#22c55e", secondary: "#0d0d2b" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#0d0d2b" },
          },
        }}
      />

      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#7B2FFF]/25 bg-[#7B2FFF]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#A78BFF]">
              <BookMarked className="h-3 w-3" />
              Kaynak Yönetimi
            </div>
            <h2 className="flex items-center gap-2 text-2xl font-black text-white sm:text-3xl">
              <Library className="h-7 w-7 text-[#A78BFF]" />
              Kaynak Takibi
            </h2>
            <p className="text-sm text-white/40">
              Kaynaklarınızı yönetin, ilerlemenizi takip edin
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7B2FFF] via-[#4F7CFF] to-[#00D4FF] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#7B2FFF]/25 transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Kaynak Ekle
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Kaynak"
            value={resources.length}
            icon={<BookMarked className="h-4 w-4" />}
          />
          <StatCard
            label="Toplam Soru"
            value={totalQuestions}
            icon={<Hash className="h-4 w-4" />}
          />
          <StatCard
            label="Çözülen"
            value={progressStats.solvedTotal}
            icon={<HelpCircle className="h-4 w-4" />}
          />
          <StatCard
            label="Doğru"
            value={progressStats.correctTotal}
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <StatCard
            label="Yanlış"
            value={progressStats.wrongTotal}
            icon={<XCircle className="h-4 w-4" />}
          />
          <StatCard
            label="Tamamlanma"
            value={`%${progressStats.completionPct}`}
            icon={<Percent className="h-4 w-4" />}
          />
        </div>

        <div className="flex flex-col gap-3 overflow-visible rounded-2xl border border-white/8 bg-[#0d0d2b]/40 p-4 sm:flex-row sm:items-end">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kaynak ara..."
              className="w-full rounded-xl border border-white/8 bg-white/[0.04] py-2.5 pl-10 pr-3 text-sm text-white placeholder-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2FFF]/40"
            />
          </div>
          <div className="min-w-[10rem] shrink-0 sm:w-44">
            <SearchableSelect
              label="Sınav"
              icon={<GraduationCap className="h-3.5 w-3.5" />}
              value={filterExamId}
              onChange={(v) => {
                setFilterExamId(v);
                setFilterSubjectId("");
              }}
              options={[
                { value: "", label: "Tüm sınavlar" },
                ...examOptions.map((e) => ({
                  value: String(e.id),
                  label: e.name,
                  group: examGroupFromName(e.name),
                })),
              ]}
              placeholder="Tüm sınavlar"
            />
          </div>
          <div className="min-w-[10rem] shrink-0 sm:w-44">
            <SearchableSelect
              label="Ders"
              icon={<BookOpen className="h-3.5 w-3.5" />}
              value={filterSubjectId}
              onChange={setFilterSubjectId}
              disabled={!filterExamId}
              options={[
                {
                  value: "",
                  label: filterExamId ? "Tüm dersler" : "Önce sınav seçin",
                },
                ...filterSubjects.map((s) => ({
                  value: String(s.id),
                  label: s.name,
                })),
              ]}
              placeholder={filterExamId ? "Tüm dersler" : "Önce sınav seçin"}
              emptyText="Ders bulunamadı"
            />
          </div>
        </div>

        {filteredResources.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-[#0d0d2b]/40 px-6 py-16 text-center">
            <Library className="mx-auto h-10 w-10 text-white/20" />
            <p className="mt-4 text-sm text-white/40">
              {resources.length === 0
                ? "Henüz kaynak yok, ilk kaynağını ekle"
                : "Arama kriterlerine uygun kaynak bulunamadı"}
            </p>
            {resources.length === 0 && (
              <button
                type="button"
                onClick={openAddModal}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#7B2FFF]/25 bg-[#7B2FFF]/10 px-4 py-2.5 text-sm font-semibold text-[#A78BFF] transition-colors hover:bg-[#7B2FFF]/20"
              >
                <Plus className="h-4 w-4" />
                İlk Kaynağını Ekle
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredResources.map((resource) => (
              <ResourceGridCard
                key={resource.id}
                resource={resource}
                onOpen={() => setDetailResource(resource)}
                onEdit={() => handleEdit(resource)}
                onDelete={() => setDeleteTarget(resource)}
                actionLoading={actionLoadingId === resource.id}
              />
            ))}
          </div>
        )}
      </div>

      <AddResourceModal
        open={modalOpen}
        onClose={closeModal}
        teacherId={teacherId}
        examOptions={examOptions}
        subjectOptions={subjectOptions}
        orderIndex={resources.length}
        editing={editingResource}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        onError={handleModalError}
      />

      <DeleteResourceModal
        open={deleteTarget != null}
        resource={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
        onError={handleModalError}
      />

      {detailResource && (
        <ResourceDetailModal
          resource={detailResource}
          onClose={() => setDetailResource(null)}
        />
      )}
    </>
  );
}
