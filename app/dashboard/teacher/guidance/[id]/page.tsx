import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { GuidanceContent } from "@/lib/guidance";
import BlogArticle from "@/app/dashboard/student/guidance/_components/BlogArticle";

export const dynamic = "force-dynamic";

export default async function TeacherGuidanceBlogPage({
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
    redirect("/dashboard/teacher/guidance");
  }

  return <BlogArticle item={item} backHref="/dashboard/teacher/guidance" />;
}
