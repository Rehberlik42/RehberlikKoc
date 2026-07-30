"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import HelpGuideButton from "@/components/ui/HelpGuideButton";

const INTAKE_GUIDE = {
  title: "Öğrenci Anamnez Formu",
  sections: [
    {
      heading: "Genel form ne işe yarar?",
      content: [
        "Öğrenciyi tanımaya ve danışmanlık sürecini planlamaya yönelik bilgiler toplanır.",
        "Bölümler: Başvuru Nedeni, Hedefler, Akademik Geçmiş, Deneme Performansı, Çalışma Alışkanlıkları, Motivasyon, Yaşam Düzeni, Aile, Sosyal Yaşam, Kendini Değerlendirme, Güçlü / Gelişim Yönleri ve 17. Danışman Gözlemi.",
        "Alttaki Kaydet tüm bölümleri tek kayıt olarak kaydeder (ekranda da yazdığı gibi: Tüm bölümler tek kayıt olarak kaydedilir.). Başarıda Anamnez başarıyla kaydedildi. görünür.",
      ],
    },
    {
      heading: "17. Danışman Gözlemi",
      content: [
        "Bu bölüm sadece danışman/koç tarafından doldurulur.",
        "İlk izlenim, iletişim, motivasyon, hazırbulunuşluk, risk / koruyucu faktörler, ön değerlendirme ve ilk görüşme hedefleri gibi mesleki notlar içindir.",
        "Genel formun Kaydet butonuyla birlikte kaydedilir.",
      ],
    },
    {
      heading: "Hassas Bilgiler bölümü neden bazı koçlarda yok?",
      content: [
        "Hassas Bilgiler (kaygı, tetikleyiciler, psikolojik destek, ilaç, tanı) yalnızca süperadmin’in koç hesabında Hassas Veri Erişimi iznini Açık yaptığı koçlara görünür.",
        "İzin yoksa bu bölüm hiç yüklenmez ve ekranda görünmez — form kırık değildir; erişim kısıtlıdır.",
        "İzinli koçlarda bölüm Kısıtlı erişim rozetiyle çıkar; Bu bilgiler yalnızca yetkilendirilmiş danışmanlar tarafından görüntülenebilir. Genel formdan bağımsızdır: kayıt için Hassas Bilgileri Kaydet kullanılır.",
      ],
    },
    {
      heading: "İpuçları",
      content:
        "Form kayıtlı / Son güncelleme satırı genel anamnezin durumunu gösterir. Hassas kayıt ayrıdır (Hassas kayıt mevcut veya Henüz hassas bilgi kaydı yok.).",
    },
  ],
};

const INPUT_CLS =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]/60";
const LABEL_CLS =
  "mb-1.5 block text-xs font-semibold text-[var(--text-secondary)]";

const AIDiyet_OPTIONS = [
  "Hiç",
  "Az",
  "Orta",
  "Büyük ölçüde",
  "Tamamen",
] as const;
const PROGRAM_UYUM_OPTIONS = [
  "Hiç",
  "Nadiren",
  "Bazen",
  "Çoğunlukla",
  "Her zaman",
] as const;
const ZORLANMA_OPTIONS = [
  "Nereden başlayacağını bilememe",
  "Dikkat dağınıklığı",
  "Motivasyon eksikliği",
  "Zamanı planlayamama",
  "Konu eksiği",
  "Soru çözerken zorlanma",
  "Telefon / sosyal medya",
] as const;
const NET_KEYS = ["turkce", "sosyal", "matematik", "fen", "toplam"] as const;
const NET_LABELS: Record<NetKey, string> = {
  turkce: "Türkçe",
  sosyal: "Sosyal",
  matematik: "Matematik",
  fen: "Fen",
  toplam: "Toplam",
};

type NetKey = (typeof NET_KEYS)[number];
type NetDraft = Record<NetKey, string>;

export interface StudentIntakeRecord {
  student_id: string;
  created_by?: string | null;
  updated_at?: string | null;
  basvuru_nedeni?: string | null;
  degisim_beklentisi?: string | null;
  hedef_bolum?: string | null;
  hedef_universite?: string | null;
  ikinci_hedef?: string | null;
  hedef_nedeni?: string | null;
  hedef_aidiyet?: string | null;
  akademik_ortalama?: number | string | null;
  gecmis_basari_degerlendirme?: string | null;
  basarili_dersler?: string | null;
  zorlanilan_dersler?: string | null;
  daha_once_kurs_aldi?: boolean | null;
  tyt_net_bilgisi?: Record<string, unknown> | null;
  ayt_net_bilgisi?: Record<string, unknown> | null;
  deneme_sikligi?: string | null;
  gunluk_calisma_saati?: number | string | null;
  programi_var_mi?: boolean | null;
  programa_uyum?: string | null;
  zorlanma_nedeni?: string[] | null;
  zorlanma_nedeni_diger?: string | null;
  motive_eden?: string | null;
  uzaklastiran?: string | null;
  uyku_saati?: string | null;
  uyku_kalitesi?: string | null;
  telefon_kullanim_saat?: number | string | null;
  spor_durumu?: string | null;
  beslenme_durumu?: string | null;
  kimlerle_yasiyor?: string | null;
  aile_tutumu?: string | null;
  evde_zorlayan_durum?: string | null;
  yakin_arkadas_sayisi?: number | string | null;
  yalnizlik_hissi?: string | null;
  hobiler?: string | null;
  guven_puani?: number | string | null;
  motivasyon_puani?: number | string | null;
  disiplin_puani?: number | string | null;
  odaklanma_puani?: number | string | null;
  zaman_yonetimi_puani?: number | string | null;
  sinav_kaygisi_puani?: number | string | null;
  guclu_yonler?: string[] | null;
  gelistirilecek_alanlar?: string[] | null;
  ilk_izlenim?: string | null;
  iletisim_becerisi?: string | null;
  motivasyon_duzeyi_gozlem?: string | null;
  hazirbulunusluk?: string | null;
  risk_faktorleri?: string | null;
  koruyucu_faktorler?: string | null;
  on_degerlendirme?: string | null;
  ilk_gorusme_hedefleri?: string | null;
}

interface IntakeFormState {
  basvuru_nedeni: string;
  degisim_beklentisi: string;
  hedef_bolum: string;
  hedef_universite: string;
  ikinci_hedef: string;
  hedef_nedeni: string;
  hedef_aidiyet: string;
  akademik_ortalama: string;
  gecmis_basari_degerlendirme: string;
  basarili_dersler: string;
  zorlanilan_dersler: string;
  daha_once_kurs_aldi: boolean;
  tyt_net_bilgisi: NetDraft;
  ayt_net_bilgisi: NetDraft;
  deneme_sikligi: string;
  gunluk_calisma_saati: string;
  programi_var_mi: boolean;
  programa_uyum: string;
  zorlanma_nedeni: string[];
  zorlanma_nedeni_diger: string;
  motive_eden: string;
  uzaklastiran: string;
  uyku_saati: string;
  uyku_kalitesi: string;
  telefon_kullanim_saat: string;
  spor_durumu: string;
  beslenme_durumu: string;
  kimlerle_yasiyor: string;
  aile_tutumu: string;
  evde_zorlayan_durum: string;
  yakin_arkadas_sayisi: string;
  yalnizlik_hissi: string;
  hobiler: string;
  guven_puani: string;
  motivasyon_puani: string;
  disiplin_puani: string;
  odaklanma_puani: string;
  zaman_yonetimi_puani: string;
  sinav_kaygisi_puani: string;
  guclu_yonler: string[];
  gelistirilecek_alanlar: string[];
  ilk_izlenim: string;
  iletisim_becerisi: string;
  motivasyon_duzeyi_gozlem: string;
  hazirbulunusluk: string;
  risk_faktorleri: string;
  koruyucu_faktorler: string;
  on_degerlendirme: string;
  ilk_gorusme_hedefleri: string;
}

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

function netDraft(value: Record<string, unknown> | null | undefined): NetDraft {
  return Object.fromEntries(
    NET_KEYS.map((key) => [key, text(value?.[key])])
  ) as NetDraft;
}

function threeRows(value: string[] | null | undefined): string[] {
  return Array.from({ length: 3 }, (_, index) => value?.[index] ?? "");
}

function initialForm(record: StudentIntakeRecord | null): IntakeFormState {
  return {
    basvuru_nedeni: text(record?.basvuru_nedeni),
    degisim_beklentisi: text(record?.degisim_beklentisi),
    hedef_bolum: text(record?.hedef_bolum),
    hedef_universite: text(record?.hedef_universite),
    ikinci_hedef: text(record?.ikinci_hedef),
    hedef_nedeni: text(record?.hedef_nedeni),
    hedef_aidiyet: text(record?.hedef_aidiyet),
    akademik_ortalama: text(record?.akademik_ortalama),
    gecmis_basari_degerlendirme: text(
      record?.gecmis_basari_degerlendirme
    ),
    basarili_dersler: text(record?.basarili_dersler),
    zorlanilan_dersler: text(record?.zorlanilan_dersler),
    daha_once_kurs_aldi: record?.daha_once_kurs_aldi === true,
    tyt_net_bilgisi: netDraft(record?.tyt_net_bilgisi),
    ayt_net_bilgisi: netDraft(record?.ayt_net_bilgisi),
    deneme_sikligi: text(record?.deneme_sikligi),
    gunluk_calisma_saati: text(record?.gunluk_calisma_saati),
    programi_var_mi: record?.programi_var_mi === true,
    programa_uyum: text(record?.programa_uyum),
    zorlanma_nedeni: record?.zorlanma_nedeni ?? [],
    zorlanma_nedeni_diger: text(record?.zorlanma_nedeni_diger),
    motive_eden: text(record?.motive_eden),
    uzaklastiran: text(record?.uzaklastiran),
    uyku_saati: text(record?.uyku_saati),
    uyku_kalitesi: text(record?.uyku_kalitesi),
    telefon_kullanim_saat: text(record?.telefon_kullanim_saat),
    spor_durumu: text(record?.spor_durumu),
    beslenme_durumu: text(record?.beslenme_durumu),
    kimlerle_yasiyor: text(record?.kimlerle_yasiyor),
    aile_tutumu: text(record?.aile_tutumu),
    evde_zorlayan_durum: text(record?.evde_zorlayan_durum),
    yakin_arkadas_sayisi: text(record?.yakin_arkadas_sayisi),
    yalnizlik_hissi: text(record?.yalnizlik_hissi),
    hobiler: text(record?.hobiler),
    guven_puani: text(record?.guven_puani),
    motivasyon_puani: text(record?.motivasyon_puani),
    disiplin_puani: text(record?.disiplin_puani),
    odaklanma_puani: text(record?.odaklanma_puani),
    zaman_yonetimi_puani: text(record?.zaman_yonetimi_puani),
    sinav_kaygisi_puani: text(record?.sinav_kaygisi_puani),
    guclu_yonler: threeRows(record?.guclu_yonler),
    gelistirilecek_alanlar: threeRows(record?.gelistirilecek_alanlar),
    ilk_izlenim: text(record?.ilk_izlenim),
    iletisim_becerisi: text(record?.iletisim_becerisi),
    motivasyon_duzeyi_gozlem: text(record?.motivasyon_duzeyi_gozlem),
    hazirbulunusluk: text(record?.hazirbulunusluk),
    risk_faktorleri: text(record?.risk_faktorleri),
    koruyucu_faktorler: text(record?.koruyucu_faktorler),
    on_degerlendirme: text(record?.on_degerlendirme),
    ilk_gorusme_hedefleri: text(record?.ilk_gorusme_hedefleri),
  };
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function nullableNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function netPayload(draft: NetDraft): Record<NetKey, number | null> {
  return Object.fromEntries(
    NET_KEYS.map((key) => [key, nullableNumber(draft[key])])
  ) as Record<NetKey, number | null>;
}

function FormSection({
  title,
  description,
  children,
  defaultOpen = false,
  coachOnly = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  coachOnly?: boolean;
}) {
  return (
    <details
      open={defaultOpen || undefined}
      className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-5">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {title}
          </h3>
          {description ? (
            <p
              className={`mt-0.5 text-xs ${
                coachOnly ? "text-violet-500" : "text-[var(--text-muted)]"
              }`}
            >
              {description}
            </p>
          ) : null}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-[var(--border)] p-4 sm:p-5">
        {children}
      </div>
    </details>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className={LABEL_CLS}>{label}</span>
      {children}
    </label>
  );
}

function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`${INPUT_CLS} resize-y`}
    />
  );
}

function RadioScale({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <label
          key={option}
          className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === option
              ? "border-[var(--primary)]/50 bg-[var(--primary)]/15 text-[var(--accent)]"
              : "border-[var(--border)] bg-[var(--surface-2)]/50 text-[var(--text-muted)]"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="sr-only"
          />
          {option}
        </label>
      ))}
    </div>
  );
}

function NetFields({
  title,
  value,
  onChange,
}: {
  title: string;
  value: NetDraft;
  onChange: (key: NetKey, value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
      <p className="mb-3 text-xs font-bold text-[var(--text-secondary)]">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {NET_KEYS.map((key) => (
          <Field key={key} label={NET_LABELS[key]}>
            <input
              type="number"
              step="0.25"
              value={value[key]}
              onChange={(event) => onChange(key, event.target.value)}
              className={INPUT_CLS}
            />
          </Field>
        ))}
      </div>
    </div>
  );
}

function ThreeRowList({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (index: number, value: string) => void;
}) {
  return (
    <div>
      <p className={LABEL_CLS}>{label}</p>
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[10px] font-bold text-[var(--text-muted)]">
              {index + 1}
            </span>
            <input
              type="text"
              value={value}
              onChange={(event) => onChange(index, event.target.value)}
              className={INPUT_CLS}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function StudentIntakeForm({
  studentId,
  initialRecord,
}: {
  studentId: string;
  initialRecord: StudentIntakeRecord | null;
}) {
  const [form, setForm] = useState<IntakeFormState>(() =>
    initialForm(initialRecord)
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [hasRecord, setHasRecord] = useState(initialRecord != null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(
    initialRecord?.updated_at ?? null
  );

  const setField = <K extends keyof IntakeFormState>(
    key: K,
    value: IntakeFormState[K]
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const setNetField = (
    field: "tyt_net_bilgisi" | "ayt_net_bilgisi",
    key: NetKey,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: { ...current[field], [key]: value },
    }));
    setSaved(false);
  };

  const setListField = (
    field: "guclu_yonler" | "gelistirilecek_alanlar",
    index: number,
    value: string
  ) => {
    setForm((current) => {
      const rows = [...current[field]];
      rows[index] = value;
      return { ...current, [field]: rows };
    });
    setSaved(false);
  };

  const toggleZorlanma = (value: string) => {
    setForm((current) => ({
      ...current,
      zorlanma_nedeni: current.zorlanma_nedeni.includes(value)
        ? current.zorlanma_nedeni.filter((item) => item !== value)
        : [...current.zorlanma_nedeni, value],
    }));
    setSaved(false);
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaveError("Oturum bulunamadı.");
      setSaving(false);
      return;
    }

    const now = new Date().toISOString();
    const payload = {
      student_id: studentId,
      basvuru_nedeni: nullableText(form.basvuru_nedeni),
      degisim_beklentisi: nullableText(form.degisim_beklentisi),
      hedef_bolum: nullableText(form.hedef_bolum),
      hedef_universite: nullableText(form.hedef_universite),
      ikinci_hedef: nullableText(form.ikinci_hedef),
      hedef_nedeni: nullableText(form.hedef_nedeni),
      hedef_aidiyet: nullableText(form.hedef_aidiyet),
      akademik_ortalama: nullableNumber(form.akademik_ortalama),
      gecmis_basari_degerlendirme: nullableText(
        form.gecmis_basari_degerlendirme
      ),
      basarili_dersler: nullableText(form.basarili_dersler),
      zorlanilan_dersler: nullableText(form.zorlanilan_dersler),
      daha_once_kurs_aldi: form.daha_once_kurs_aldi,
      tyt_net_bilgisi: netPayload(form.tyt_net_bilgisi),
      ayt_net_bilgisi: netPayload(form.ayt_net_bilgisi),
      deneme_sikligi: nullableText(form.deneme_sikligi),
      gunluk_calisma_saati: nullableNumber(form.gunluk_calisma_saati),
      programi_var_mi: form.programi_var_mi,
      programa_uyum: nullableText(form.programa_uyum),
      zorlanma_nedeni: form.zorlanma_nedeni,
      zorlanma_nedeni_diger: nullableText(form.zorlanma_nedeni_diger),
      motive_eden: nullableText(form.motive_eden),
      uzaklastiran: nullableText(form.uzaklastiran),
      uyku_saati: nullableText(form.uyku_saati),
      uyku_kalitesi: nullableText(form.uyku_kalitesi),
      telefon_kullanim_saat: nullableNumber(form.telefon_kullanim_saat),
      spor_durumu: nullableText(form.spor_durumu),
      beslenme_durumu: nullableText(form.beslenme_durumu),
      kimlerle_yasiyor: nullableText(form.kimlerle_yasiyor),
      aile_tutumu: nullableText(form.aile_tutumu),
      evde_zorlayan_durum: nullableText(form.evde_zorlayan_durum),
      yakin_arkadas_sayisi: nullableNumber(form.yakin_arkadas_sayisi),
      yalnizlik_hissi: nullableText(form.yalnizlik_hissi),
      hobiler: nullableText(form.hobiler),
      guven_puani: nullableNumber(form.guven_puani),
      motivasyon_puani: nullableNumber(form.motivasyon_puani),
      disiplin_puani: nullableNumber(form.disiplin_puani),
      odaklanma_puani: nullableNumber(form.odaklanma_puani),
      zaman_yonetimi_puani: nullableNumber(form.zaman_yonetimi_puani),
      sinav_kaygisi_puani: nullableNumber(form.sinav_kaygisi_puani),
      guclu_yonler: form.guclu_yonler
        .map((item) => item.trim())
        .filter(Boolean),
      gelistirilecek_alanlar: form.gelistirilecek_alanlar
        .map((item) => item.trim())
        .filter(Boolean),
      ilk_izlenim: nullableText(form.ilk_izlenim),
      iletisim_becerisi: nullableText(form.iletisim_becerisi),
      motivasyon_duzeyi_gozlem: nullableText(
        form.motivasyon_duzeyi_gozlem
      ),
      hazirbulunusluk: nullableText(form.hazirbulunusluk),
      risk_faktorleri: nullableText(form.risk_faktorleri),
      koruyucu_faktorler: nullableText(form.koruyucu_faktorler),
      on_degerlendirme: nullableText(form.on_degerlendirme),
      ilk_gorusme_hedefleri: nullableText(form.ilk_gorusme_hedefleri),
      updated_at: now,
      ...(!hasRecord ? { created_by: user.id } : {}),
    };

    const { data, error } = await supabase
      .from("student_intake")
      .upsert(payload, { onConflict: "student_id" })
      .select("updated_at")
      .single();

    setSaving(false);
    if (error) {
      setSaveError(`Anamnez kaydedilemedi: ${error.message}`);
      return;
    }

    setHasRecord(true);
    setUpdatedAt((data?.updated_at as string | null) ?? now);
    setSaved(true);
  };

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/10">
            <ClipboardList className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-[var(--text-primary)]">
                Öğrenci Anamnez Formu
              </h2>
              <HelpGuideButton
                title={INTAKE_GUIDE.title}
                sections={INTAKE_GUIDE.sections}
              />
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Öğrenciyi tanımaya ve danışmanlık sürecini planlamaya yönelik
              bilgiler.
            </p>
          </div>
        </div>
        <div className="text-xs text-[var(--text-muted)] sm:text-right">
          {hasRecord ? (
            <>
              <p className="font-semibold text-emerald-500">Form kayıtlı</p>
              {updatedAt ? (
                <p className="mt-0.5">
                  Son güncelleme: {formatUpdatedAt(updatedAt)}
                </p>
              ) : null}
            </>
          ) : (
            <p>Henüz anamnez formu doldurulmamış.</p>
          )}
        </div>
      </div>

      <FormSection title="Başvuru Nedeni" defaultOpen>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Başvuru nedeni">
            <TextArea
              value={form.basvuru_nedeni}
              onChange={(value) => setField("basvuru_nedeni", value)}
            />
          </Field>
          <Field label="Bu süreçten beklenen değişim">
            <TextArea
              value={form.degisim_beklentisi}
              onChange={(value) => setField("degisim_beklentisi", value)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Hedefler">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Hedef bölüm">
            <input
              value={form.hedef_bolum}
              onChange={(event) =>
                setField("hedef_bolum", event.target.value)
              }
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Hedef üniversite">
            <input
              value={form.hedef_universite}
              onChange={(event) =>
                setField("hedef_universite", event.target.value)
              }
              className={INPUT_CLS}
            />
          </Field>
          <Field label="İkinci hedef">
            <input
              value={form.ikinci_hedef}
              onChange={(event) =>
                setField("ikinci_hedef", event.target.value)
              }
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Hedefin nedeni">
            <input
              value={form.hedef_nedeni}
              onChange={(event) =>
                setField("hedef_nedeni", event.target.value)
              }
              className={INPUT_CLS}
            />
          </Field>
          <div className="md:col-span-2">
            <p className={LABEL_CLS}>Bu hedef sana ne kadar ait?</p>
            <RadioScale
              name="hedef-aidiyet"
              value={form.hedef_aidiyet}
              options={AIDiyet_OPTIONS}
              onChange={(value) => setField("hedef_aidiyet", value)}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Akademik Geçmiş">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Akademik ortalama">
            <input
              type="number"
              step="0.01"
              value={form.akademik_ortalama}
              onChange={(event) =>
                setField("akademik_ortalama", event.target.value)
              }
              className={INPUT_CLS}
            />
          </Field>
          <label className="flex items-center gap-3 self-end rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-2.5 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={form.daha_once_kurs_aldi}
              onChange={(event) =>
                setField("daha_once_kurs_aldi", event.target.checked)
              }
              className="h-4 w-4 accent-[var(--primary)]"
            />
            Daha önce kurs/özel ders aldı
          </label>
          <Field
            label="Geçmiş başarı değerlendirmesi"
            className="md:col-span-2"
          >
            <TextArea
              value={form.gecmis_basari_degerlendirme}
              onChange={(value) =>
                setField("gecmis_basari_degerlendirme", value)
              }
            />
          </Field>
          <Field label="Başarılı olduğu dersler">
            <TextArea
              value={form.basarili_dersler}
              onChange={(value) => setField("basarili_dersler", value)}
            />
          </Field>
          <Field label="Zorlandığı dersler">
            <TextArea
              value={form.zorlanilan_dersler}
              onChange={(value) => setField("zorlanilan_dersler", value)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Deneme Performansı">
        <div className="space-y-4">
          <NetFields
            title="TYT net bilgisi"
            value={form.tyt_net_bilgisi}
            onChange={(key, value) =>
              setNetField("tyt_net_bilgisi", key, value)
            }
          />
          <NetFields
            title="AYT net bilgisi"
            value={form.ayt_net_bilgisi}
            onChange={(key, value) =>
              setNetField("ayt_net_bilgisi", key, value)
            }
          />
          <Field label="Deneme çözme sıklığı">
            <select
              value={form.deneme_sikligi}
              onChange={(event) =>
                setField("deneme_sikligi", event.target.value)
              }
              className={INPUT_CLS}
            >
              <option value="">Seçiniz</option>
              <option value="Nadiren">Nadiren</option>
              <option value="Ayda 1-2">Ayda 1-2</option>
              <option value="Haftada 1">Haftada 1</option>
              <option value="Haftada 2-3">Haftada 2-3</option>
              <option value="Haftada 4+">Haftada 4+</option>
            </select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Çalışma Alışkanlıkları">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Günlük çalışma saati">
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.gunluk_calisma_saati}
              onChange={(event) =>
                setField("gunluk_calisma_saati", event.target.value)
              }
              className={INPUT_CLS}
            />
          </Field>
          <label className="flex items-center gap-3 self-end rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-2.5 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={form.programi_var_mi}
              onChange={(event) =>
                setField("programi_var_mi", event.target.checked)
              }
              className="h-4 w-4 accent-[var(--primary)]"
            />
            Düzenli çalışma programı var
          </label>
          <div className="md:col-span-2">
            <p className={LABEL_CLS}>Programa uyum</p>
            <RadioScale
              name="programa-uyum"
              value={form.programa_uyum}
              options={PROGRAM_UYUM_OPTIONS}
              onChange={(value) => setField("programa_uyum", value)}
            />
          </div>
          <div className="md:col-span-2">
            <p className={LABEL_CLS}>Çalışırken zorlanma nedenleri</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ZORLANMA_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-2 text-xs text-[var(--text-secondary)]"
                >
                  <input
                    type="checkbox"
                    checked={form.zorlanma_nedeni.includes(option)}
                    onChange={() => toggleZorlanma(option)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
          <Field label="Diğer zorlanma nedeni" className="md:col-span-2">
            <input
              value={form.zorlanma_nedeni_diger}
              onChange={(event) =>
                setField("zorlanma_nedeni_diger", event.target.value)
              }
              className={INPUT_CLS}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Motivasyon">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Motive eden şeyler">
            <TextArea
              value={form.motive_eden}
              onChange={(value) => setField("motive_eden", value)}
            />
          </Field>
          <Field label="Çalışmadan uzaklaştıran şeyler">
            <TextArea
              value={form.uzaklastiran}
              onChange={(value) => setField("uzaklastiran", value)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Yaşam Düzeni">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Uyku saati">
            <input
              type="time"
              value={form.uyku_saati}
              onChange={(event) => setField("uyku_saati", event.target.value)}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Uyku kalitesi">
            <select
              value={form.uyku_kalitesi}
              onChange={(event) =>
                setField("uyku_kalitesi", event.target.value)
              }
              className={INPUT_CLS}
            >
              <option value="">Seçiniz</option>
              <option value="Kötü">Kötü</option>
              <option value="Orta">Orta</option>
              <option value="İyi">İyi</option>
              <option value="Çok iyi">Çok iyi</option>
            </select>
          </Field>
          <Field label="Günlük telefon kullanımı (saat)">
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.telefon_kullanim_saat}
              onChange={(event) =>
                setField("telefon_kullanim_saat", event.target.value)
              }
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Spor durumu" className="lg:col-span-1">
            <TextArea
              rows={2}
              value={form.spor_durumu}
              onChange={(value) => setField("spor_durumu", value)}
            />
          </Field>
          <Field label="Beslenme durumu" className="lg:col-span-2">
            <TextArea
              rows={2}
              value={form.beslenme_durumu}
              onChange={(value) => setField("beslenme_durumu", value)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Aile">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Kimlerle yaşıyor?">
            <input
              value={form.kimlerle_yasiyor}
              onChange={(event) =>
                setField("kimlerle_yasiyor", event.target.value)
              }
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Aile tutumu">
            <input
              value={form.aile_tutumu}
              onChange={(event) =>
                setField("aile_tutumu", event.target.value)
              }
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Evde zorlayan durumlar" className="md:col-span-2">
            <TextArea
              value={form.evde_zorlayan_durum}
              onChange={(value) => setField("evde_zorlayan_durum", value)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Sosyal Yaşam">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Yakın arkadaş sayısı">
            <input
              type="number"
              min="0"
              value={form.yakin_arkadas_sayisi}
              onChange={(event) =>
                setField("yakin_arkadas_sayisi", event.target.value)
              }
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Yalnızlık hissi">
            <select
              value={form.yalnizlik_hissi}
              onChange={(event) =>
                setField("yalnizlik_hissi", event.target.value)
              }
              className={INPUT_CLS}
            >
              <option value="">Seçiniz</option>
              <option value="Hiç">Hiç</option>
              <option value="Nadiren">Nadiren</option>
              <option value="Bazen">Bazen</option>
              <option value="Sık sık">Sık sık</option>
              <option value="Her zaman">Her zaman</option>
            </select>
          </Field>
          <Field label="Hobiler" className="md:col-span-2">
            <TextArea
              value={form.hobiler}
              onChange={(value) => setField("hobiler", value)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Kendini Değerlendirme">
        <p className="mb-4 text-xs text-[var(--text-muted)]">
          Her alanı 0 ile 10 arasında puanlayın.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["guven_puani", "Özgüven"],
              ["motivasyon_puani", "Motivasyon"],
              ["disiplin_puani", "Disiplin"],
              ["odaklanma_puani", "Odaklanma"],
              ["zaman_yonetimi_puani", "Zaman yönetimi"],
              ["sinav_kaygisi_puani", "Sınav kaygısı"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="number"
                min="0"
                max="10"
                step="1"
                value={form[key]}
                onChange={(event) => setField(key, event.target.value)}
                className={INPUT_CLS}
              />
            </Field>
          ))}
        </div>
      </FormSection>

      <FormSection title="Güçlü / Gelişim Yönleri">
        <div className="grid gap-5 md:grid-cols-2">
          <ThreeRowList
            label="Güçlü yönler"
            values={form.guclu_yonler}
            onChange={(index, value) =>
              setListField("guclu_yonler", index, value)
            }
          />
          <ThreeRowList
            label="Geliştirilecek alanlar"
            values={form.gelistirilecek_alanlar}
            onChange={(index, value) =>
              setListField("gelistirilecek_alanlar", index, value)
            }
          />
        </div>
      </FormSection>

      <FormSection
        title="17. Danışman Gözlemi"
        description="Bu bölüm sadece danışman/koç tarafından doldurulur."
        coachOnly
      >
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-500">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Öğrenciye ilişkin mesleki gözlem ve ilk değerlendirme notları.
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              ["ilk_izlenim", "İlk izlenim"],
              ["iletisim_becerisi", "İletişim becerisi"],
              ["motivasyon_duzeyi_gozlem", "Gözlenen motivasyon düzeyi"],
              ["hazirbulunusluk", "Hazırbulunuşluk"],
              ["risk_faktorleri", "Risk faktörleri"],
              ["koruyucu_faktorler", "Koruyucu faktörler"],
              ["on_degerlendirme", "Ön değerlendirme"],
              ["ilk_gorusme_hedefleri", "İlk görüşme hedefleri"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <TextArea
                value={form[key]}
                onChange={(value) => setField(key, value)}
              />
            </Field>
          ))}
        </div>
      </FormSection>

      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 p-4 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5 text-xs">
          {saveError ? (
            <p className="text-rose-500">{saveError}</p>
          ) : saved ? (
            <p className="inline-flex items-center gap-1.5 font-semibold text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              Anamnez başarıyla kaydedildi.
            </p>
          ) : (
            <p className="text-[var(--text-muted)]">
              Tüm bölümler tek kayıt olarak kaydedilir.
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[var(--primary)]/20 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
