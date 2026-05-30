import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { jsPDF } from "jspdf";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const mdPath = path.join(root, "docs/MINDORA-PROJE-DOKUMANTASYONU.md");
const outPath = path.join(root, "docs/MINDORA-PROJE-DOKUMANTASYONU.pdf");

const md = fs.readFileSync(mdPath, "utf8");

// Basit markdown temizleme — PDF metin akisi icin
const text = md
  .replace(/^```[\s\S]*?```/gm, (block) =>
    block.replace(/```\w*\n?/g, "").trim()
  )
  .replace(/^#+\s+/gm, "")
  .replace(/\*\*(.*?)\*\*/g, "$1")
  .replace(/\*(.*?)\*/g, "$1")
  .replace(/`(.*?)`/g, "$1")
  .replace(/^\|.*\|$/gm, (line) =>
    line.replace(/\|/g, " ").replace(/-+/g, "").trim()
  )
  .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
  .replace(/^---+$/gm, "")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

const pageWidth = pdf.internal.pageSize.getWidth();
const pageHeight = pdf.internal.pageSize.getHeight();
const marginX = 18;
const marginTop = 20;
const marginBottom = 18;
const maxWidth = pageWidth - marginX * 2;
const lineHeight = 5.2;
const titleLineHeight = 7;

pdf.setFont("helvetica", "normal");
pdf.setFontSize(10);

let y = marginTop;
const lines = text.split("\n");

function addPageHeader(isFirst) {
  if (!isFirst) {
    pdf.addPage();
    y = marginTop;
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(123, 47, 255);
  pdf.text("MINDORA — Proje Dokumantasyonu", marginX, 12);
  pdf.setDrawColor(200, 200, 210);
  pdf.line(marginX, 14, pageWidth - marginX, 14);
  pdf.setTextColor(30, 30, 40);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  y = marginTop;
}

function ensureSpace(needed = lineHeight) {
  if (y + needed > pageHeight - marginBottom) {
    addPageHeader(false);
  }
}

addPageHeader(true);

for (let i = 0; i < lines.length; i++) {
  const raw = lines[i];
  const line = raw.trimEnd();

  if (!line.trim()) {
    y += lineHeight * 0.6;
    continue;
  }

  // Baslik satirlari (markdown # kaldirildiktan sonra buyuk harfle baslayan bolumler)
  const isSection =
    /^[0-9]+\.\s/.test(line) ||
    line === "MINDORA (rehberlik-koc) — Kapsamlı Proje Dokümantasyonu".replace(
      /ı/g,
      "i"
    ) ||
    /^MINDORA/.test(line) ||
    (line.length < 60 &&
      !line.startsWith("-") &&
      !line.startsWith("|") &&
      lines[i + 1]?.trim() === "");

  if (/^[0-9]+\.\s/.test(line) || /^MINDORA \(rehberlik-koc\)/.test(line)) {
    ensureSpace(titleLineHeight + 2);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(line.startsWith("MINDORA") ? 16 : 13);
    pdf.setTextColor(30, 30, 40);
    const wrapped = pdf.splitTextToSize(line, maxWidth);
    for (const w of wrapped) {
      ensureSpace(titleLineHeight);
      pdf.text(w, marginX, y);
      y += titleLineHeight;
    }
    y += 1.5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    continue;
  }

  if (line.startsWith("- ") || line.startsWith("* ")) {
    const content = line.replace(/^[-*]\s+/, "");
    const bulletLines = pdf.splitTextToSize(content, maxWidth - 6);
    for (let j = 0; j < bulletLines.length; j++) {
      ensureSpace(lineHeight);
      const prefix = j === 0 ? "• " : "  ";
      pdf.text(prefix + bulletLines[j], marginX + 2, y);
      y += lineHeight;
    }
    continue;
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(40, 40, 50);
  const wrapped = pdf.splitTextToSize(line, maxWidth);
  for (const w of wrapped) {
    ensureSpace(lineHeight);
    pdf.text(w, marginX, y);
    y += lineHeight;
  }
}

// Son sayfa footer
const totalPages = pdf.getNumberOfPages();
for (let p = 1; p <= totalPages; p++) {
  pdf.setPage(p);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(140, 140, 150);
  pdf.text(
    `Sayfa ${p} / ${totalPages}`,
    pageWidth - marginX,
    pageHeight - 8,
    { align: "right" }
  );
}

pdf.save(outPath);
console.log("PDF olusturuldu:", outPath);
