"use client";

import { useState, useMemo } from "react";
import {
  Bot,
  Sparkles,
  Filter,
  PlayCircle,
  BookOpen,
  FileText,
  Globe,
  TrendingDown,
  Activity,
  Inbox,
} from "lucide-react";
import ResourceCard from "./ResourceCard";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SubjectInsight {
  subjectId: number;
  subjectName: string;
  examName: string | null;
  color: string | null;
  reason: "low_net" | "in_progress";
  avgNet: number | null;
}

export type ResourceType = "youtube" | "book" | "document" | "website";

export interface ResourceItem {
  id: number;
  title: string;
  type: ResourceType;
  url: string;
  thumbnail_url: string | null;
  description: string | null;
  view_count: number;
  subject_id: number | null;
  topic_id: number | null;
  subject: {
    id: number;
    name: string;
    color: string | null;
    exam: { name: string } | null;
  } | null;
  topic: { id: number; name: string } | null;
}

interface Props {
  targetSubjects: SubjectInsight[];
  targetedResources: ResourceItem[];
  allResources: ResourceItem[];
}

// ─── Type icon helper ─────────────────────────────────────────────────────────
const TYPE_META: Record<
  ResourceType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  youtube: { label: "Video", icon: <PlayCircle className="w-3.5 h-3.5" />, color: "#ef4444" },
  book: { label: "Kitap", icon: <BookOpen className="w-3.5 h-3.5" />, color: "#7B2FFF" },
  document: { label: "PDF", icon: <FileText className="w-3.5 h-3.5" />, color: "#4F7CFF" },
  website: { label: "Site", icon: <Globe className="w-3.5 h-3.5" />, color: "#00D4FF" },
};

// ─── DORA Welcome Card ────────────────────────────────────────────────────────
function DoraWelcome({
  hasTargetedSubjects,
  countTargeted,
  weakestSubject,
}: {
  hasTargetedSubjects: boolean;
  countTargeted: number;
  weakestSubject: SubjectInsight | null;
}) {
  return (
    <div className="relative rounded-3xl border border-[var(--primary)]/30 bg-gradient-to-br from-[var(--surface)] to-[var(--bg)] p-6 md:p-8 overflow-hidden">
      {/* Glow blobs */}
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[var(--primary)]/20 blur-[80px] pointer-events-none" />
      <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-[var(--primary-2)]/15 blur-[60px] pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* DORA Avatar */}
        <div className="shrink-0 relative">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--primary)]/40 to-[var(--primary-2)]/20 border border-[var(--primary)]/40 flex items-center justify-center shadow-2xl shadow-[var(--primary)]/30">
            <Bot className="w-10 h-10 text-[var(--accent)]" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[var(--primary)]" />
          </span>
        </div>

        {/* Mesaj */}
        <div className="flex-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/25 text-[var(--accent)] text-[10px] font-bold uppercase tracking-widest mb-3">
            <Sparkles className="w-3 h-3" />
            DORA · Akıllı Öneriler
          </div>

          {hasTargetedSubjects ? (
            <>
              <p className="text-[var(--text-primary)] text-base sm:text-lg font-semibold leading-relaxed">
                Son denemelerindeki ve konu çalışmalarındaki eksiklerini analiz
                ettim. İşte netlerini artıracak{" "}
                <span className="text-[var(--accent)]">özel kaynakların!</span>
              </p>
              {weakestSubject && (
                <p className="text-[var(--text-secondary)] text-sm mt-2 flex items-center gap-1.5 justify-center sm:justify-start">
                  <TrendingDown className="w-3.5 h-3.5 text-orange-400" />
                  En çok dikkat etmen gereken ders:{" "}
                  <span className="text-[var(--text-primary)] font-semibold ml-1">
                    {weakestSubject.subjectName}
                    {weakestSubject.avgNet !== null &&
                      ` (ort. ${weakestSubject.avgNet} net)`}
                  </span>
                </p>
              )}
              <p className="text-[var(--text-muted)] text-xs mt-3">
                {countTargeted} kişiselleştirilmiş kaynak hazırladım — aşağıda
                ders bazında filtreleyebilirsin.
              </p>
            </>
          ) : (
            <>
              <p className="text-[var(--text-primary)] text-base sm:text-lg font-semibold leading-relaxed">
                Henüz seni analiz edebileceğim kadar deneme veya çalışma
                kaydetmedin. Ama merak etme,{" "}
                <span className="text-[var(--accent)]">popüler kaynakları</span>{" "}
                aşağıda senin için seçtim!
              </p>
              <p className="text-[var(--text-muted)] text-xs mt-3">
                İlk denemeni kaydettiğinde, ben de zayıf konularını tespit edip
                kişiselleştirilmiş öneriler getireceğim.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Weakness Strip ───────────────────────────────────────────────────────────
function WeaknessStrip({ subjects }: { subjects: SubjectInsight[] }) {
  if (subjects.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 backdrop-blur-md p-5">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-orange-400" />
        <p className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest">
          Odaklanman Gereken Dersler
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {subjects.map((s) => (
          <div
            key={s.subjectId}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]"
          >
            <span
              className="w-1.5 h-5 rounded-full"
              style={{ background: s.color ?? "#4F7CFF" }}
            />
            <div className="flex flex-col">
              <span className="text-[var(--text-primary)] text-xs font-semibold leading-none">
                {s.subjectName}
              </span>
              <span className="text-[var(--text-muted)] text-[10px] mt-0.5">
                {s.reason === "low_net" && s.avgNet !== null
                  ? `Ort. ${s.avgNet} net`
                  : "Devam ediyor"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Client ───────────────────────────────────────────────────────────────────
export default function RecommendationsClient({
  targetSubjects,
  targetedResources,
  allResources,
}: Props) {
  const hasTargeted = targetedResources.length > 0;
  const [scope, setScope] = useState<"recommended" | "all">(
    hasTargeted ? "recommended" : "all"
  );
  const [typeFilter, setTypeFilter] = useState<ResourceType | "all">("all");
  const [subjectFilter, setSubjectFilter] = useState<number | "all">("all");

  const baseList = scope === "recommended" ? targetedResources : allResources;

  // Filter
  const filtered = useMemo(() => {
    return baseList.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (subjectFilter !== "all" && r.subject_id !== subjectFilter) return false;
      return true;
    });
  }, [baseList, typeFilter, subjectFilter]);

  // Unique subjects in current scope (for the subject chip row)
  const subjectsInScope = useMemo(() => {
    const map = new Map<
      number,
      { id: number; name: string; color: string | null }
    >();
    for (const r of baseList) {
      if (!r.subject) continue;
      if (!map.has(r.subject.id)) {
        map.set(r.subject.id, {
          id: r.subject.id,
          name: r.subject.name,
          color: r.subject.color,
        });
      }
    }
    return Array.from(map.values());
  }, [baseList]);

  const weakestSubject = targetSubjects.find((s) => s.reason === "low_net") ?? null;

  return (
    <>
      {/* DORA Welcome */}
      <DoraWelcome
        hasTargetedSubjects={hasTargeted}
        countTargeted={targetedResources.length}
        weakestSubject={weakestSubject}
      />

      {/* Weakness strip */}
      <WeaknessStrip subjects={targetSubjects} />

      {/* Controls */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 backdrop-blur-md p-5 space-y-4">
        {/* Scope toggle */}
        {hasTargeted && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-[var(--text-secondary)] text-[11px] font-bold uppercase tracking-wider">
                Kapsam
              </span>
            </div>
            <ScopePill
              active={scope === "recommended"}
              onClick={() => setScope("recommended")}
            >
              <Sparkles className="w-3 h-3" />
              Bana Özel
            </ScopePill>
            <ScopePill
              active={scope === "all"}
              onClick={() => setScope("all")}
            >
              Tüm Kaynaklar
            </ScopePill>
          </div>
        )}

        {/* Type filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[var(--text-secondary)] text-[11px] font-bold uppercase tracking-wider mr-2">
            Tür
          </span>
          <TypePill
            active={typeFilter === "all"}
            onClick={() => setTypeFilter("all")}
          >
            Hepsi
          </TypePill>
          {(Object.keys(TYPE_META) as ResourceType[]).map((t) => (
            <TypePill
              key={t}
              active={typeFilter === t}
              onClick={() => setTypeFilter(typeFilter === t ? "all" : t)}
              color={TYPE_META[t].color}
            >
              {TYPE_META[t].icon}
              {TYPE_META[t].label}
            </TypePill>
          ))}
        </div>

        {/* Subject filter (chips) */}
        {subjectsInScope.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[var(--text-secondary)] text-[11px] font-bold uppercase tracking-wider mr-2">
              Ders
            </span>
            <SubjectPill
              active={subjectFilter === "all"}
              onClick={() => setSubjectFilter("all")}
              color={null}
            >
              Tüm Dersler
            </SubjectPill>
            {subjectsInScope.map((s) => (
              <SubjectPill
                key={s.id}
                active={subjectFilter === s.id}
                onClick={() =>
                  setSubjectFilter(subjectFilter === s.id ? "all" : s.id)
                }
                color={s.color}
              >
                {s.name}
              </SubjectPill>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyGrid />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}
    </>
  );
}

// ─── Filter Pills ─────────────────────────────────────────────────────────────
function ScopePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
        active
          ? "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-[var(--text-primary)] shadow-md shadow-[var(--primary)]/30"
          : "bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
      }`}
    >
      {children}
    </button>
  );
}

function TypePill({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-200 border ${
        active
          ? "text-[var(--text-primary)]"
          : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/6 hover:text-[var(--text-primary)]"
      }`}
      style={
        active
          ? {
              background: color
                ? `linear-gradient(135deg, ${color}30, ${color}15)`
                : "rgba(123,47,255,0.2)",
              borderColor: color ? `${color}55` : "rgba(123,47,255,0.4)",
              color: color ?? undefined,
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}

function SubjectPill({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: string | null;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 border ${
        active
          ? "bg-white/10 border-[var(--border)] text-[var(--text-primary)]"
          : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-white/6 hover:text-[var(--text-primary)]"
      }`}
    >
      {color !== null && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
        />
      )}
      {children}
    </button>
  );
}

// ─── Empty grid ───────────────────────────────────────────────────────────────
function EmptyGrid() {
  return (
    <div className="rounded-2xl border border-[var(--border)] border-dashed bg-white/2 px-6 py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center mx-auto mb-3">
        <Inbox className="w-5 h-5 text-[var(--text-muted)]" />
      </div>
      <p className="text-[var(--text-secondary)] text-sm font-semibold mb-1">
        Bu filtrelerle eşleşen kaynak yok
      </p>
      <p className="text-[var(--text-muted)] text-xs">
        Farklı bir ders veya tür seçmeyi dene.
      </p>
    </div>
  );
}
