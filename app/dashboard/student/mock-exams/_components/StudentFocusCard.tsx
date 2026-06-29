"use client";

import { Sparkles, Target } from "lucide-react";
import {
  priorityLevelColor,
  type FocusItem,
  type FocusRecommendations,
} from "@/app/dashboard/teacher/students/[id]/_components/exam-analysis-utils";

interface Props {
  recommendations: FocusRecommendations | null;
  loading: boolean;
}

export function studentSentence(item: FocusItem): string {
  const { level, trend } = item.priority;

  if (level === "critical" && trend === "worsening") {
    return "Son denemelerde seni en çok zorlayan konu bu ve maalesef kötüye gidiyor. Bu hafta buna ağırlık ver — düzelteceksin. 💪";
  }
  if (level === "critical" && trend === "stable") {
    return "Bu konu sürekli karşına çıkıyor. Bu hafta birkaç saat ayır, kökünü çöz.";
  }
  if (level === "critical" && trend === "improving") {
    return "Hâlâ zorlanıyorsun ama düzelmeye başladın! Biraz daha üstüne git, oturacak.";
  }
  if (level === "secondary" && trend === "worsening") {
    return "Bu konuda son zamanlarda hata artıyor. Küçük bir tekrarla toparlarsın.";
  }
  if (level === "secondary" && trend === "improving") {
    return "İyi gidiyorsun bu konuda — birkaç soru daha çöz, tam oturt. 👍";
  }
  if (level === "secondary") {
    return "Ara ara takıldığın bir konu. Fırsat buldukça tekrar et.";
  }
  return "Hafif eksiğin var, gözden kaçırma.";
}

function FocusItemRow({ item }: { item: FocusItem }) {
  const levelColor = priorityLevelColor(item.priority.level);
  const subjectColor = item.color ?? "#4F7CFF";

  return (
    <div className="flex gap-3 rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface-2)]/90 to-[var(--primary)]/5 p-3.5">
      <span
        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: levelColor }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {item.priority.topicName}
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: subjectColor }}
              aria-hidden
            />
            {item.subjectName}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
          {studentSentence(item)}
        </p>
      </div>
      <span className="shrink-0 self-start rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--text-muted)]">
        Son {item.priority.examsCount} denemenin {item.priority.hitCount}&apos;ünde
      </span>
    </div>
  );
}

function FocusSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60"
        />
      ))}
    </div>
  );
}

export default function StudentFocusCard({ recommendations, loading }: Props) {
  return (
    <div className="pdf-export-hide print-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--primary)]/25 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary-2)]/10">
          <Target className="h-4 w-4 text-[var(--accent)]" />
        </div>
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-primary)]">
            🎯 Bu Hafta Neye Odaklan?
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)] opacity-80" />
          </h3>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            Denemelerine göre senin için öncelikli konular
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">Son 5 deneme kapsamında</p>
        </div>
      </div>

      {loading ? (
        <FocusSkeleton />
      ) : !recommendations?.hasData ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)]/40 px-4 py-6 text-center text-sm leading-relaxed text-[var(--text-muted)]">
          Zayıf konularını işaretledikçe burada sana özel öneriler çıkacak. Deneme girişinde
          yanlış yaptığın konuları seç.
        </p>
      ) : (
        <div className="space-y-2.5">
          {recommendations.top3.map((item) => (
            <FocusItemRow key={`${item.subjectId}-${item.priority.topicId}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
