import fs from "fs";
import path from "path";

const ROOT = "app/dashboard";

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (e.name.endsWith(".tsx")) files.push(p.replace(/\\/g, "/"));
  }
  return files;
}

const darkHexPatterns = [
  /bg-\[#([0-9a-fA-F]{3,8})\](?:\/\d+)?/g,
  /from-\[#([0-9a-fA-F]{3,8})\](?:\/\d+)?/g,
  /via-\[#([0-9a-fA-F]{3,8})\](?:\/\d+)?/g,
  /to-\[#([0-9a-fA-F]{3,8})\](?:\/\d+)?/g,
  /text-\[#([0-9a-fA-F]{3,8})\](?:\/\d+)?/g,
  /border-\[#([0-9a-fA-F]{3,8})\](?:\/\d+)?/g,
  /ring-\[#([0-9a-fA-F]{3,8})\](?:\/\d+)?/g,
  /shadow-\[#([0-9a-fA-F]{3,8})\](?:\/\d+)?/g,
  /ring-offset-\[#([0-9a-fA-F]{3,8})\]/g,
];

const brandHex = ["7B2FFF", "4F7CFF", "00D4FF", "A78BFF", "C4B5FF", "7AB3FF", "70E6FF"];

function luminance(hex) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isDarkHex(hex) {
  return luminance(hex) < 120;
}

const otherPatterns = [
  { key: "text-white", re: /\btext-white(?:\/\d+)?/g },
  { key: "border-white", re: /\bborder-white(?:\/\[\d.]+\]|\/?\d+)?/g },
  { key: "bg-white-subtle", re: /\bbg-white\/(?:\[\d.]+\]|\d+)/g },
  { key: "slate-zinc-gray", re: /\bbg-(?:slate|zinc|gray|neutral)-(?:8|9)\d{2}(?:\/\d+)?/g },
  { key: "brand-hex-literal", re: /#(?:7[Bb]2[Ff][Ff]{2}|4[Ff]7[Cc][Ff]{2}|00[Dd]4[Ff]{2}|[Aa]78[Bb][Ff]{2})/g },
  { key: "inline-dark-bg", re: /background:\s*["']#(0[d-fD-F][0-9a-fA-F]{5}|0[a-fA-F][0-9a-fA-F]{5}|1[0-4][0-9a-fA-F]{4})/g },
  { key: "rgba-slate", re: /rgba\(15,\s*23,\s*42[^)]*\)/g },
];

function scanFile(file) {
  const content = fs.readFileSync(file, "utf8");
  const findings = new Map();

  for (const re of darkHexPatterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content))) {
      const full = m[0];
      if (full.includes("var(--")) continue;
      const hex = m[1];
      if (!isDarkHex(hex) && !brandHex.includes(hex.toUpperCase())) continue;
      findings.set(full, (findings.get(full) || 0) + 1);
    }
  }

  // brand hex in className even if not dark
  const brandClass = /(?:from|via|to|text|bg|border|ring|shadow)-\[#([0-9a-fA-F]{3,8})\](?:\/\d+)?/gi;
  brandClass.lastIndex = 0;
  let bm;
  while ((bm = brandClass.exec(content))) {
    const full = bm[0];
    if (full.includes("var(--")) continue;
    if (brandHex.includes(bm[1].toUpperCase())) {
      findings.set(full, (findings.get(full) || 0) + 1);
    }
  }

  for (const { re } of otherPatterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content))) {
      const full = m[0];
      if (full.includes("var(--")) continue;
      findings.set(full, (findings.get(full) || 0) + 1);
    }
  }

  const usesPortal = /createPortal/.test(content);
  const isModal =
    usesPortal ||
    /Modal/.test(path.basename(file)) ||
    /modal-backdrop|fixed inset-0.*z-\d+/.test(content);
  const isReportPdf =
    /pdf|Pdf|PDF|Export|Report|Rapor/i.test(file) ||
    /MINDORA Raporu|PdfReport|exportElementToPdf/i.test(content);

  if (findings.size === 0) return null;

  return {
    file,
    findings: Object.fromEntries(
      [...findings.entries()].sort((a, b) => b[1] - a[1])
    ),
    total: [...findings.values()].reduce((a, b) => a + b, 0),
    usesPortal,
    isModal,
    isReportPdf,
  };
}

const results = walk(ROOT)
  .map(scanFile)
  .filter(Boolean)
  .sort((a, b) => b.total - a.total);

const modals = results.filter((r) => r.isModal);
const reports = results.filter((r) => r.isReportPdf);
const rest = results.filter((r) => !r.isModal && !r.isReportPdf);

console.log(JSON.stringify({ modals, reports, rest, summary: { files: results.length, totalMatches: results.reduce((s,r)=>s+r.total,0) } }, null, 2));
