"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  BookOpen,
  BarChart2,
  PlayCircle,
  HeartPulse,
  CalendarCheck,
  Target,
  Bell,
  ClipboardList,
  X,
  Share2,
  Briefcase,
  Mail,
  Phone,
  Sparkles,
  LogIn,
  Eye,
  EyeOff,
  Loader2,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Utility ──────────────────────────────────────────────────────────────────
const gradientText =
  "bg-gradient-to-r from-[#7B2FFF] via-[#4F7CFF] to-[#00D4FF] bg-clip-text text-transparent gradient-text-animated";

const pageBg = "relative min-h-screen bg-[#141432]";

const cardGradient = "bg-gradient-to-br from-[#221c52]/90 to-[#18143c]/95";

// Marka görselleri — kullanıcının sağladığı şeffaf PNG'ler (public/).
const ICON_SRC = "/mindora-icon-transparent.png";
const LOGO_SRC = "/mindora-logo-transparent.png";
const DORA_SRC = "/dora-icon-transparent.png";

// Trim sonrası boyutlar script çıktısından güncellenir; oran için yaklaşık değerler.
const ICON_W = 668;
const ICON_H = 554;
const DORA_W = 975;
const DORA_H = 996;

const LOGO_HOLD_MS = 520;

const MINDORA_TEAM_QUOTE = {
  text: "Öğrencinin yalnızca netlerini değil; hayallerini, kaygılarını ve potansiyelini birlikte görürüz. Koçluk ve rehberlik, doğru zamanda doğru ışığı yakmaktır — her gencin kendi yolunu güvenle çizmesine eşlik ediyoruz.",
  short:
    "Her öğrenci bir yıldızdır; doğru rehberlik onu parlatır. Koçluk ve rehberlikle her gence eşlik ediyoruz.",
  author: "MINDORA Ekibi",
};

// Lisanslı görseller: public/images/README.md
const IMAGE_PATHS = {
  hero: "/images/hero-student.jpg",
  kids: "/images/kids-studying.jpg",
  testimonial1: "/images/testimonial-1.jpg",
  testimonial2: "/images/testimonial-2.jpg",
} as const;

// ─── Data ─────────────────────────────────────────────────────────────────────
const features = [
  {
    icon: <BookOpen className="w-7 h-7" />,
    title: "Detaylı ve Çok Boyutlu Program",
    desc: "YKS, LGS ve ara sınıflara özel, kişiselleştirilmiş haftalık & günlük ders programları. Hedefine göre dinamik olarak güncellenir.",
    detail:
      "Hedef sınavına, günlük çalışma sürene ve zayıf konularına göre otomatik oluşturulan haftalık planlar; her gün hangi derste ne kadar çalışacağını net gösterir.",
    bullets: [
      "YKS, LGS ve ara sınıf şablonları",
      "Günlük & haftalık otomatik plan güncelleme",
      "Tamamlanan oturumların tek ekranda takibi",
      "DORA ile eksik konuya anında yönlendirme",
    ],
  },
  {
    icon: <BarChart2 className="w-7 h-7" />,
    title: "Kapsamlı Deneme ve Net Analizi",
    desc: "Deneme sınavı sonuçlarını yükle; güçlü ve zayıf konuları, net artışını ve üniversite sıralamanı anlık olarak görüntüle.",
    detail:
      "Her deneme sonrası ders bazlı net dağılımı, konu kırılımı ve geçmiş denemelerle kıyaslama tek panelde. Hedef sıralamanıza ne kadar yaklaştığınızı görün.",
    bullets: [
      "Ders ve konu bazlı güçlü/zayıf analiz",
      "Net artış grafiği ve trend takibi",
      "Tahmini sıralama & hedef karşılaştırma",
      "PDF rapor olarak dışa aktarma",
    ],
  },
  {
    icon: <PlayCircle className="w-7 h-7" />,
    title: "Akıllı Kaynak & YouTube Önerileri",
    desc: "DORA senin için en iyi ders videolarını, kitapları ve kaynakları konuya göre filtreler ve önerir. Saatler kaybolmaz.",
    detail:
      "Çalıştığın konuya göre filtrelenmiş YouTube ders videoları, kitap önerileri ve tekrar listeleri. Rastgele arama yerine doğrulanmış kaynaklara yönlendirilirsin.",
    bullets: [
      "Konuya özel video & kaynak listesi",
      "Seviyene uygun içerik önerisi",
      "İzleme geçmişi ve tamamlanan kayıtlar",
      "Öğretmen onaylı kaynak havuzu (yakında)",
    ],
  },
  {
    icon: <HeartPulse className="w-7 h-7" />,
    title: "Bilimsel Testler & Ruhsal Durum",
    desc: "Motivasyon, kaygı ve odak seviyeni takip eden bilimsel anketler. DORA seni duygusal olarak da destekler.",
    detail:
      "Kısa bilimsel ölçeklerle motivasyon, sınav kaygısı ve odak düzeyini izle. Sonuçlar DORA tarafından yorumlanır; gerektiğinde koçuna özet sunulur.",
    bullets: [
      "Motivasyon & kaygı ölçekleri",
      "Haftalık duygu durumu grafiği",
      "Kişiselleştirilmiş DORA geri bildirimi",
      "Gizlilik odaklı, öğrenci kontrollü paylaşım",
    ],
  },
  {
    icon: <CalendarCheck className="w-7 h-7" />,
    title: "Öğretmen / Koç Randevu & Takip",
    desc: "Uzman rehberlik koçlarıyla randevu al, seans notlarını görüntüle ve ilerleme raporlarını anlık takip et.",
    detail:
      "Rehberlik koçunla uygulama içinden randevu al, seans notlarını ve ödevlerini tek yerden takip et. Veli ve öğretmen panelleriyle uyumlu ilerleme görünürlüğü.",
    bullets: [
      "Online randevu & hatırlatıcı",
      "Seans notları ve aksiyon maddeleri",
      "Haftalık ilerleme özeti",
      "Öğretmen–öğrenci mesajlaşma (yakında)",
    ],
  },
  {
    icon: <Target className="w-7 h-7" />,
    title: "Hedef Üniversite & Sıralama",
    desc: "Hayalindeki bölüm ve üniversiteyi belirle; güncel netlerinle tahmini sıralamanı ve hedefe kalan mesafeyi gör.",
    detail:
      "Tercih listene göre hedef sıralama aralığı belirlenir. Her deneme ve çalışma haftası sonunda hedefe ne kadar yaklaştığın görsel olarak güncellenir.",
    bullets: [
      "Bölüm & üniversite hedef tanımı",
      "Tahmini sıralama simülasyonu",
      "Hedefe kalan net / konu analizi",
      "DORA ile haftalık hedef hatırlatması",
    ],
  },
  {
    icon: <Bell className="w-7 h-7" />,
    title: "Akıllı Bildirimler & Hatırlatıcı",
    desc: "Çalışma saatleri, deneme günleri ve DORA mesajları için kişiselleştirilmiş bildirimler al.",
    detail:
      "Programındaki oturumlar, yaklaşan denemeler ve koç randevuların için zamanında uyarı alırsın. Bildirim sıklığını sen belirlersin.",
    bullets: [
      "Günlük çalışma hatırlatıcısı",
      "Deneme & randevu bildirimleri",
      "DORA motivasyon mesajları",
      "Sessiz saatler ve hafta sonu modu",
    ],
  },
  {
    icon: <ClipboardList className="w-7 h-7" />,
    title: "Ödev & Görev Takibi",
    desc: "Öğretmeninin verdiği ödevleri, tekrar listelerini ve haftalık görevleri tek listede tamamla.",
    detail:
      "Koçunun atadığı görevler otomatik listelenir; tamamladıkça işaretlersin. Geciken görevler vurgulanır, haftalık özet rapor oluşur.",
    bullets: [
      "Öğretmen atamalı görev listesi",
      "Öncelik ve son tarih etiketleri",
      "Tamamlanma yüzdesi grafiği",
      "Veliye özet paylaşım (opsiyonel)",
    ],
  },
  {
    icon: <Users className="w-7 h-7" />,
    title: "Veli & Öğretmen Paneli",
    desc: "Veliler ilerlemeyi takip eder; öğretmenler sınıf ve öğrenci bazlı raporlara anında ulaşır.",
    detail:
      "Öğrenci gizliliğine saygılı paylaşım sınırlarıyla veli ve öğretmen panelleri senkron çalışır. Kimin neyi gördüğü öğrenci tarafından yönetilebilir.",
    bullets: [
      "Veli için haftalık ilerleme özeti",
      "Öğretmen sınıf panosu",
      "Deneme karşılaştırma raporu",
      "Granüler gizlilik ayarları",
    ],
  },
];

const testimonials = [
  {
    name: "Elif K.",
    role: "YKS Öğrencisi",
    quote:
      "DORA her sabah bana odaklanmam gereken konuyu söylüyor. Program artık gerçekten benim için.",
    image: IMAGE_PATHS.testimonial1,
    imageAlt: "Tek başına ders çalışan YKS öğrencisi kız",
  },
  {
    name: "Can M.",
    role: "LGS Öğrencisi",
    quote:
      "Deneme analizleri sayesinde hangi derste ne kadar ilerlediğimi net görüyorum.",
    image: IMAGE_PATHS.testimonial2,
    imageAlt: "Tek başına ders çalışan LGS öğrencisi erkek",
  },
];

// Deterministik (SSR/hydration güvenli) — Math.random kullanılmıyor.
const PARTICLES = [
  { left: "5%", delay: "0s", duration: "15s", size: 3, color: "#A78BFF" },
  { left: "12%", delay: "3s", duration: "19s", size: 2, color: "#00D4FF" },
  { left: "20%", delay: "1.5s", duration: "16s", size: 4, color: "#4F7CFF" },
  { left: "28%", delay: "5s", duration: "21s", size: 2, color: "#C04BFF" },
  { left: "36%", delay: "2s", duration: "17s", size: 3, color: "#A78BFF" },
  { left: "44%", delay: "6s", duration: "14s", size: 2, color: "#2DE1FF" },
  { left: "52%", delay: "1s", duration: "20s", size: 3, color: "#00D4FF" },
  { left: "60%", delay: "4s", duration: "18s", size: 4, color: "#4F7CFF" },
  { left: "68%", delay: "2.5s", duration: "15s", size: 2, color: "#A78BFF" },
  { left: "76%", delay: "5.5s", duration: "22s", size: 3, color: "#C04BFF" },
  { left: "84%", delay: "0.5s", duration: "17s", size: 2, color: "#2DE1FF" },
  { left: "92%", delay: "3.5s", duration: "19s", size: 3, color: "#00D4FF" },
  { left: "16%", delay: "7s", duration: "16s", size: 2, color: "#4F7CFF" },
  { left: "48%", delay: "8s", duration: "23s", size: 3, color: "#A78BFF" },
  { left: "72%", delay: "6.5s", duration: "18s", size: 2, color: "#2DE1FF" },
  { left: "88%", delay: "4.5s", duration: "20s", size: 4, color: "#C04BFF" },
];

const STARS = [
  { left: "8%", top: "18%", size: 3, delay: "0s", duration: "3s" },
  { left: "18%", top: "42%", size: 2, delay: "1.2s", duration: "2.4s" },
  { left: "26%", top: "12%", size: 2, delay: "0.6s", duration: "3.4s" },
  { left: "34%", top: "55%", size: 3, delay: "2s", duration: "2.8s" },
  { left: "42%", top: "8%", size: 2, delay: "1.6s", duration: "3.2s" },
  { left: "50%", top: "38%", size: 2, delay: "0.3s", duration: "2.6s" },
  { left: "58%", top: "15%", size: 3, delay: "2.4s", duration: "3s" },
  { left: "66%", top: "48%", size: 2, delay: "1s", duration: "2.2s" },
  { left: "74%", top: "10%", size: 2, delay: "0.9s", duration: "3.6s" },
  { left: "82%", top: "40%", size: 3, delay: "1.8s", duration: "2.5s" },
  { left: "90%", top: "20%", size: 2, delay: "0.4s", duration: "3.1s" },
  { left: "14%", top: "62%", size: 2, delay: "2.2s", duration: "2.9s" },
  { left: "38%", top: "70%", size: 2, delay: "1.4s", duration: "3.3s" },
  { left: "62%", top: "66%", size: 3, delay: "0.7s", duration: "2.7s" },
  { left: "86%", top: "58%", size: 2, delay: "2.6s", duration: "3.5s" },
  { left: "30%", top: "30%", size: 2, delay: "1.1s", duration: "2.3s" },
  { left: "54%", top: "58%", size: 2, delay: "0.2s", duration: "3.2s" },
  { left: "70%", top: "28%", size: 3, delay: "1.9s", duration: "2.8s" },
  { left: "4%", top: "35%", size: 2, delay: "0.8s", duration: "3s" },
  { left: "96%", top: "45%", size: 2, delay: "1.3s", duration: "2.6s" },
  { left: "22%", top: "78%", size: 3, delay: "2.1s", duration: "3.2s" },
  { left: "78%", top: "72%", size: 2, delay: "0.5s", duration: "2.4s" },
  { left: "46%", top: "22%", size: 2, delay: "1.7s", duration: "3.4s" },
  { left: "58%", top: "82%", size: 3, delay: "2.8s", duration: "2.9s" },
  { left: "92%", top: "8%", size: 2, delay: "0.15s", duration: "3.1s" },
];

// ─── Decorative layers ────────────────────────────────────────────────────────
function AuroraBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="absolute -top-40 left-1/2 w-[min(820px,95vw)] h-[min(820px,95vw)] rounded-full bg-[#7B2FFF]/38 blur-[100px] md:blur-[160px] animate-aurora-1"
        style={{ marginLeft: "-50%" }}
      />
      <div className="absolute top-0 right-[-80px] w-[min(420px,60vw)] h-[min(420px,60vw)] rounded-full bg-[#00D4FF]/28 blur-[70px] md:blur-[120px] animate-aurora-2" />
      <div className="absolute top-[28%] left-[-60px] w-[min(360px,52vw)] h-[min(360px,52vw)] rounded-full bg-[#4F7CFF]/30 blur-[60px] md:blur-[100px] animate-aurora-3" />
      <div className="absolute bottom-[-100px] right-[18%] w-[min(340px,50vw)] h-[min(340px,50vw)] rounded-full bg-[#C04BFF]/26 blur-[70px] md:blur-[100px] animate-aurora-4" />
      <div className="absolute bottom-[8%] left-[4%] w-[min(300px,46vw)] h-[min(300px,46vw)] rounded-full bg-[#2DE1FF]/22 blur-[60px] md:blur-[90px] animate-aurora-5" />
      <div className="absolute top-[55%] left-[42%] w-[min(200px,35vw)] h-[min(200px,35vw)] rounded-full bg-[#A78BFF]/20 blur-[50px] animate-aurora-2 hidden sm:block" />
      <div
        className="absolute inset-[-50%] animate-sweep"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0 72%, rgba(123,47,255,0.18) 84%, rgba(0,212,255,0.12) 88%, transparent 94%)",
        }}
      />
    </div>
  );
}

function StarField() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {STARS.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-[#DCE8FF] animate-star"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        />
      ))}
    </div>
  );
}

function FloatingParticles() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute bottom-0 rounded-full animate-particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

function PageBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div className="absolute inset-0 page-mesh-layer animate-mesh-drift" />
      <div className="absolute inset-0 page-grid-overlay" />
      <AuroraBackground />
      <StarField />
      <FloatingParticles />
      <div className="absolute top-[30%] left-[12%] w-36 h-36 rounded-full bg-[#7B2FFF]/25 blur-3xl animate-orb-drift" />
      <div
        className="absolute top-[55%] right-[10%] w-44 h-44 rounded-full bg-[#00D4FF]/20 blur-3xl animate-orb-drift"
        style={{ animationDelay: "2.5s" }}
      />
      <div
        className="absolute bottom-[18%] left-[38%] w-28 h-28 rounded-full bg-[#4F7CFF]/22 blur-2xl animate-orb-drift"
        style={{ animationDelay: "5s" }}
      />
    </div>
  );
}

function ScrollReveal({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      el.classList.add("reveal-visible");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("reveal-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} id={id} className={`reveal-section ${className}`}>
      {children}
    </section>
  );
}

// ─── Marka logosu ─────────────────────────────────────────────────────────────
function MindoraLogo({
  priority = false,
  variant = "default",
}: {
  priority?: boolean;
  variant?: "default" | "modal";
}) {
  const sizeClass = variant === "modal" ? "h-20 w-20" : "h-14 w-14";
  return (
    <Image
      src={ICON_SRC}
      alt="MINDORA"
      width={ICON_W}
      height={ICON_H}
      priority={priority}
      quality={100}
      className={`brand-logo ${sizeClass} shrink-0 object-contain select-none`}
    />
  );
}

function LogoLongPressFlip({
  variant = "hero",
  priority = false,
  showHint = false,
}: {
  variant?: "hero" | "header" | "footer";
  priority?: boolean;
  showHint?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePointer = useRef<number | null>(null);

  const clearHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const startHold = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== null) return;
    activePointer.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    clearHold();
    holdTimer.current = setTimeout(() => setFlipped(true), LOGO_HOLD_MS);
  };

  const endHold = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== e.pointerId) return;
    activePointer.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* capture already released */
    }
    clearHold();
    setFlipped(false);
  };

  useEffect(() => () => clearHold(), []);

  const sceneCls =
    variant === "hero"
      ? "w-full max-w-[min(560px,96vw)] h-[min(520px,82vw)] sm:h-[min(560px,78vw)] sm:max-w-[min(600px,94vw)]"
      : variant === "header"
        ? "h-16 w-[min(260px,58vw)] sm:h-[4.5rem] sm:w-[min(300px,52vw)]"
        : "h-[min(300px,70vw)] w-[min(300px,80vw)] md:h-[min(320px,65vw)]";

  const quoteBody =
    variant === "hero" ? MINDORA_TEAM_QUOTE.text : MINDORA_TEAM_QUOTE.short;

  const quoteCls =
    variant === "hero"
      ? "text-xs sm:text-sm leading-relaxed"
      : "text-[10px] sm:text-[11px] leading-snug";

  return (
    <div
      className={`flex flex-col ${variant === "footer" ? "items-start" : "items-center"}`}
    >
      <div
        className={`logo-flip-scene relative ${sceneCls}`}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerCancel={endHold}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: "manipulation" }}
        aria-label="MINDORA logosu — basılı tutunca ekip sözü"
      >
        <div
          className={`logo-flip-inner w-full h-full ${flipped ? "is-flipped" : ""}`}
        >
          <div className="logo-flip-face logo-flip-front flex items-center justify-center">
            <Image
              src={LOGO_SRC}
              alt="MINDORA — Rehber Öğretmen ve Öğrenci Koçluğu Yazılımı"
              fill
              priority={priority}
              quality={100}
              sizes={
                variant === "hero"
                  ? "(max-width: 1024px) 96vw, 600px"
                  : variant === "header"
                    ? "260px"
                    : "300px"
              }
              className={`object-contain ${variant === "hero" ? "brand-logo-hero" : "brand-logo"}`}
              draggable={false}
            />
          </div>

          <div className="logo-flip-face logo-flip-back border border-[#7B2FFF]/40 bg-gradient-to-br from-[#2a1f5c] via-[#1e1a48] to-[#141432] shadow-inner shadow-[#7B2FFF]/20">
            <div
              className={`logo-flip-back-inner flex flex-col items-center justify-center text-center gap-2 ${
                variant === "hero"
                  ? "py-8 px-5 sm:px-7 sm:py-10 gap-3"
                  : "py-5 px-4 sm:py-6"
              }`}
            >
              <Sparkles className="w-5 h-5 text-[#A78BFF] shrink-0" />
              <p className={`text-white/80 italic ${quoteCls} max-w-[95%]`}>
                &ldquo;{quoteBody}&rdquo;
              </p>
              <p className="text-[#A78BFF] text-xs font-semibold tracking-wide pt-1">
                — {MINDORA_TEAM_QUOTE.author}
              </p>
            </div>
          </div>
        </div>
      </div>
      {showHint && (
        <p
          className={`mt-5 text-white/45 text-sm text-center max-w-md transition-all duration-300 ${
            flipped ? "opacity-0 max-h-0 mt-0 overflow-hidden" : "opacity-100"
          }`}
          aria-hidden={flipped}
        >
          Ekip Sözümüz için logoya basılı tutun
        </p>
      )}
    </div>
  );
}

function HeroBrandShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-2xl lg:max-w-none flex items-center justify-center py-8 lg:py-4 min-h-[360px] sm:min-h-[480px] lg:min-h-[600px]">
      <div
        className="absolute inset-[5%] rounded-full bg-[#7B2FFF]/30 blur-[90px] md:blur-[110px] animate-dora-glow pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-[15%] rounded-full bg-[#00D4FF]/18 blur-[70px] animate-aurora-2 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-[25%] rounded-full bg-[#4F7CFF]/15 blur-[50px] animate-aurora-3 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full flex justify-center animate-dora-float">
        <LogoLongPressFlip variant="hero" priority showHint />
      </div>
    </div>
  );
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────
type AuthMode = "student" | "teacher";

function AuthModal({
  mode,
  onClose,
}: {
  mode: AuthMode;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const roleLabel = mode === "student" ? "Öğrenci" : "Öğretmen";
  const roleColor =
    mode === "student"
      ? "from-[#7B2FFF] to-[#4F7CFF]"
      : "from-[#4F7CFF] to-[#00D4FF]";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: mode },
        },
      });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({
          type: "success",
          text: "Kayıt başarılı! E-posta adresinizi doğrulayın.",
        });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage({ type: "error", text: "Hatalı e-posta veya şifre." });
      } else {
        window.location.href = "/dashboard";
      }
    }
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className={`relative w-full max-w-md rounded-3xl border border-white/10 ${cardGradient} p-8 shadow-2xl shadow-[#7B2FFF]/20`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-7 flex flex-col items-center text-center">
          {/* Logo — 3. yerleşim */}
          <MindoraLogo variant="modal" />
          <div
            className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${roleColor} bg-opacity-20`}
          >
            <LogIn className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-bold uppercase tracking-widest">
              {roleLabel} {isSignUp ? "Kaydı" : "Girişi"}
            </span>
          </div>
          <p className="text-white/55 text-sm mt-3">
            {isSignUp
              ? "Hesap oluşturmak için bilgilerini gir."
              : `${roleLabel} hesabına giriş yap.`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/65 text-xs font-semibold mb-1.5 uppercase tracking-wide">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ornek@email.com"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#7B2FFF]/60 transition-all"
            />
          </div>
          <div>
            <label className="block text-white/65 text-xs font-semibold mb-1.5 uppercase tracking-wide">
              Şifre
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-11 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#7B2FFF]/60 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                {showPass ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {message && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                message.type === "error"
                  ? "bg-red-500/10 border border-red-500/20 text-red-400"
                  : "bg-green-500/10 border border-green-500/20 text-green-400"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r ${roleColor} shadow-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {isSignUp ? "Hesap Oluştur" : "Giriş Yap"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage(null);
            }}
            className="text-white/55 hover:text-[#A78BFF] text-sm transition-colors"
          >
            {isSignUp ? (
              <>
                Zaten hesabın var mı?{" "}
                <span className="text-[#A78BFF] font-semibold">Giriş Yap</span>
              </>
            ) : (
              <>
                Hesabın yok mu?{" "}
                <span className="text-[#A78BFF] font-semibold">Kayıt Ol</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Components ───────────────────────────────────────────────────────────────

function Header({
  onOpenAuth,
}: {
  onOpenAuth: (mode: AuthMode) => void;
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-4 px-6 md:px-12 py-3.5 md:py-4 bg-[#141432]/70 backdrop-blur-xl border-b border-white/10">
      {/* Logo — 1. yerleşim */}
      <LogoLongPressFlip variant="header" priority />

      <nav className="flex items-center gap-3">
        <button
          onClick={() => onOpenAuth("student")}
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white/80 border border-white/10 hover:border-[#4F7CFF]/60 hover:text-white transition-all duration-300"
        >
          Öğrenci Girişi
        </button>
        <button
          onClick={() => onOpenAuth("teacher")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] text-white shadow-lg shadow-[#7B2FFF]/30 hover:shadow-[#7B2FFF]/60 hover:scale-105 transition-all duration-300"
        >
          Öğretmen Girişi
        </button>
      </nav>
    </header>
  );
}

function HeroSection({
  onOpenAuth,
}: {
  onOpenAuth: (mode: AuthMode) => void;
}) {
  return (
    <section className="relative px-6 pt-32 pb-20 sm:pt-36 md:pt-44 md:pb-28 overflow-x-hidden">
      <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#7B2FFF]/40 bg-[#7B2FFF]/10 text-[#A78BFF] text-xs font-semibold uppercase tracking-widest mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Yapay Zeka Destekli Eğitim Platformu
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-[3.25rem] font-black leading-tight tracking-tight text-white mb-6">
            Eğitimde{" "}
            <span className={gradientText}>Yeni Nesil</span> Yapay Zeka
            <br className="hidden md:block" /> Destekli Koçluk:{" "}
            <span className={gradientText}>MINDORA</span>
          </h1>

          <p className="text-base sm:text-lg text-white/60 leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
            YKS, LGS ve ara sınıflar için özel olarak tasarlanmış, öğrenciyi
            bütüncül ele alan akıllı rehberlik platformu. Hedefine odaklan,
            gerisini MINDORA halletsin.
          </p>

          <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
            <button
              onClick={() => onOpenAuth("student")}
              className="btn-cta-glow px-8 py-3.5 rounded-full font-bold text-white bg-gradient-to-r from-[#7B2FFF] via-[#4F7CFF] to-[#00D4FF] shadow-xl shadow-[#7B2FFF]/40 hover:shadow-[#7B2FFF]/70 hover:scale-105 transition-all duration-300 text-sm sm:text-base"
            >
              Erken Erişime Katıl →
            </button>
            <a
              href="#features"
              className="px-8 py-3.5 rounded-full font-semibold text-white/70 border border-white/10 hover:border-white/30 hover:text-white transition-all duration-300 text-sm sm:text-base"
            >
              Özellikleri Keşfet
            </a>
          </div>

          <div className="mt-14 grid grid-cols-3 gap-4 sm:gap-8 text-center lg:text-left">
            {[
              { val: "10K+", label: "Aktif Öğrenci" },
              { val: "%94", label: "Hedef Başarısı" },
              { val: "500+", label: "Uzman Koç" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className={`text-2xl sm:text-3xl font-black ${gradientText}`}>
                  {stat.val}
                </p>
                <p className="text-white/55 text-xs sm:text-sm mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <HeroBrandShowcase />
      </div>
    </section>
  );
}

function SocialProofSection() {
  return (
    <ScrollReveal className="px-6 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[#A78BFF] text-xs font-semibold uppercase tracking-widest mb-3">
            Öğrenciler için
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Gerçek öğrenciler,{" "}
            <span className={gradientText}>gerçek sonuçlar</span>
          </h2>
          <p className="mt-4 text-white/55 text-base max-w-xl mx-auto">
            Binlerce öğrenci hedeflerine MINDORA ile ulaşıyor. Sen de aramıza
            katıl.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <div className="relative aspect-[16/10] rounded-3xl overflow-hidden border border-white/10 shadow-xl shadow-[#7B2FFF]/10">
            <Image
              src={IMAGE_PATHS.kids}
              alt="Öğretmen ve öğrencilerin birlikte koçluk seansında çalışması"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#141432]/50 via-transparent to-transparent pointer-events-none"
              aria-hidden="true"
            />
            <div className="absolute bottom-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141432]/75 border border-white/10 backdrop-blur-sm">
              <Users className="w-4 h-4 text-[#A78BFF]" />
              <span className="text-white/70 text-sm font-medium">
                10K+ aktif öğrenci topluluğu
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 justify-center">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className={`rounded-2xl border border-white/8 ${cardGradient} p-6 flex gap-4`}
              >
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-2xl overflow-hidden border border-white/10 ring-1 ring-[#7B2FFF]/20">
                  <Image
                    src={t.image}
                    alt={t.imageAlt}
                    fill
                    sizes="96px"
                    className="object-cover object-center"
                  />
                </div>
                <div>
                  <p className="text-white/65 text-sm leading-relaxed italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <p className="mt-3 text-white font-semibold text-sm">
                    {t.name}
                  </p>
                  <p className="text-white/50 text-xs">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}

function DoraSection() {
  return (
    <ScrollReveal className="relative px-6 py-12 flex justify-center">
      <div
        className={`relative max-w-5xl w-full rounded-3xl border border-[#7B2FFF]/20 ${cardGradient} p-8 md:p-14 overflow-hidden`}
      >
        <div
          className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-[#4F7CFF]/10 blur-[80px] pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -left-16 -bottom-16 w-72 h-72 rounded-full bg-[#7B2FFF]/10 blur-[80px] pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative flex flex-col md:flex-row items-center gap-10">
          {/* DORA — canlı animasyon: dönen aura halkası + glow nabzı + süzülme */}
          <div className="flex-shrink-0 relative w-48 h-48 md:w-60 md:h-60">
            <div
              className="absolute inset-[-14%] rounded-full animate-dora-aura pointer-events-none"
              aria-hidden="true"
              style={{
                background:
                  "conic-gradient(from 0deg, #7B2FFF, #00D4FF, #4F7CFF, #C04BFF, #7B2FFF)",
                filter: "blur(28px)",
              }}
            />
            <div
              className="absolute inset-0 -m-2 rounded-full bg-gradient-to-br from-[#7B2FFF]/40 via-[#4F7CFF]/30 to-[#00D4FF]/30 blur-2xl animate-dora-glow pointer-events-none"
              aria-hidden="true"
            />
            <div className="relative w-full h-full animate-dora-float">
              <Image
                src={DORA_SRC}
                alt="DORA — Yapay Zeka Asistanınız"
                width={DORA_W}
                height={DORA_H}
                quality={100}
                className="h-full w-full object-contain drop-shadow-[0_0_28px_rgba(123,47,255,0.55)]"
              />
            </div>
          </div>

          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2FFF]/15 border border-[#7B2FFF]/30 text-[#A78BFF] text-xs font-semibold uppercase tracking-widest mb-4">
              <Sparkles className="w-3 h-3" />
              AI Yol Arkadaşın
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Yapay Zeka Yol Arkadaşın:{" "}
              <span className={gradientText}>DORA</span>
            </h2>
            <p className="text-white/60 text-base leading-relaxed max-w-xl">
              DORA sadece bir chatbot değil — senin dijital koçun. Her gün
              durumunu analiz eder, kişiselleştirilmiş motivasyon mesajları
              gönderir, doğru kaynakları önerir ve hedeflerine odaklanmanı
              sağlar. Stres mi var? DORA bunu da fark eder ve seni destekler.
            </p>
            <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
              {[
                "Günlük Analiz",
                "Motivasyon Koçu",
                "Kaynak Önerisi",
                "Duygu Takibi",
              ].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs font-semibold text-[#A78BFF] bg-[#7B2FFF]/15 border border-[#7B2FFF]/25"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}

function FeatureCard({
  feature,
  isSelected,
  onOpen,
}: {
  feature: (typeof features)[number];
  isSelected: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`${feature.title} — ayrıntılı bilgi`}
      className={`feature-card-tile w-full min-h-[260px] h-full text-left rounded-2xl border p-7 flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2FFF]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141432] ${
        isSelected
          ? "border-[#7B2FFF]/50 shadow-xl shadow-[#7B2FFF]/25 ring-1 ring-[#7B2FFF]/30"
          : `border-white/8 ${cardGradient} hover:border-[#7B2FFF]/35 hover:shadow-xl hover:shadow-[#7B2FFF]/12`
      }`}
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B2FFF]/30 to-[#4F7CFF]/20 border border-[#7B2FFF]/20 flex items-center justify-center mb-5 text-[#A78BFF]">
        {feature.icon}
      </div>
      <h3 className="text-white font-bold text-base mb-2">{feature.title}</h3>
      <p className="text-white/55 text-sm leading-relaxed flex-1">{feature.desc}</p>
      <p className="mt-4 text-[#A78BFF]/80 text-xs font-medium">
        Ayrıntılar için tıkla →
      </p>
    </button>
  );
}

function FeatureDetailModal({
  feature,
  onClose,
}: {
  feature: (typeof features)[number];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-md feature-modal-backdrop cursor-pointer"
        onClick={onClose}
        aria-label="Pencereyi kapat"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-modal-title"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="feature-modal-panel relative z-10 w-full max-w-lg max-h-[min(90vh,720px)] overflow-y-auto rounded-3xl border border-[#7B2FFF]/40 bg-gradient-to-br from-[#2a1f5c] via-[#1e1a48] to-[#141432] p-8 sm:p-10 shadow-2xl shadow-[#7B2FFF]/35"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 w-10 h-10 rounded-full border border-white/15 bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:border-[#7B2FFF]/50 transition-colors"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B2FFF]/40 to-[#00D4FF]/25 border border-[#7B2FFF]/30 flex items-center justify-center mb-6 text-[#A78BFF]">
          {feature.icon}
        </div>

        <p className="text-[#A78BFF] text-[10px] font-bold uppercase tracking-widest mb-2">
          Ayrıntılı bilgi
        </p>
        <h2
          id="feature-modal-title"
          className="text-2xl sm:text-3xl font-black text-white mb-3 pr-10"
        >
          {feature.title}
        </h2>
        <p className="text-white/55 text-sm leading-relaxed mb-5 border-l-2 border-[#7B2FFF]/40 pl-4">
          {feature.desc}
        </p>
        <p className="text-white/70 text-sm sm:text-base leading-relaxed mb-6">
          {feature.detail}
        </p>

        <ul className="space-y-3">
          {feature.bullets.map((item) => (
            <li
              key={item}
              className="flex gap-3 text-white/60 text-sm leading-relaxed"
            >
              <span className="text-[#00D4FF] shrink-0 mt-1">◆</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-8 w-full py-3 rounded-xl font-semibold text-white/80 border border-white/15 hover:border-[#7B2FFF]/50 hover:text-white transition-colors text-sm"
        >
          Kapat
        </button>
      </div>
    </div>
  );
}

function FeaturesSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const openFeature = (index: number) => setActiveIndex(index);
  const closeFeature = () => setActiveIndex(null);

  return (
    <ScrollReveal id="features" className="px-6 py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#A78BFF] text-xs font-semibold uppercase tracking-widest mb-3">
            Güçlü Araçlar
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">
            Başarın için{" "}
            <span className={gradientText}>Her Şey Burada</span>
          </h2>
          <p className="mt-4 text-white/55 text-base max-w-xl mx-auto">
            MINDORA&apos;nın sunduğu araçlarla eğitim sürecinin her boyutunu
            kontrol altına al.
          </p>
          <p className="mt-3 text-white/40 text-sm">
            Karta tıklayın — dışarıya (sağ/sol) tıklayarak veya Esc ile kapatabilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
          {features.map((f, i) => (
            <FeatureCard
              key={f.title}
              feature={f}
              isSelected={activeIndex === i}
              onOpen={() => openFeature(i)}
            />
          ))}
        </div>
      </div>

      {activeIndex !== null && (
        <FeatureDetailModal
          key={activeIndex}
          feature={features[activeIndex]}
          onClose={closeFeature}
        />
      )}
    </ScrollReveal>
  );
}

function CtaBanner({ onOpenAuth }: { onOpenAuth: (mode: AuthMode) => void }) {
  return (
    <ScrollReveal className="px-6 py-16">
      <div className="max-w-4xl mx-auto rounded-3xl relative overflow-hidden bg-gradient-to-br from-[#7B2FFF]/20 via-[#4F7CFF]/10 to-[#00D4FF]/10 border border-[#7B2FFF]/30 p-10 md:p-16 text-center">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#7B2FFF22_0%,_transparent_70%)] pointer-events-none"
          aria-hidden="true"
        />
        <h2 className="relative text-3xl sm:text-4xl font-black text-white mb-4">
          Erken Erişim için{" "}
          <span className={gradientText}>Hemen Kaydol</span>
        </h2>
        <p className="relative text-white/60 text-base mb-8 max-w-lg mx-auto">
          Sınırlı kontenjan. İlk kullanıcılara özel indirimler ve özel DORA
          özellikleri seni bekliyor.
        </p>
        <button
          onClick={() => onOpenAuth("student")}
          className="btn-cta-glow relative inline-flex items-center gap-2 px-10 py-4 rounded-full font-bold text-white bg-gradient-to-r from-[#7B2FFF] via-[#4F7CFF] to-[#00D4FF] shadow-2xl shadow-[#7B2FFF]/40 hover:shadow-[#7B2FFF]/70 hover:scale-105 transition-all duration-300"
        >
          <Sparkles className="w-4 h-4" />
          Erken Erişime Katıl
        </button>
      </div>
    </ScrollReveal>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#121028]/80 px-6 py-14">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-10">
        <div className="flex flex-col items-center md:items-start">
          {/* Logo — 2. yerleşim */}
          <LogoLongPressFlip variant="footer" />
          <p className="text-white/50 text-sm max-w-xs leading-relaxed mt-4 text-center md:text-left">
            Yapay zeka destekli eğitim koçluğu ve rehberlik platformu.
            Öğrencinin yanında, her adımda.
          </p>
        </div>

        <div className="flex flex-col gap-3 text-center md:text-left">
          <p className="text-white/65 text-xs font-semibold uppercase tracking-widest">
            İletişim
          </p>
          <a
            href="mailto:iletisim@mindora.ai"
            className="flex items-center gap-2 text-white/55 hover:text-white text-sm transition-colors justify-center md:justify-start"
          >
            <Mail className="w-4 h-4" />
            iletisim@mindora.ai
          </a>
          <a
            href="tel:+902121234567"
            className="flex items-center gap-2 text-white/55 hover:text-white text-sm transition-colors justify-center md:justify-start"
          >
            <Phone className="w-4 h-4" />
            +90 212 123 45 67
          </a>
        </div>

        <div className="flex flex-col items-center md:items-end gap-4">
          <p className="text-white/65 text-xs font-semibold uppercase tracking-widest">
            Sosyal Medya
          </p>
          <div className="flex items-center gap-3">
            {[
              { icon: <X className="w-4 h-4" />, href: "#" },
              { icon: <Share2 className="w-4 h-4" />, href: "#" },
              { icon: <Briefcase className="w-4 h-4" />, href: "#" },
            ].map((s, i) => (
              <a
                key={i}
                href={s.href}
                className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/55 hover:text-white hover:border-[#7B2FFF]/60 hover:bg-[#7B2FFF]/10 transition-all duration-300"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/5 text-center">
        <p className="text-white/35 text-xs">
          © {new Date().getFullYear()} MINDORA. Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [authModal, setAuthModal] = useState<AuthMode | null>(null);

  return (
    <div className={`${pageBg} text-white antialiased scroll-smooth`}>
      <PageBackground />
      {authModal && (
        <AuthModal mode={authModal} onClose={() => setAuthModal(null)} />
      )}

      <Header onOpenAuth={setAuthModal} />
      <main>
        <HeroSection onOpenAuth={setAuthModal} />
        <SocialProofSection />
        <DoraSection />
        <FeaturesSection />
        <CtaBanner onOpenAuth={setAuthModal} />
      </main>
      <Footer />
    </div>
  );
}