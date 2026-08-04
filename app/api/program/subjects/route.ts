import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Haftalık program için ders + konu ağacı.
 * page.tsx payload'ından ayrıldı — yalnızca program sekmesi açılınca istenir.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("subjects")
      .select(
        "id, name, color, order_index, exam_id, exam:exams(name), topics(id, name, order_index, parent_id)"
      )
      .order("order_index");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("Error in GET /api/program/subjects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
