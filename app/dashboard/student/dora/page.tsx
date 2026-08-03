import { redirect } from "next/navigation";
import { Bot, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/get-current-user";
import DoraChatClient, {
  type DoraConversationListItem,
  type DoraMessage,
} from "./_components/DoraChatClient";

export const dynamic = "force-dynamic";

export default async function StudentDoraPage() {
  const { user, supabase } = await getCurrentUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student") {
    redirect("/dashboard");
  }

  const { data: conversationsRaw } = await supabase
    .from("dora_conversations")
    .select("id, title, updated_at, created_at")
    .eq("student_id", user.id)
    .order("updated_at", { ascending: false });

  const conversations = (conversationsRaw ?? []) as DoraConversationListItem[];
  const initialConversationId = conversations[0]?.id ?? null;

  let initialMessages: DoraMessage[] = [];
  if (initialConversationId != null) {
    const { data: messagesRaw } = await supabase
      .from("dora_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", initialConversationId)
      .order("created_at", { ascending: true });
    initialMessages = (messagesRaw ?? []) as DoraMessage[];
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7.5rem)] max-w-6xl flex-col gap-4">
      <div className="shrink-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/25 bg-[var(--primary)]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
            <Sparkles className="h-3 w-3" />
            AI Asistan
          </div>
          <span className="inline-flex items-center rounded-full border border-amber-500/35 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">
            Beta
          </span>
        </div>
        <h2 className="flex flex-wrap items-center gap-2 text-2xl font-black text-[var(--text-primary)] sm:text-3xl">
          <Bot className="h-7 w-7 text-[var(--accent)]" />
          DORA ile Konuş
        </h2>
        <p className="max-w-2xl text-sm text-[var(--text-muted)]">
          Çalışma planın, zayıf konuların ve kaynakların hakkında samimi
          tavsiyeler — DORA yanında.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-amber-400/90">
          Beta sürüm: kullanım hakkımızdaki token miktarı sınırlı. Yoğun
          dönemlerde cevap gecikebilir veya kısa süre kullanılamayabilir —
          kısa ve odaklı sorular sorman yardımcı olur.
        </p>
      </div>

      <DoraChatClient
        initialConversations={conversations}
        initialConversationId={initialConversationId}
        initialMessages={initialMessages}
      />
    </div>
  );
}
