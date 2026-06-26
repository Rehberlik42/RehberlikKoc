import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { GuidanceContent } from "@/lib/guidance";
import {
  examBadgeLabel,
  fallbackCoverStyle,
  typeMeta,
} from "@/lib/guidance";
import BlogBody from "../_components/BlogBody";

export const dynamic = "force-dynamic";

export default async function GuidanceBlogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contentId = Number(id);
  if (!Number.isFinite(contentId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: raw } = await supabase
    .from("guidance_contents")
    .select(
      "id, title, description, content_type, url, body, target_exam, cover_image_url, is_active, created_at"
    )
    .eq("id", contentId)
    .eq("is_active", true)
    .maybeSingle();

  if (!raw) notFound();
  const item = raw as unknown as GuidanceContent;

  if (item.content_type !== "blog") {
    redirect("/dashboard/student/guidance");
  }

  const meta = typeMeta("blog");
  const exam = examBadgeLabel(item.target_exam);
  const date = new Date(item.created_at).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <Link
        href="/dashboard/student/guidance"
        className="inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Rehberlik Merkezi
      </Link>

      {/* Hero kapak */}
      <div className="relative rounded-3xl border border-[var(--border)] overflow-hidden">
        <div className="relative aspect-[21/9] min-h-[160px]">
          {item.cover_image_url ? (
            <Image
              src={item.cover_image_url}
              alt=""
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 768px"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: fallbackCoverStyle("blog") }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/70 to-transparent" />
        </div>
        <div className="relative px-6 pb-6 -mt-16">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest"
              style={{
                background: `${meta.accent}18`,
                borderColor: `${meta.accent}45`,
                color: meta.accent,
              }}
            >
              <BookOpen className="w-3 h-3" />
              Blog
            </span>
            {exam && (
              <span className="px-2 py-0.5 rounded-full bg-white/10 border border-[var(--border)] text-[var(--text-secondary)] text-[10px] font-bold">
                {exam}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[var(--text-muted)] text-[11px]">
              <Calendar className="w-3 h-3" />
              {date}
            </span>
          </div>
          <h1 className="text-[var(--text-primary)] text-2xl sm:text-4xl font-black leading-tight">
            {item.title}
          </h1>
          {item.description && (
            <p className="text-[var(--text-secondary)] text-base mt-3 leading-relaxed max-w-2xl">
              {item.description}
            </p>
          )}
        </div>
      </div>

      {/* Okuma alanı — geniş padding, odak modu */}
      <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/40 backdrop-blur-md px-6 sm:px-10 py-8 sm:py-10">
        {item.body ? (
          <BlogBody body={item.body} />
        ) : (
          <p className="text-[var(--text-secondary)]">İçerik henüz eklenmemiş.</p>
        )}
      </article>

      <div className="flex justify-center">
        <Link
          href="/dashboard/student/guidance"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-[var(--text-primary)] text-sm font-semibold shadow-lg shadow-[var(--primary)]/25 hover:scale-[1.02] transition-transform"
        >
          Diğer içeriklere göz at
        </Link>
      </div>
    </div>
  );
}
