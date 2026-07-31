import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/get-current-user";
import {
  buildDoraAcademicContext,
  buildDoraSystemPrompt,
} from "@/lib/dora/context";

export const dynamic = "force-dynamic";

type ChatBody = {
  conversationId?: number | null;
  message?: string;
};

type DoraMessageRow = {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type GeminiPart = { text: string };
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

const MAX_HISTORY = 24;
const FRIENDLY_ERROR =
  "Şu an cevap veremiyorum. Biraz sonra tekrar dener misin?";

function titleFromMessage(message: string): string {
  const cleaned = message.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Yeni sohbet";
  const words = cleaned.split(" ").slice(0, 8).join(" ");
  return words.length > 48 ? `${words.slice(0, 45)}…` : words;
}

function extractGeminiText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const content = (candidates[0] as { content?: { parts?: unknown } })?.content;
  const parts = content?.parts;
  if (!Array.isArray(parts)) return null;
  const texts = parts
    .map((p) =>
      p && typeof p === "object" && typeof (p as { text?: unknown }).text === "string"
        ? (p as { text: string }).text
        : ""
    )
    .filter(Boolean);
  const joined = texts.join("\n").trim();
  return joined || null;
}

export async function POST(request: Request) {
  try {
    const { user, error: authError, supabase } = await getCurrentUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "student") {
      return NextResponse.json(
        { error: "Bu özellik yalnızca öğrenciler içindir." },
        { status: 403 }
      );
    }

    let body: ChatBody;
    try {
      body = (await request.json()) as ChatBody;
    } catch {
      return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json(
        { error: "Mesaj boş olamaz." },
        { status: 400 }
      );
    }
    if (message.length > 4000) {
      return NextResponse.json(
        { error: "Mesaj çok uzun. Lütfen kısalt." },
        { status: 400 }
      );
    }

    let conversationId =
      typeof body.conversationId === "number" && Number.isFinite(body.conversationId)
        ? body.conversationId
        : null;

    // Mevcut konuşma sahipliğini doğrula
    if (conversationId != null) {
      const { data: owned, error: ownedError } = await supabase
        .from("dora_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("student_id", user.id)
        .maybeSingle();

      if (ownedError || !owned) {
        return NextResponse.json(
          { error: "Konuşma bulunamadı." },
          { status: 404 }
        );
      }
    } else {
      const { data: created, error: createError } = await supabase
        .from("dora_conversations")
        .insert({
          student_id: user.id,
          title: titleFromMessage(message),
        })
        .select("id")
        .single();

      if (createError || !created) {
        return NextResponse.json(
          { error: "Sohbet başlatılamadı." },
          { status: 500 }
        );
      }
      conversationId = created.id as number;
    }

    // Önceki mesajlar (Gemini history)
    const { data: historyRows, error: historyError } = await supabase
      .from("dora_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(MAX_HISTORY);

    if (historyError) {
      return NextResponse.json(
        { error: "Sohbet geçmişi okunamadı." },
        { status: 500 }
      );
    }

    const history = (historyRows ?? []) as DoraMessageRow[];

    // Kullanıcı mesajını kaydet
    const { data: userMsg, error: userMsgError } = await supabase
      .from("dora_messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: message,
      })
      .select("id, role, content, created_at")
      .single();

    if (userMsgError || !userMsg) {
      return NextResponse.json(
        { error: "Mesaj kaydedilemedi." },
        { status: 500 }
      );
    }

    // Akademik bağlam — anamnez / hassas veri YOK (lib/dora/context.ts)
    const academic = await buildDoraAcademicContext(supabase, user.id);
    const systemPrompt = buildDoraSystemPrompt(academic.promptBlock);

    const contents: GeminiContent[] = [
      ...history.map((row) => ({
        role: (row.role === "assistant" ? "model" : "user") as "user" | "model",
        parts: [{ text: row.content }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[dora/chat] GEMINI_API_KEY tanımlı değil");
      return NextResponse.json(
        {
          error: FRIENDLY_ERROR,
          conversationId,
          userMessage: userMsg,
        },
        { status: 503 }
      );
    }

    let assistantText: string | null = null;
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
          }),
        }
      );

      const geminiJson: unknown = await geminiRes.json().catch(() => null);

      if (!geminiRes.ok) {
        console.error("[dora/chat] Gemini HTTP", geminiRes.status, geminiJson);
        return NextResponse.json(
          {
            error:
              geminiRes.status === 429
                ? "Şu an çok yoğunum. Birkaç dakika sonra tekrar dener misin?"
                : FRIENDLY_ERROR,
            conversationId,
            userMessage: userMsg,
          },
          { status: 502 }
        );
      }

      assistantText = extractGeminiText(geminiJson);
      if (!assistantText) {
        console.error("[dora/chat] Gemini boş cevap", geminiJson);
        return NextResponse.json(
          {
            error: FRIENDLY_ERROR,
            conversationId,
            userMessage: userMsg,
          },
          { status: 502 }
        );
      }
    } catch (err) {
      console.error("[dora/chat] Gemini fetch error", err);
      return NextResponse.json(
        {
          error: FRIENDLY_ERROR,
          conversationId,
          userMessage: userMsg,
        },
        { status: 502 }
      );
    }

    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from("dora_messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: assistantText,
      })
      .select("id, role, content, created_at")
      .single();

    if (assistantMsgError || !assistantMsg) {
      return NextResponse.json(
        {
          error: "Cevap alındı ama kaydedilemedi.",
          conversationId,
          userMessage: userMsg,
          assistantMessage: {
            id: -1,
            role: "assistant" as const,
            content: assistantText,
            created_at: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from("dora_conversations")
      .update({ updated_at: nowIso })
      .eq("id", conversationId)
      .eq("student_id", user.id);

    // İlk mesajsa title boş kalmış olabilir — güvence
    if (history.length === 0) {
      await supabase
        .from("dora_conversations")
        .update({ title: titleFromMessage(message) })
        .eq("id", conversationId)
        .eq("student_id", user.id)
        .is("title", null);
    }

    return NextResponse.json({
      conversationId,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    });
  } catch (error) {
    console.error("[dora/chat] unexpected", error);
    return NextResponse.json({ error: FRIENDLY_ERROR }, { status: 500 });
  }
}
