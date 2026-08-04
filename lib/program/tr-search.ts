/**
 * Türkçe karakterleri ASCII karşılıklarına indirger (arama eşlemesi için).
 * "ogrenci" yazınca "öğrenci" bulunur.
 */
export function foldTr(input: string): string {
  return input
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

/** foldTr ile haystack içinde needle arar; boş needle her şeyi eşler. */
export function matchesTr(haystack: string, needle: string): boolean {
  const n = foldTr(needle.trim());
  if (!n) return true;
  return foldTr(haystack).includes(n);
}
