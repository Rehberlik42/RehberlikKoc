"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, CheckCheck, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NotificationRow {
  id: number;
  type: string;
  title: string;
  body: string | null;
  appointment_id: number | null;
  deliver_at: string;
  is_read: boolean;
}

function timeAgoTR(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "şimdi";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.round(hours / 24);
  return `${days} gün önce`;
}

export default function NotificationsBell({
  userId,
  role,
}: {
  userId: string;
  role: "student" | "teacher" | "admin";
}) {
  const supabase = createClient();
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, appointment_id, deliver_at, is_read")
      .eq("user_id", userId)
      .lte("deliver_at", new Date().toISOString())
      .order("deliver_at", { ascending: false })
      .limit(20);
    if (data) setItems(data as NotificationRow[]);
  }, [supabase, userId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  // Dışarı tıklanınca kapat
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    const unreadIds = items.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);
  };

  const openNotification = async (n: NotificationRow) => {
    if (!n.is_read) {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
      );
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", n.id);
    }
    setOpen(false);
    router.push(
      role === "student"
        ? "/dashboard/student/randevular"
        : "/dashboard/teacher/appointments"
    );
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-all"
        aria-label="Bildirimler"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4.5 h-4.5 text-[var(--accent)]" />
        ) : (
          <Bell className="w-4.5 h-4.5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-[var(--primary)] text-white text-[9px] font-bold ring-2 ring-[var(--surface)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 sm:w-96 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <h4 className="text-[var(--text-primary)] text-sm font-bold">
              Bildirimler
            </h4>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-[var(--accent)] text-xs font-semibold hover:opacity-80 transition-opacity"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-[var(--text-muted)] text-sm">
                Henüz bildirimin yok.
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openNotification(n)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--surface-2)] ${
                    n.is_read ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-1 w-7 h-7 shrink-0 rounded-lg flex items-center justify-center ${
                        n.type === "reminder"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-[var(--primary)]/15 text-[var(--accent)]"
                      }`}
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[var(--text-primary)] text-xs font-bold">
                        {n.title}
                        {!n.is_read && (
                          <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-[var(--primary)] align-middle" />
                        )}
                      </p>
                      {n.body && (
                        <p className="text-[var(--text-secondary)] text-xs mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[var(--text-muted)] text-[10px] mt-1">
                        {timeAgoTR(n.deliver_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
