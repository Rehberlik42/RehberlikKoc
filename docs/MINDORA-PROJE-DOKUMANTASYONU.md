# MINDORA (rehberlik-koc) — Kapsamlı Proje Dokümantasyonu

Bu doküman, projeyi başka bir yapay zekaya öğretmek için hazırlanmıştır.

---

## 1. Proje Kimliği ve Amacı

| Alan | Değer |
|------|-------|
| **Ürün adı** | MINDORA |
| **npm paket adı** | `rehberlik-koc` |
| **Tür** | Yapay zeka destekli eğitim koçluğu / rehberlik platformu |
| **Hedef kitle** | YKS, LGS, KPSS ve ara sınıf öğrencileri + rehberlik koçları (öğretmenler) |
| **Dil** | Kullanıcı arayüzü tamamen Türkçe; kod İngilizce |
| **AI karakteri** | **DORA** — dijital koç / motivasyon asistanı (henüz gerçek AI chat yok, kural tabanlı öneriler var) |
| **Durum** | Aktif geliştirme aşamasında; birçok modül çalışıyor, bazı nav linkleri henüz implemente edilmemiş |

**Temel vaat:** Öğrencinin çalışma verisini (soru çözümü, deneme netleri, konu ilerlemesi, psikolojik testler) toplayıp koçluk kararlarını desteklemek; DORA markası altında kişiselleştirilmiş kaynak önerileri sunmak.

---

## 2. Teknoloji Yığını

### Çekirdek
- **Next.js 16.2.6** — App Router, React Server Components (RSC)
- **React 19.2.4**
- **TypeScript 5** (strict mode)
- **Tailwind CSS v4**
- **Geist Sans / Geist Mono** — next/font/google

### Backend / Veri
- **Supabase** — Auth + Postgres + RLS (Row Level Security)
- **@supabase/ssr 0.10.3** — cookie tabanlı SSR oturum yönetimi
- **@supabase/supabase-js 2.106.2**
- **REST API yok** — tüm veri işlemleri doğrudan Supabase client üzerinden

### UI kütüphaneleri
- **lucide-react** — ikonlar
- **recharts** — deneme grafikleri
- **@dnd-kit** — öğretmen randevu Kanban tahtası
- **html2canvas-pro + jspdf** — istemci tarafı PDF export

### Next.js 16 farkları
- `middleware.ts` yerine kök dizinde **proxy.ts** kullanılıyor
- AGENTS.md: Next.js 16 breaking change'ler var
- Dev script: `next dev --webpack`

---

## 3. Mimari Genel Bakış

**Katmanlar:**
- Tarayıcı: Landing, Dashboard, Client/Server Components
- proxy.ts: Oturum yenileme, /dashboard auth gate
- lib/supabase/: client.ts (browser), server.ts (RSC), proxy.ts
- Supabase: Auth + Postgres + RLS

**BaaS mimarisi:** Backend ayrı bir Node servisi değil; Postgres + RLS güvenlik katmanı.

---

## 4. Dizin Yapısı

```
rehberlik-koc/
├── app/                    # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx            # Landing + auth modal
│   ├── globals.css
│   └── dashboard/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── _components/    # DashboardShell, PdfExportButton, vb.
│       ├── student/
│       └── teacher/
├── lib/                    # Domain logic + Supabase
├── public/
├── supabase/migrations/
├── proxy.ts
├── next.config.ts
└── package.json
```

Kök `components/` klasörü yok. Bileşenler `app/.../_components/` altında.

---

## 5. Ortam Değişkenleri

| Değişken | Kullanım |
|----------|----------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase proje URL'si |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Anon/publishable key |

---

## 6. Kimlik Doğrulama ve Oturum Akışı

### Kayıt
- signUp ile role: "student" | "teacher" user_metadata'ya yazılır
- profiles tablosu DB trigger ile varsayılıyor

### Giriş
- signInWithPassword → /dashboard redirect

### proxy.ts
- getClaims() ile JWT yerel doğrulama
- /dashboard/* için auth gate

### dashboard/layout.tsx
- getUser() sunucu doğrulaması
- profiles fetch → DashboardShell

### Rol yönlendirme
- teacher | admin → /dashboard/teacher
- student → /dashboard/student

---

## 7. Kullanıcı Rolleri

| Rol | DB değeri | Dashboard |
|-----|-----------|-----------|
| Öğrenci | student | /dashboard/student/* |
| Öğretmen/Koç | teacher | /dashboard/teacher/* |
| Admin | admin | Teacher dashboard (ayrı UI yok) |

---

## 8. Veritabanı Şeması

Şema kaynağı uzak Supabase. Repoda sadece guidance_contents migration'ı var.

### profiles
id, full_name, role, avatar_url, grade, school, phone, bio

### teacher_students
teacher_id, student_id, assigned_at, is_active

### Müfredat
exams → subjects → topics

### study_sessions
student_id, subject_id, topic_id, correct_count, wrong_count, questions_solved, duration_minutes, notes, study_date

### mock_exams + mock_exam_results
Net hesabı: correct - wrong/4

### topic_progress
status: not_started | in_progress | completed | needs_review

### resources
type: youtube | book | document | website; is_approved

### psychological_tests
type: motivation | anxiety | focus | burnout | general; questions JSONB

### test_results
student_id, test_id, answers, score, interpretation, taken_at

### appointments
status: pending | confirmed | completed | cancelled

### guidance_contents
content_type: blog | video | pdf; target_exam: YKS | LGS | KPSS | ARA_SINIF

---

## 9. Tasarım Sistemi (Dark-Neon)

Renkler: #7B2FFF (mor), #4F7CFF (mavi), #00D4FF (cyan), arka plan #05050f

Tüm UI metinleri Türkçe. i18n framework yok.

---

## 10. Route'lar ve Özellikler

### Public
- / — Landing, AuthModal

### Öğrenci
- /dashboard/student — Ana sayfa, statik DORA motivasyon kartı
- /dashboard/student/program — Çalışma kaydı (Faz 2), PDF export
- /dashboard/student/mock-exams — Deneme CRUD, grafik, PDF export
- /dashboard/student/recommendations — Kural tabanlı kaynak önerileri
- /dashboard/student/progress — Konu ilerleme (nav'da gizli)
- /dashboard/student/tests — Psikolojik testler
- /dashboard/student/tests/[id] — Test çözme
- /dashboard/student/guidance — Rehberlik hub (Faz 4)
- /dashboard/student/guidance/[id] — Blog detay

### Eksik öğrenci route'ları
- /dashboard/student/dora — AI chat yok
- /dashboard/student/randevular — yok

### Öğretmen
- /dashboard/teacher — Koç dashboard
- /dashboard/teacher/students — Öğrenci listesi
- /dashboard/teacher/students/[id] — Öğrenci detay
- /dashboard/teacher/appointments — Kanban randevular
- /dashboard/teacher/tests — Test sonuçları

### Eksik öğretmen route'ları
- /dashboard/teacher/reports — yok

### Kırık linkler
- denemeler → mock-exams olmalı
- kaynaklar → recommendations olmalı

---

## 11. lib/ Yardımcı Modüller

- student-helpers.ts — gradeToExam, targetExamLabel, timeAgo
- tests.ts — psikolojik test şeması ve skorlama
- guidance.ts — rehberlik içerik yardımcıları
- pdf-export.ts — html2canvas-pro + jsPDF

---

## 12. Bileşen Pattern'leri

- Server Page + Client Island
- Route-colocated _components/
- dynamic = "force-dynamic" veri sayfalarında
- PDF export: pdf-export-hide class ile element gizleme

---

## 13. Bilinen Eksiklikler

1. DORA AI chat
2. Öğrenci randevu görünümü
3. Öğretmen raporları
4. Admin paneli
5. Gerçek zamanlı DORA analizi
6. DB tipleri generate edilmemiş
7. RLS politikaları repoda yok
8. README güncel değil

---

## 14. Geliştirme Komutları

```
npm run dev          # next dev --webpack
npm run dev:turbo    # Turbopack
npm run build
npm run start
npm run lint
```

---

## 15. Proje Evreleri

| Faz | Modül | Durum |
|-----|-------|-------|
| — | Landing + Auth | Tamam |
| Faz 2 | Çalışma programı | Tamam |
| — | Deneme analizi | Tamam |
| — | Kaynak önerileri | Tamam |
| — | Psikolojik testler | Tamam |
| Faz 4 | Rehberlik Hub | Tamam |
| — | Öğretmen modülleri | Kısıtlı |
| — | DORA AI chat | Eksik |
| — | Admin panel | Eksik |

---

*Oluşturulma: MINDORA rehberlik-koc projesi — teknik dokümantasyon*
