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
        "Üstteki Günlük Hedef’i ayarla. Gün başlığındaki süre rengi buna göre değişir; tanımsızsa yalnızca toplam dakika görünür.",
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
        "Hücrede konu adı bir kez yazılır; altında tür ikonu + kısa açıklama (örn. 40 soru, 30 dk, Konu tekrarı) listelenir. Ders adı hücrede tekrarlanmaz.",
        "subject_id’siz görevler (genel deneme, kitap okuma, manuel vb.) en alttaki Diğer grubunda, görev türüne göre alt satırlarda toplanır.",
        "Boş hücrede yalnızca — işareti vardır. Hücreye gelince sağ üstteki + ile o gün ve derse Görev Ekle açılır.",
        "Etkinlik satırına tıklayınca menü açılır: Düzenle, Kopyala, Başka Güne Taşı, Tekrarla, Böl, Sil.",
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
        "Hızlı ekle — Her gün sütununun en altındaki satır. Yalnızca Ders görevi oluşturur; kaynak seçemezsin. Konu yaz, eşleşenden seç; sonda sayı varsa süre olur (örn. türev 40 → 40 dk).",
      ],
    },
    {
      heading: "Yoğunluk ve süre rengi",
      content: [
        "Günlük Hedef tanımlıysa gün başlığında dk / hedef görünür. RAHAT / DENGELİ rozetleri yoktur; bilgi renkli sürededir.",
        "Hedefin %100–130’ü — süre uyarı renginde (yoğun).",
        "Hedefin %130’unun üstü — süre tehlike renginde (aşırı). Görevi başka güne taşı, Böl ile böl veya süreyi düşür.",
        "Hedef tanımsızsa yalnızca toplam dakika nötr renkte gösterilir.",
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
