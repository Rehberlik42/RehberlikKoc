"use client";

import {
  Bot,
  Brain,
  BookOpen,
  BarChart2,
  PlayCircle,
  HeartPulse,
  CalendarCheck,
  X,
  Share2,
  Briefcase,
  Mail,
  Phone,
  Sparkles,
  GraduationCap,
} from "lucide-react";

// ─── Utility ──────────────────────────────────────────────────────────────────
const gradientText =
  "bg-gradient-to-r from-[#7B2FFF] via-[#4F7CFF] to-[#00D4FF] bg-clip-text text-transparent";

// ─── Data ─────────────────────────────────────────────────────────────────────
const features = [
  {
    icon: <BookOpen className="w-7 h-7" />,
    title: "Detaylı ve Çok Boyutlu Program",
    desc: "YKS, LGS ve ara sınıflara özel, kişiselleştirilmiş haftalık & günlük ders programları. Hedefine göre dinamik olarak güncellenir.",
  },
  {
    icon: <BarChart2 className="w-7 h-7" />,
    title: "Kapsamlı Deneme ve Net Analizi",
    desc: "Deneme sınavı sonuçlarını yükle; güçlü ve zayıf konuları, net artışını ve üniversite sıralamanı anlık olarak görüntüle.",
  },
  {
    icon: <PlayCircle className="w-7 h-7" />,
    title: "Akıllı Kaynak & YouTube Önerileri",
    desc: "DORA senin için en iyi ders videolarını, kitapları ve kaynakları konuya göre filtreler ve önerir. Saatler kaybolmaz.",
  },
  {
    icon: <HeartPulse className="w-7 h-7" />,
    title: "Bilimsel Testler & Ruhsal Durum",
    desc: "Motivasyon, kaygı ve odak seviyeni takip eden bilimsel anketler. DORA seni duygusal olarak da destekler.",
  },
  {
    icon: <CalendarCheck className="w-7 h-7" />,
    title: "Öğretmen / Koç Randevu & Takip",
    desc: "Uzman rehberlik koçlarıyla randevu al, seans notlarını görüntüle ve ilerleme raporlarını anlık takip et.",
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-[#05050f]/80 backdrop-blur-md border-b border-white/5">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <GraduationCap className="w-7 h-7 text-[#7B2FFF]" />
        <span
          className={`text-2xl font-black tracking-widest uppercase ${gradientText}`}
        >
          MINDORA
        </span>
      </div>

      {/* Nav Buttons */}
      <nav className="flex items-center gap-3">
        <a
          href="#"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white/80 border border-white/10 hover:border-[#4F7CFF]/60 hover:text-white transition-all duration-300"
        >
          Öğrenci Girişi
        </a>
        <a
          href="#"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-[#7B2FFF] to-[#4F7CFF] text-white shadow-lg shadow-[#7B2FFF]/30 hover:shadow-[#7B2FFF]/60 hover:scale-105 transition-all duration-300"
        >
          Öğretmen Girişi
        </a>
      </nav>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 pt-40 pb-32 overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[#7B2FFF]/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-24 right-0 w-[300px] h-[300px] rounded-full bg-[#00D4FF]/8 blur-[100px] pointer-events-none" />

      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#7B2FFF]/40 bg-[#7B2FFF]/10 text-[#A78BFF] text-xs font-semibold uppercase tracking-widest mb-8">
        <Sparkles className="w-3.5 h-3.5" />
        Yapay Zeka Destekli Eğitim Platformu
      </div>

      <h1 className="max-w-4xl text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight text-white mb-6">
        Eğitimde{" "}
        <span className={gradientText}>Yeni Nesil</span>
        {" "}Yapay Zeka
        <br className="hidden md:block" /> Destekli Koçluk:{" "}
        <span className={gradientText}>MINDORA</span>
      </h1>

      <p className="max-w-2xl text-base sm:text-lg text-white/50 leading-relaxed mb-10">
        YKS, LGS ve ara sınıflar için özel olarak tasarlanmış, öğrenciyi
        bütüncül ele alan akıllı rehberlik platformu. Hedefine odaklan,
        gerisini MINDORA halletsin.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <a
          href="#"
          className="px-8 py-3.5 rounded-full font-bold text-white bg-gradient-to-r from-[#7B2FFF] via-[#4F7CFF] to-[#00D4FF] shadow-xl shadow-[#7B2FFF]/40 hover:shadow-[#7B2FFF]/70 hover:scale-105 transition-all duration-300 text-sm sm:text-base"
        >
          Erken Erişime Katıl →
        </a>
        <a
          href="#features"
          className="px-8 py-3.5 rounded-full font-semibold text-white/70 border border-white/10 hover:border-white/30 hover:text-white transition-all duration-300 text-sm sm:text-base"
        >
          Özellikleri Keşfet
        </a>
      </div>

      {/* Floating stats */}
      <div className="mt-20 grid grid-cols-3 gap-6 sm:gap-12 text-center">
        {[
          { val: "10K+", label: "Aktif Öğrenci" },
          { val: "%94", label: "Hedef Başarısı" },
          { val: "500+", label: "Uzman Koç" },
        ].map((stat) => (
          <div key={stat.label}>
            <p className={`text-3xl sm:text-4xl font-black ${gradientText}`}>
              {stat.val}
            </p>
            <p className="text-white/40 text-xs sm:text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DoraSection() {
  return (
    <section className="relative px-6 py-24 flex justify-center">
      <div className="relative max-w-5xl w-full rounded-3xl border border-[#7B2FFF]/20 bg-gradient-to-br from-[#0d0d2b] to-[#07070f] p-8 md:p-14 overflow-hidden">
        {/* Glow */}
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-[#4F7CFF]/10 blur-[80px] pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-72 h-72 rounded-full bg-[#7B2FFF]/10 blur-[80px] pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-center gap-10">
          {/* Icon cluster */}
          <div className="flex-shrink-0 relative">
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl bg-gradient-to-br from-[#7B2FFF]/30 to-[#00D4FF]/20 border border-[#7B2FFF]/30 flex items-center justify-center shadow-2xl shadow-[#7B2FFF]/20">
              <Bot className="w-14 h-14 md:w-20 md:h-20 text-[#A78BFF]" />
            </div>
            <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-xl bg-gradient-to-br from-[#4F7CFF] to-[#7B2FFF] flex items-center justify-center shadow-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B2FFF]/15 border border-[#7B2FFF]/30 text-[#A78BFF] text-xs font-semibold uppercase tracking-widest mb-4">
              <Sparkles className="w-3 h-3" />
              AI Yol Arkadaşın
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Yapay Zeka Yol Arkadaşın:{" "}
              <span className={gradientText}>DORA</span>
            </h2>
            <p className="text-white/50 text-base leading-relaxed max-w-xl">
              DORA sadece bir chatbot değil — senin dijital koçun. Her gün
              durumunu analiz eder, kişiselleştirilmiş motivasyon mesajları
              gönderir, doğru kaynakları önerir ve hedeflerine odaklanmanı
              sağlar. Stres mi var? DORA bunu da fark eder ve seni destekler.
            </p>
            <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
              {["Günlük Analiz", "Motivasyon Koçu", "Kaynak Önerisi", "Duygu Takibi"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full text-xs font-semibold text-[#A78BFF] bg-[#7B2FFF]/15 border border-[#7B2FFF]/25"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#A78BFF] text-xs font-semibold uppercase tracking-widest mb-3">
            Güçlü Araçlar
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">
            Başarın için{" "}
            <span className={gradientText}>Her Şey Burada</span>
          </h2>
          <p className="mt-4 text-white/40 text-base max-w-xl mx-auto">
            MINDORA'nın sunduğu araçlarla eğitim sürecinin her boyutunu kontrol altına al.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`group relative rounded-2xl border border-white/5 bg-gradient-to-br from-[#0d0d2b]/80 to-[#07070f]/80 p-7 hover:border-[#7B2FFF]/40 hover:shadow-xl hover:shadow-[#7B2FFF]/10 transition-all duration-500 cursor-default ${
                i === 4 ? "sm:col-span-2 lg:col-span-1" : ""
              }`}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#7B2FFF]/0 to-[#00D4FF]/0 group-hover:from-[#7B2FFF]/5 group-hover:to-[#00D4FF]/5 transition-all duration-500" />

              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B2FFF]/30 to-[#4F7CFF]/20 border border-[#7B2FFF]/20 flex items-center justify-center mb-5 text-[#A78BFF] group-hover:scale-110 transition-transform duration-300">
                  {f.icon}
                </div>
                <h3 className="text-white font-bold text-base mb-2 group-hover:text-[#A78BFF] transition-colors duration-300">
                  {f.title}
                </h3>
                <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBanner() {
  return (
    <section className="px-6 py-16">
      <div className="max-w-4xl mx-auto rounded-3xl relative overflow-hidden bg-gradient-to-br from-[#7B2FFF]/20 via-[#4F7CFF]/10 to-[#00D4FF]/10 border border-[#7B2FFF]/30 p-10 md:p-16 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#7B2FFF22_0%,_transparent_70%)] pointer-events-none" />
        <h2 className="relative text-3xl sm:text-4xl font-black text-white mb-4">
          Erken Erişim için <span className={gradientText}>Hemen Kaydol</span>
        </h2>
        <p className="relative text-white/50 text-base mb-8 max-w-lg mx-auto">
          Sınırlı kontenjan. İlk kullanıcılara özel indirimler ve özel DORA
          özellikleri seni bekliyor.
        </p>
        <a
          href="#"
          className="relative inline-flex items-center gap-2 px-10 py-4 rounded-full font-bold text-white bg-gradient-to-r from-[#7B2FFF] via-[#4F7CFF] to-[#00D4FF] shadow-2xl shadow-[#7B2FFF]/40 hover:shadow-[#7B2FFF]/70 hover:scale-105 transition-all duration-300"
        >
          <Sparkles className="w-4 h-4" />
          Erken Erişime Katıl
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#05050f] px-6 py-14">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-10">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-6 h-6 text-[#7B2FFF]" />
            <span className={`text-xl font-black tracking-widest uppercase ${gradientText}`}>
              MINDORA
            </span>
          </div>
          <p className="text-white/30 text-sm max-w-xs leading-relaxed">
            Yapay zeka destekli eğitim koçluğu ve rehberlik platformu. Öğrencinin yanında, her adımda.
          </p>
        </div>

        {/* Contact */}
        <div className="flex flex-col gap-3 text-center md:text-left">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">İletişim</p>
          <a
            href="mailto:iletisim@mindora.ai"
            className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors"
          >
            <Mail className="w-4 h-4" />
            iletisim@mindora.ai
          </a>
          <a
            href="tel:+902121234567"
            className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors"
          >
            <Phone className="w-4 h-4" />
            +90 212 123 45 67
          </a>
        </div>

        {/* Social */}
        <div className="flex flex-col items-center md:items-end gap-4">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">Sosyal Medya</p>
          <div className="flex items-center gap-3">
            {[
              { icon: <X className="w-4 h-4" />, href: "#" },
              { icon: <Share2 className="w-4 h-4" />, href: "#" },
              { icon: <Briefcase className="w-4 h-4" />, href: "#" },
            ].map((s, i) => (
              <a
                key={i}
                href={s.href}
                className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-[#7B2FFF]/60 hover:bg-[#7B2FFF]/10 transition-all duration-300"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/5 text-center">
        <p className="text-white/20 text-xs">
          © {new Date().getFullYear()} MINDORA. Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen bg-[#05050f] text-white antialiased scroll-smooth">
      <Header />
      <main>
        <HeroSection />
        <DoraSection />
        <FeaturesSection />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
