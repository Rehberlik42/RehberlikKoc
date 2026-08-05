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
        "Üstteki Günlük Hedef’i ayarla. Rozetler ve yük uyarıları buna göre çalışır; tanımsızsa yoğunluk rozeti çıkmaz.",
        "Taslak Modu’nu aç. Hazırlanırken eklediğin görevler öğrenciye görünmez; kartlarda Taslak rozeti çıkar.",
        "Haftayı doldur: birçok konu için Toplu Ekle’yi kullan — Zayıf ve Başlanmayan sekmeleri öğrencinin deneme ve kaynak verisinden gelir, tahminle değil veriye göre kurarsın. Tek bir özel görev veya kaynaklı detay için Görev Ekle panelini aç. Belirli bir güne hızlı Ders atamak için gün kartındaki Hızlı ekle’yi kullan.",
        "Gün sütunlarındaki yoğunluk rozetlerine ve Özet’e bak. Aşırı veya dengesiz günleri sürükle-bırak, Başka Güne Taşı veya Böl ile düzelt.",
        "Program hazır olunca Yayınla ile o haftadaki tüm taslakları birden öğrenciye aç. Taslak yoksa buton pasiftir.",
      ],
    },
    {
      heading: "Hangi yolu kullanmalı",
      content: [
        "Görev Ekle paneli — Tam form: görev türü, ders/konu, kaynak, detaylar ve başka günlere ekleme. Kaydet ve yeni ile tür/ders korunur, ardışık giriş yapılır. Branş Denemesi veya Kitap Okuma gibi özel türler ve kaynaklı işler için bunu tercih et.",
        "Toplu Ekle — Grid’in yerine geçer. Soldaki konu havuzundan seç; sağda tür, süre, kaynak ve gün dağıtımını bir kez ayarla (Sırayla, Hepsi her güne, Tek güne). Önizle ile satırları kontrol et, istemediğini ✕ ile çıkar; sonra N görev ekle. Bir haftayı birçok konuyla, öğrencinin verisine göre kurmak için.",
        "Zayıf — Öğrencinin son denemelerinde başarısız görünen konular. Programı zayıf noktalara göre kurmak için başla buradan.",
        "Başlanmayan — Kaynak takibinde henüz çalışılmamış konular. Açılmamış müfredatı haftaya yerleştirmek için.",
        "Tümü — Tüm konu listesi. Havuz filtrelerine takılmadan elle seçim yapmak için.",
        "Hızlı ekle — Gün kartının altındaki satır. Yalnızca Ders görevi oluşturur; kaynak seçemezsin. Konu yaz, eşleşenden seç; sonda sayı varsa süre olur (örn. türev 40 → 40 dk). Aynı güne peş peşe Ders atamak için.",
      ],
    },
    {
      heading: "Yoğunluk rozetini okuma",
      content: [
        "Günlük Hedef tanımlıysa her gün sütununda dk / hedef yanında rozet görünür. Hedefi başlıktaki Günlük Hedef satırından düzenlersin.",
        "rahat — hedefin %70’inin altında. Güne hâlâ iş ekleyebilirsin.",
        "dengeli — hedefin %70–100’ü. Hedefe yakın; ekleme yapmadan önce diğer günlere bak.",
        "yoğun — hedefin %100–130’ü. Yük artmış; yeni görev eklerken Özet’i kontrol et.",
        "aşırı — hedefin %130’unun üstü. Görevi başka güne taşı, Böl ile böl veya süreyi düşür.",
      ],
    },
    {
      heading: "Klavye kısayolları",
      content: [
        "N — Hızlı ekle’yi açar. Yazı yazarken veya bir diyalog açıkken çalışmaz.",
        "Görev Ekle panelinde Enter sonraki alana geçer. Ctrl/⌘+Enter Kaydet ve yeni; Ctrl/⌘+Shift+Enter Kaydet; Esc paneli kapatır.",
        "Toplu Ekle ekranında Enter sonraki alan, Ctrl/⌘+Enter görevleri ekler, Esc ile Geri dönüp grid’e çıkarsın.",
        "Hızlı ekle satırında Enter eşleşen konuyu seçer, Esc satırı kapatır.",
      ],
    },
    {
      heading: "Taslak modu ve yayınlama",
      content: [
        "Taslak Modu varsayılan olarak kapalıdır; açmazsan eklediğin her görev anında öğrenciye görünür.",
        "Taslak Modu açıkken eklediğin yeni görevler öğrenciye görünmez; kartlarda Taslak rozeti çıkar.",
        "Programı hazırlarken taslak modunda çalış; bitince Yayınla (veya Yayınla (N)) ile o haftadaki tüm taslakları birden öğrenciye aç.",
        "Taslak yoksa Yayınla pasiftir (Yayınlanacak taslak yok).",
      ],
    },
    {
      heading: "Haftayı kopyala, temizle, şablonlar",
      content: [
        "Haftayı Kopyala — görünen haftanın görevlerini sonraki haftaya ekler. Sonraki haftada zaten görev varsa onay ister (Evet, Kopyala).",
        "Programı Temizle — bu haftadaki tüm görevleri siler. Onayda Evet, Temizle ile onaylarsın. Haftada görev yoksa buton pasiftir.",
        "Şablon Olarak Kaydet — bu haftanın görevlerini şablon olarak saklar (görev yoksa pasif).",
        "Şablondan Oluştur — kayıtlı bir şablonu seçip mevcut haftaya uygular / ekler.",
        "Bu Hafta ile bugünün haftasına dönersin; oklarla hafta gezersin. Özet, Program Özeti penceresini açar.",
      ],
    },
    {
      heading: "Sürükle-bırak ve kart menüsü",
      content: [
        "Görevleri tutamaktan sürükleyerek günler arasında taşıyabilirsin.",
        "Kart menüsünde Düzenle paneli açar; Kopyala aynı güne bir kopya ekler; Başka Güne Taşı hedef gün seçtirir.",
        "Tekrarla ile görevi sonraki haftalara çoğaltırsın (1–12 hafta).",
        "Böl, soru sayısı veya süresi olan görevi ikiye böler ve yarısını seçtiğin güne taşır. Sayısal miktar yoksa bölünemez.",
        "Sil ile görevi kaldırırsın. Gün kartından Görev Ekle, Branş Denemesi, Kitap Okuma veya Hızlı ekle ile yeni görev ekleyebilirsin.",
      ],
    },
  ],
};
