"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Loader2,
  MessageSquarePlus,
  Send,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type DoraConversationListItem = {
  id: number;
  title: string | null;
  updated_at: string;
  created_at: string;
};

export type DoraMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

const SUGGESTIONS = [
  "Bugün nereden başlamalıyım?",
  "En çok hangi konuda zorlanıyorum?",
  "Bu haftaki programımı nasıl dengeleyebilirim?",
];

type Props = {
  initialConversations: DoraConversationListItem[];
  initialConversationId: number | null;
  initialMessages: DoraMessage[];
};

export default function DoraChatClient({
  initialConversations,
  initialConversationId,
  initialMessages,
}: Props) {
  const [conversations, setConversations] =
    useState<DoraConversationListItem[]>(initialConversations);
  const [activeId, setActiveId] = useState<number | null>(initialConversationId);
  const [messages, setMessages] = useState<DoraMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const optimisticIdRef = useRef(-1);
  const supabase = createClient();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const loadConversation = async (id: number) => {
    setLoadingThread(true);
    setError(null);
    setActiveId(id);
    const { data, error: fetchError } = await supabase
      .from("dora_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    setLoadingThread(false);
    if (fetchError) {
      setError("Sohbet yüklenemedi.");
      setMessages([]);
      return;
    }
    setMessages((data ?? []) as DoraMessage[]);
  };

  const startNewChat = () => {
    setActiveId(null);
    setMessages([]);
    setDraft("");
    setError(null);
  };

  const sendMessage = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;

    setSending(true);
    setError(null);
    setDraft("");

    optimisticIdRef.current -= 1;
    const optimistic: DoraMessage = {
      id: optimisticIdRef.current,
      role: "user",
      content: message,
      created_at: new Date(0).toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch("/api/dora/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeId,
          message,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        conversationId?: number;
        userMessage?: DoraMessage;
        assistantMessage?: DoraMessage;
      };

      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setError(data.error ?? "Mesaj gönderilemedi.");
        setDraft(message);
        return;
      }

      const conversationId = data.conversationId ?? activeId;
      if (conversationId != null && conversationId !== activeId) {
        setActiveId(conversationId);
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === conversationId);
          if (exists) {
            return prev
              .map((c) =>
                c.id === conversationId
                  ? {
                      ...c,
                      updated_at: new Date().toISOString(),
                      title: c.title ?? message.slice(0, 48),
                    }
                  : c
              )
              .sort(
                (a, b) =>
                  new Date(b.updated_at).getTime() -
                  new Date(a.updated_at).getTime()
              );
          }
          return [
            {
              id: conversationId,
              title: message.slice(0, 48),
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
            ...prev,
          ];
        });
      } else if (conversationId != null) {
        setConversations((prev) =>
          prev
            .map((c) =>
              c.id === conversationId
                ? { ...c, updated_at: new Date().toISOString() }
                : c
            )
            .sort(
              (a, b) =>
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime()
            )
        );
      }

      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => m.id !== optimistic.id);
        const next = [...withoutOptimistic];
        if (data.userMessage) next.push(data.userMessage);
        if (data.assistantMessage) next.push(data.assistantMessage);
        return next;
      });

      if (data.error && !data.assistantMessage) {
        setError(data.error);
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setError("Bağlantı hatası. Tekrar dener misin?");
      setDraft(message);
    } finally {
      setSending(false);
    }
  };

  const empty = messages.length === 0 && !loadingThread;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
      {/* Geçmiş */}
      <aside className="flex max-h-40 shrink-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 lg:max-h-none lg:w-64">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Geçmiş Sohbetler
          </p>
          <button
            type="button"
            onClick={startNewChat}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-2 py-1 text-[10px] font-bold text-[var(--accent)] transition-colors hover:bg-[var(--primary)]/20"
          >
            <MessageSquarePlus className="h-3 w-3" />
            Yeni Sohbet
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto p-2 lg:flex-col lg:overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-2 py-3 text-xs text-[var(--text-muted)]">
              Henüz sohbet yok.
            </p>
          ) : (
            conversations.map((c) => {
              const active = c.id === activeId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => void loadConversation(c.id)}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition-colors lg:w-full ${
                    active
                      ? "border-[var(--primary)]/40 bg-[var(--primary)]/15 text-[var(--text-primary)]"
                      : "border-transparent bg-[var(--surface-2)]/60 text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="line-clamp-2 font-semibold">
                    {c.title?.trim() || "Adsız sohbet"}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">
                    {new Date(c.updated_at).toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Chat */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/15">
            <Bot className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">DORA</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Çalışma arkadaşın
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4">
          {loadingThread ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
              Sohbet yükleniyor…
            </div>
          ) : empty ? (
            <div className="mx-auto flex max-w-lg flex-col items-center px-2 py-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--primary)]/30 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary-2)]/10">
                <Sparkles className="h-6 w-6 text-[var(--accent)]" />
              </div>
              <p className="text-base font-bold text-[var(--text-primary)]">
                Merhaba, ben DORA
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                Denemelerindeki zayıf konulara, bu haftaki programına ve
                kaynaklarına bakarak sana özel öneriler verebilirim. Bir soru
                sor veya aşağıdaki örneklerden birine dokun.
              </p>
              <div className="mt-5 flex w-full flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={sending}
                    onClick={() => void sendMessage(s)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 px-3 py-2.5 text-left text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)]/35 hover:text-[var(--text-primary)] disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[75%] ${
                      isUser
                        ? "rounded-br-md bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] text-white"
                        : "rounded-bl-md border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)]"
                    }`}
                  >
                    {!isUser && (
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                        DORA
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              );
            })
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-sm text-[var(--text-muted)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
                DORA yazıyor…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="border-t border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-400">
            {error}
          </p>
        )}

        <form
          className="flex items-end gap-2 border-t border-[var(--border)] p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(draft);
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(draft);
              }
            }}
            rows={1}
            placeholder="DORA'ya bir şey sor…"
            disabled={sending}
            className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]/50 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] text-white shadow-lg shadow-[var(--primary)]/25 transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Gönder"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
