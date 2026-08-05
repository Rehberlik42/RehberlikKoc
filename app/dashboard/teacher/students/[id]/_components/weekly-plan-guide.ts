import type { HelpGuideSection } from "@/components/ui/HelpGuideButton";

export const WEEKLY_PLAN_GUIDE: {
  title: string;
  sections: HelpGuideSection[];
} = {
  title: "Haftalık Program",
  sections: [
    {
      heading: "Bir haftayı sıfırdan kurma",
      ordered: true,
      content: [
        "Üstteki Günlük Hedef’i ayarla — birim olarak Görev veya Dakika seçebilirsin. Gün başlığındaki renk buna göre değişir.",
        "Taslak Modu’nu aç. Hazırlanırken eklediğin görevler öğrenciye görünmez; etkinlik satırında Taslak rozeti çıkar.",
        "Haftayı doldur: birçok konu için Toplu Ekle’yi kullan — Zayıf ve Başlanmayan sekmeleri öğrencinin deneme ve kaynak verisinden gelir. Tek bir özel görev için matris hücresindeki + ile Görev Ekle panelini aç (gün ve ders ön seçili gelir). Belirli bir güne hızlı Ders atamak için sütun altındaki Hızlı ekle’yi kullan.",
        "Gün başlıklarındaki toplam süreye ve Özet’e bak. Hedef aşımında süre uyarı / tehlike renginde görünür. Aşırı veya dengesiz günleri aynı ders satırı içinde sürükle-bırak, Başka Güne Taşı veya Böl ile düzelt.",
        "Program hazır olunca Yayınla ile o haftadaki tüm taslakları birden öğrenciye aç. Taslak yoksa buton pasiftir.",
      ],
    },
    {
      heading: "Matris nasıl okunur",
      content: [
        "Satırlar dersler (TYT / AYT ayrı satır), sütunlar günlerdir. Bu hafta görevi olmayan ders satırı görünmez.",
        "Hücre içeriği sola dayalıdır. Konu adının başında renkli tür ikonu vardır — deneme ile kitap okuma böyle ayırt edilir.",
        "Aynı konuda tek görev varsa yalnızca ikon + konu adı yeterlidir. Birden fazla görev varsa her biri ayrı satırda: detay varsa (40 soru) yazılır, yoksa tür adı (Konu tekrarı) yazılır.",
        "subject_id’siz görevler (genel deneme, kitap okuma, manuel vb.) en alttaki Diğer grubunda, görev türüne göre alt satırlarda toplanır.",
        "Boş hücre tamamen boştur; hover’da + ile o gün ve derse Görev Ekle açılır. Sütun altındaki Hızlı ekle soluk bir + satırıdır.",
        "Etkinlik veya konu satırına tıklayınca menü açılır: Düzenle, Kopyala, Başka Güne Taşı, Tekrarla, Böl, Sil.",
      ],
    },
    {
      heading: "Hangi yolu kullanmalı",
      content: [
        "Görev Ekle paneli — Tam form: görev türü (Branş Denemesi ve Kitap Okuma dahil), ders/konu, kaynak, detaylar ve başka günlere ekleme. Kaydet ve yeni ile tür/ders korunur, ardışık giriş yapılır.",
        {
          text: "Toplu Ekle — Matrisin yerine geçer. Soldaki konu havuzundan seç; sağda tür, süre, kaynak ve gün dağıtımını bir kez ayarla (Sırayla, Hepsi her güne, Tek güne). Önizle ile satırları kontrol et, istemediğini ✕ ile çıkar; sonra N görev ekle. Havuz sekmeleri:",
          children: [
            "Zayıf — Öğrencinin son denemelerinde başarısız görünen konular. Programı zayıf noktalara göre kurmak için başla buradan.",
            "Başlanmayan — Kaynak takibinde henüz çalışılmamış konular. Açılmamış müfredatı haftaya yerleştirmek için.",
            "Tümü — Tüm konu listesi. Havuz filtrelerine takılmadan elle seçim yapmak için.",
          ],
        },
        "Hızlı ekle — Sütun altındaki soluk + satırı (N). Yalnızca Ders görevi oluşturur; kaynak seçemezsin. Konu yaz, eşleşenden seç; sonda sayı varsa süre olur (örn. türev 40 → 40 dk).",
      ],
    },
    {
      heading: "Günlük hedef ve yoğunluk",
      content: [
        "Günlük Hedef’te birim seçersin: Görev (varsayılan) veya Dakika. Etiket buna göre değişir (5 görev / 240 dk).",
        "Birim Görev ise gün içindeki görev sayısı hedefle karşılaştırılır. Birim Dakika ise görev süreleri toplanır.",
        "Eşikler aynıdır: %70 altı rahat, %70–100 dengeli, %100–130 yoğun, üzeri aşırı. Aşımda gün başlığı uyarı / tehlike renginde görünür; RAHAT / DENGELİ rozetleri yoktur.",
        "Gün başlığında her zaman görev sayısı yazılır; süre girilmişse yanında dakika da görünür (4 görev · 160 dk).",
        "Daha önce dakika hedefi tanımlı öğrenciler Dakika biriminde kalır; yeni varsayılan Görev’dir.",
      ],
    },
    {
      heading: "Klavye kısayolları",
      content: [
        "N — Hızlı ekle’yi açar. Yazı yazarken veya bir diyalog açıkken çalışmaz.",
        "Görev Ekle panelinde Enter sonraki alana geçer. Ctrl/⌘+Enter Kaydet ve yeni; Ctrl/⌘+Shift+Enter Kaydet; Esc paneli kapatır.",
        "Toplu Ekle ekranında Enter sonraki alan, Ctrl/⌘+Enter görevleri ekler, Esc ile Geri dönüp matrise çıkarsın.",
        "Hızlı ekle satırında Enter eşleşen konuyu seçer, Esc satırı kapatır.",
      ],
    },
    {
      heading: "Taslak modu ve yayınlama",
      content: [
        "Taslak Modu varsayılan olarak kapalıdır; açmazsan eklediğin her görev anında öğrenciye görünür.",
        "Taslak Modu açıkken eklediğin yeni görevler öğrenciye görünmez; etkinlik satırında Taslak rozeti çıkar.",
        "Programı hazırlarken taslak modunda çalış; bitince Yayınla (veya Yayınla (N)) ile o haftadaki tüm taslakları birden öğrenciye aç.",
        "Taslak yoksa Yayınla pasiftir (Yayınlanacak taslak yok).",
      ],
    },
    {
      heading: "Üst çubuk (toolbar)",
      content: [
        "Gezinme — ‹ tarih › okları ve Bu Hafta. Haftalar arasında gezinirsin.",
        "Birincil eylemler — Toplu Ekle, Taslak Modu, Yayınla, Özet. Haftayı kurarken sık kullandığın kontroller.",
        "Hafta işlemleri ⌄ — Şablon Olarak Kaydet, Şablondan Oluştur, Haftayı Kopyala; Programı Temizle ayrı grupta ve tehlike renginde. Daha seyrek kullanılan işlemler buradadır.",
        "? — Başlığın yanındaki küçük yardım butonu kullanım kılavuzunu açar; birincil eylem değildir.",
      ],
    },
    {
      heading: "Haftayı kopyala, temizle, şablonlar",
      content: [
        "Bu işlemler üst çubuktaki Hafta işlemleri menüsündedir.",
        "Haftayı Kopyala — görünen haftanın görevlerini sonraki haftaya ekler. Sonraki haftada zaten görev varsa onay ister (Evet, Kopyala).",
        "Programı Temizle — bu haftadaki tüm görevleri siler. Onayda Evet, Temizle ile onaylarsın. Haftada görev yoksa buton pasiftir.",
        "Şablon Olarak Kaydet — bu haftanın görevlerini şablon olarak saklar (görev yoksa pasif).",
        "Şablondan Oluştur — kayıtlı bir şablonu seçip mevcut haftaya uygular / ekler.",
      ],
    },
    {
      heading: "Sürükle-bırak ve görev menüsü",
      content: [
        "Bir görev yalnızca kendi ders satırındaki başka bir güne bırakılabilir. Başka derse sürüklemek engellenir (ders değişmez).",
        "Sürüklerken kaynak satır vurgulanır, diğer satırlar soluklaşır. Aynı hücre içinde sıralama da çalışır.",
        "Taşıma sonrası yalnızca plan_date (ve sıra) güncellenir; subject_id / topic_id değişmez.",
        "Etkinlik menüsünde Düzenle paneli açar; Kopyala aynı güne bir kopya ekler; Başka Güne Taşı hedef gün seçtirir.",
        "Tekrarla ile görevi sonraki haftalara çoğaltırsın (1–12 hafta).",
        "Böl, soru sayısı veya süresi olan görevi ikiye böler ve yarısını seçtiğin güne taşır. Sayısal miktar yoksa bölünemez.",
        "Sil ile görevi kaldırırsın. Branş Denemesi ve Kitap Okuma için Görev Ekle panelindeki tür seçiciyi kullan.",
      ],
    },
  ],
};
