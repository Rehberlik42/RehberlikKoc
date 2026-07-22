"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/get-current-user";
import {
  addDays,
  toISODate,
} from "@/app/dashboard/student/program/_components/plan-shared";

type ReviewResult = "dogru" | "yanlis";

export async function submitMistakeReview(params: {
  entryId: number;
  reviewId: number;
  result: ReviewResult;
  convertToBilgiEksigi?: boolean;
  reflectionNote?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { entryId, reviewId, result, convertToBilgiEksigi, reflectionNote } =
    params;

  const { user, supabase } = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Oturum bulunamadı." };
  }

  const { data: entry, error: entryFetchError } = await supabase
    .from("mistake_entries")
    .select(
      "id, student_id, cause_type, stage, next_review_date, reflection_note"
    )
    .eq("id", entryId)
    .single();

  if (entryFetchError || !entry) {
    return { success: false, error: "Kayıt bulunamadı." };
  }

  if (entry.student_id !== user.id) {
    return { success: false, error: "Bu kayda erişim yetkin yok." };
  }

  const causeType = entry.cause_type as "dikkatsizlik" | "bilgi_eksigi";
  const stage = Number(entry.stage ?? 0);

  if (
    causeType === "dikkatsizlik" &&
    result === "yanlis" &&
    convertToBilgiEksigi === undefined
  ) {
    return {
      success: false,
      error: "convertToBilgiEksigi belirtilmeli",
    };
  }

  if (
    causeType === "dikkatsizlik" &&
    result === "yanlis" &&
    convertToBilgiEksigi === true &&
    !reflectionNote?.trim()
  ) {
    return { success: false, error: "Not gerekli" };
  }

  const nowIso = new Date().toISOString();
  const nextIn21 = toISODate(addDays(new Date(), 21));

  const { error: reviewUpdateError } = await supabase
    .from("mistake_reviews")
    .update({ result, reviewed_at: nowIso })
    .eq("id", reviewId)
    .eq("mistake_entry_id", entryId);

  if (reviewUpdateError) {
    return { success: false, error: reviewUpdateError.message };
  }

  // ── Dikkatsizlik + Doğru → tamamlandı ──────────────────────────────────
  if (causeType === "dikkatsizlik" && result === "dogru") {
    const { error } = await supabase
      .from("mistake_entries")
      .update({ status: "tamamlandi", updated_at: nowIso })
      .eq("id", entryId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/student");
    return { success: true };
  }

  // ── Dikkatsizlik + Yanlış + convert: false → sarı kalır, +21 gün ───────
  if (
    causeType === "dikkatsizlik" &&
    result === "yanlis" &&
    convertToBilgiEksigi === false
  ) {
    const { error: updateError } = await supabase
      .from("mistake_entries")
      .update({
        stage: 0,
        next_review_date: nextIn21,
        updated_at: nowIso,
      })
      .eq("id", entryId);

    if (updateError) return { success: false, error: updateError.message };

    const { error: insertError } = await supabase.from("mistake_reviews").insert({
      mistake_entry_id: entryId,
      review_stage: 1,
      scheduled_date: nextIn21,
      result: null,
    });

    if (insertError) return { success: false, error: insertError.message };
    revalidatePath("/dashboard/student");
    return { success: true };
  }

  // ── Dikkatsizlik + Yanlış + convert: true → bilgi eksiğine dönüş ───────
  if (
    causeType === "dikkatsizlik" &&
    result === "yanlis" &&
    convertToBilgiEksigi === true
  ) {
    const { error: updateError } = await supabase
      .from("mistake_entries")
      .update({
        cause_type: "bilgi_eksigi",
        reflection_note: reflectionNote!.trim(),
        stage: 0,
        next_review_date: nextIn21,
        updated_at: nowIso,
      })
      .eq("id", entryId);

    if (updateError) return { success: false, error: updateError.message };

    const { error: insertError } = await supabase.from("mistake_reviews").insert({
      mistake_entry_id: entryId,
      review_stage: 1,
      scheduled_date: nextIn21,
      result: null,
    });

    if (insertError) return { success: false, error: insertError.message };
    revalidatePath("/dashboard/student");
    return { success: true };
  }

  // ── Bilgi eksiği + Doğru + stage 0 → stage 1, +21, review_stage 2 ──────
  if (causeType === "bilgi_eksigi" && result === "dogru" && stage === 0) {
    const { error: updateError } = await supabase
      .from("mistake_entries")
      .update({
        stage: 1,
        next_review_date: nextIn21,
        updated_at: nowIso,
      })
      .eq("id", entryId);

    if (updateError) return { success: false, error: updateError.message };

    const { error: insertError } = await supabase.from("mistake_reviews").insert({
      mistake_entry_id: entryId,
      review_stage: 2,
      scheduled_date: nextIn21,
      result: null,
    });

    if (insertError) return { success: false, error: insertError.message };
    revalidatePath("/dashboard/student");
    return { success: true };
  }

  // ── Bilgi eksiği + Doğru + stage 1 → tamamlandı, stage 2 ───────────────
  if (causeType === "bilgi_eksigi" && result === "dogru" && stage === 1) {
    const { error } = await supabase
      .from("mistake_entries")
      .update({
        status: "tamamlandi",
        stage: 2,
        updated_at: nowIso,
      })
      .eq("id", entryId);

    if (error) return { success: false, error: error.message };
    revalidatePath("/dashboard/student");
    return { success: true };
  }

  // ── Bilgi eksiği + Yanlış → tam sıfırlama ──────────────────────────────
  if (causeType === "bilgi_eksigi" && result === "yanlis") {
    const { error: updateError } = await supabase
      .from("mistake_entries")
      .update({
        stage: 0,
        next_review_date: nextIn21,
        updated_at: nowIso,
      })
      .eq("id", entryId);

    if (updateError) return { success: false, error: updateError.message };

    const { error: insertError } = await supabase.from("mistake_reviews").insert({
      mistake_entry_id: entryId,
      review_stage: 1,
      scheduled_date: nextIn21,
      result: null,
    });

    if (insertError) return { success: false, error: insertError.message };
    revalidatePath("/dashboard/student");
    return { success: true };
  }

  // Beklenmeyen kombinasyon (örn. bilgi_eksigi + dogru + stage>=2)
  revalidatePath("/dashboard/student");
  return {
    success: false,
    error: `İşlenemeyen durum: ${causeType} / ${result} / stage ${stage}`,
  };
}
