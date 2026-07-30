"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Save,
  ShieldAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const INPUT_CLS =
  "w-full rounded-xl border border-rose-500/20 bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-rose-500/50";
const LABEL_CLS =
  "mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]";

const KAYGI_TETIKLEYICILERI = [
  "Deneme sırasında",
  "Sonuç görünce",
  "Ders çalışırken",
  "Ailemle konuşunca",
  "Sosyal medya",
  "Geleceği düşününce",
] as const;

const DUSUNCE_KALIPLARI = [
  "Yetişmeyecek",
  "Çok geç kaldım",
  "Yapamayacağım",
  "Herkes benden daha iyi",
  "Ailemi hayal kırıklığına uğratacağım",
  "Sınavda bildiklerimi unutacağım",
  "Bir hata yaparsam her şey biter",
  "Başarısız olursam değerim azalır",
] as const;

const TANI_SECENEKLERI = [
  "Yok",
  "DEHB",
  "Anksiyete",
  "Depresyon",
  "Diğer",
] as const;

export interface StudentIntakeSensitiveRecord {
  student_id: string;
  created_by?: string | null;
  updated_at?: string | null;
  sinav_kaygisi_seviyesi?: number | string | null;
  kaygi_tetikleyicileri?: string[] | null;
  dusunce_kaliplari?: string[] | null;
  psikolojik_destek_aldi_mi?: boolean | null;
  tani_bilgisi?: string[] | null;
  tani_diger?: string | null;
  ilac_kullaniyor_mu?: boolean | null;
}

interface SensitiveFormState {
  sinav_kaygisi_seviyesi: number;
  kaygi_tetikleyicileri: string[];
  dusunce_kaliplari: string[];
  psikolojik_destek_aldi_mi: boolean | null;
  tani_bilgisi: string[];
  tani_diger: string;
  ilac_kullaniyor_mu: boolean | null;
}

function initialState(
  record: StudentIntakeSensitiveRecord | null
): SensitiveFormState {
  const anxiety = Number(record?.sinav_kaygisi_seviyesi ?? 0);
  return {
    sinav_kaygisi_seviyesi: Number.isFinite(anxiety)
      ? Math.min(10, Math.max(0, anxiety))
      : 0,
    kaygi_tetikleyicileri: record?.kaygi_tetikleyicileri ?? [],
    dusunce_kaliplari: record?.dusunce_kaliplari ?? [],
    psikolojik_destek_aldi_mi:
      typeof record?.psikolojik_destek_aldi_mi === "boolean"
        ? record.psikolojik_destek_aldi_mi
        : null,
    tani_bilgisi: record?.tani_bilgisi ?? [],
    tani_diger: record?.tani_diger ?? "",
    ilac_kullaniyor_mu:
      typeof record?.ilac_kullaniyor_mu === "boolean"
        ? record.ilac_kullaniyor_mu
        : null,
  };
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function BooleanChoice({
  name,
  value,
  onChange,
}: {
  name: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex gap-2">
      {[
        { label: "Evet", value: true },
        { label: "Hayır", value: false },
      ].map((option) => (
        <label
          key={option.label}
          className={`cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
            value === option.value
              ? "border-rose-500/50 bg-rose-500/15 text-rose-500"
              : "border-[var(--border)] bg-[var(--surface-2)]/50 text-[var(--text-muted)]"
          }`}
        >
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

function CheckboxGroup({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => (
        <label
          key={option}
          className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-xs transition-colors ${
            selected.includes(option)
              ? "border-rose-500/35 bg-rose-500/10 text-[var(--text-primary)]"
              : "border-[var(--border)] bg-[var(--surface-2)]/40 text-[var(--text-secondary)]"
          }`}
        >
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => onToggle(option)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-rose-500"
          />
          {option}
        </label>
      ))}
    </div>
  );
}

function toggleItem(items: string[], value: string): string[] {
  return items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];
}

export default function StudentIntakeSensitiveForm({
  studentId,
  initialRecord,
}: {
  studentId: string;
  initialRecord: StudentIntakeSensitiveRecord | null;
}) {
  const [form, setForm] = useState<SensitiveFormState>(() =>
    initialState(initialRecord)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasRecord, setHasRecord] = useState(initialRecord != null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(
    initialRecord?.updated_at ?? null
  );

  const update = <K extends keyof SensitiveFormState>(
    key: K,
    value: SensitiveFormState[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const toggleDiagnosis = (option: string) => {
    setForm((current) => {
      if (option === "Yok") {
        return {
          ...current,
          tani_bilgisi: current.tani_bilgisi.includes("Yok") ? [] : ["Yok"],
          tani_diger: "",
        };
      }

      const withoutNone = current.tani_bilgisi.filter(
        (item) => item !== "Yok"
      );
      const next = toggleItem(withoutNone, option);
      return {
        ...current,
        tani_bilgisi: next,
        tani_diger: next.includes("Diğer") ? current.tani_diger : "",
      };
    });
    setSaved(false);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setSaveError("Oturum bulunamadı.");
      return;
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("student_intake_sensitive")
      .upsert(
        {
          student_id: studentId,
          sinav_kaygisi_seviyesi: form.sinav_kaygisi_seviyesi,
          kaygi_tetikleyicileri: form.kaygi_tetikleyicileri,
          dusunce_kaliplari: form.dusunce_kaliplari,
          psikolojik_destek_aldi_mi: form.psikolojik_destek_aldi_mi,
          tani_bilgisi: form.tani_bilgisi,
          tani_diger: form.tani_bilgisi.includes("Diğer")
            ? form.tani_diger.trim() || null
            : null,
          ilac_kullaniyor_mu: form.ilac_kullaniyor_mu,
          updated_at: now,
          ...(!hasRecord ? { created_by: user.id } : {}),
        },
        { onConflict: "student_id" }
      )
      .select("updated_at")
      .single();

    setSaving(false);
    if (error) {
      // RLS reddi dahil tüm hatalar kontrollü gösterilir; bileşen çökmez.
      setSaveError("Hassas bilgiler kaydedilemedi.");
      return;
    }

    setHasRecord(true);
    setUpdatedAt((data?.updated_at as string | null) ?? now);
    setSaved(true);
  };

  return (
    <form
      onSubmit={handleSave}
      className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-rose-500/30 bg-rose-500/[0.04]"
    >
      <div className="flex flex-col gap-3 border-b border-rose-500/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/15">
            <LockKeyhole className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-[var(--text-primary)]">
                Hassas Bilgiler
              </h2>
              <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-500">
                Kısıtlı erişim
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Bu bilgiler yalnızca yetkilendirilmiş danışmanlar tarafından
              görüntülenebilir.
            </p>
          </div>
        </div>
        <div className="text-xs text-[var(--text-muted)] sm:text-right">
          {hasRecord ? (
            <>
              <p className="font-semibold text-rose-500">Hassas kayıt mevcut</p>
              {updatedAt ? (
                <p className="mt-0.5">
                  Son güncelleme: {formatUpdatedAt(updatedAt)}
                </p>
              ) : null}
            </>
          ) : (
            <p>Henüz hassas bilgi kaydı yok.</p>
          )}
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-5">
        <div>
          <div className="mb-3 flex items-center justify-between gap-4">
            <label
              htmlFor="sinav-kaygisi-seviyesi"
              className="text-sm font-semibold text-[var(--text-primary)]"
            >
              Sınav kaygısı seviyesi
            </label>
            <span className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-sm font-black tabular-nums text-rose-500">
              {form.sinav_kaygisi_seviyesi}/10
            </span>
          </div>
          <input
            id="sinav-kaygisi-seviyesi"
            type="range"
            min="0"
            max="10"
            step="1"
            value={form.sinav_kaygisi_seviyesi}
            onChange={(event) =>
              update("sinav_kaygisi_seviyesi", Number(event.target.value))
            }
            className="w-full accent-rose-500"
          />
          <div className="mt-1 flex justify-between text-[10px] text-[var(--text-muted)]">
            <span>Kaygı yok</span>
            <span>Çok yüksek</span>
          </div>
        </div>

        <div>
          <p className={LABEL_CLS}>Kaygı tetikleyicileri</p>
          <CheckboxGroup
            options={KAYGI_TETIKLEYICILERI}
            selected={form.kaygi_tetikleyicileri}
            onToggle={(option) =>
              update(
                "kaygi_tetikleyicileri",
                toggleItem(form.kaygi_tetikleyicileri, option)
              )
            }
          />
        </div>

        <div>
          <p className={LABEL_CLS}>Sık karşılaşılan düşünce kalıpları</p>
          <CheckboxGroup
            options={DUSUNCE_KALIPLARI}
            selected={form.dusunce_kaliplari}
            onToggle={(option) =>
              update(
                "dusunce_kaliplari",
                toggleItem(form.dusunce_kaliplari, option)
              )
            }
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className={LABEL_CLS}>Daha önce psikolojik destek aldı mı?</p>
            <BooleanChoice
              name="psikolojik-destek"
              value={form.psikolojik_destek_aldi_mi}
              onChange={(value) =>
                update("psikolojik_destek_aldi_mi", value)
              }
            />
          </div>
          <div>
            <p className={LABEL_CLS}>İlaç kullanıyor mu?</p>
            <BooleanChoice
              name="ilac-kullanimi"
              value={form.ilac_kullaniyor_mu}
              onChange={(value) => update("ilac_kullaniyor_mu", value)}
            />
          </div>
        </div>

        <div>
          <p className={LABEL_CLS}>Tanı bilgisi</p>
          <div className="flex flex-wrap gap-2">
            {TANI_SECENEKLERI.map((option) => (
              <label
                key={option}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  form.tani_bilgisi.includes(option)
                    ? "border-rose-500/45 bg-rose-500/15 text-rose-500"
                    : "border-[var(--border)] bg-[var(--surface-2)]/50 text-[var(--text-muted)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.tani_bilgisi.includes(option)}
                  onChange={() => toggleDiagnosis(option)}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
          {form.tani_bilgisi.includes("Diğer") ? (
            <label className="mt-3 block">
              <span className={LABEL_CLS}>Diğer tanı</span>
              <input
                value={form.tani_diger}
                onChange={(event) => update("tani_diger", event.target.value)}
                className={INPUT_CLS}
              />
            </label>
          ) : null}
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-500">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Bu kayıt hassas kişisel veri içerir. Yalnızca danışmanlık amacıyla ve
          gerekli ölçüde işlenmelidir.
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-rose-500/20 bg-[var(--surface)]/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-h-5 text-xs">
          {saveError ? (
            <p className="text-rose-500">{saveError}</p>
          ) : saved ? (
            <p className="inline-flex items-center gap-1.5 font-semibold text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              Hassas bilgiler başarıyla kaydedildi.
            </p>
          ) : (
            <p className="text-[var(--text-muted)]">
              Genel anamnez formundan bağımsız kaydedilir.
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-600/20 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Kaydediliyor…" : "Hassas Bilgileri Kaydet"}
        </button>
      </div>
    </form>
  );
}
