import fs from "fs";
import path from "path";

const ROOT = path.resolve("app/dashboard");

const SKIP_REL = new Set([
  "_components/DashboardShell.tsx",
  "student/page.tsx",
  "student/_components/TodayTasks.tsx",
  "student/program/_components/TaskCard.tsx",
  "layout.tsx",
  "admin/layout.tsx",
]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".tsx")) files.push(full);
  }
  return files;
}

function shouldSkip(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
  return SKIP_REL.has(rel);
}

function protectToasts(content) {
  const placeholders = [];
  let i = 0;
  const protectedContent = content.replace(
    /<Toaster[\s\S]*?\/>/g,
    (match) => {
      const key = `__TOASTER_PLACEHOLDER_${i++}__`;
      placeholders.push({ key, match });
      return key;
    }
  );
  return { protectedContent, placeholders };
}

function restoreToasts(content, placeholders) {
  let out = content;
  for (const { key, match } of placeholders) {
    out = out.replace(key, match);
  }
  return out;
}

function transform(content) {
  let s = content;

  // Surfaces / backgrounds
  s = s.replace(/bg-\[#05050f\]/g, "bg-[var(--bg)]");
  s = s.replace(/bg-\[#07070f\]/g, "bg-[var(--bg)]");
  s = s.replace(/bg-\[#07071a\]/g, "bg-[var(--bg)]");
  s = s.replace(/bg-\[#0d0d2b\]/g, "bg-[var(--surface)]");
  s = s.replace(/bg-\[#141432\]/g, "bg-[var(--surface-2)]");
  s = s.replace(/bg-slate-900\/(\d+)/g, "bg-[var(--surface)]/$1");
  s = s.replace(/bg-slate-900\b/g, "bg-[var(--surface)]");
  s = s.replace(/bg-white\/\[0\.03\]/g, "bg-[var(--surface-2)]");
  s = s.replace(/bg-white\/\[0\.04\]/g, "bg-[var(--surface-2)]");
  s = s.replace(/bg-white\/3\b/g, "bg-[var(--surface-2)]");
  s = s.replace(/bg-white\/4\b/g, "bg-[var(--surface-2)]");
  s = s.replace(/bg-white\/5\b/g, "bg-[var(--surface-2)]");

  // Gradient surface pairs
  s = s.replace(/from-\[#0d0d2b\]/g, "from-[var(--surface)]");
  s = s.replace(/to-\[#0d0d2b\]/g, "to-[var(--surface)]");
  s = s.replace(/from-\[#07070f\]/g, "from-[var(--bg)]");
  s = s.replace(/to-\[#07070f\]/g, "to-[var(--bg)]");
  s = s.replace(/from-\[#141432\]/g, "from-[var(--surface-2)]");
  s = s.replace(/to-\[#141432\]/g, "to-[var(--surface-2)]");

  // Brand gradients (3-stop then 2-stop)
  s = s.replace(
    /from-\[#7B2FFF\] via-\[#4F7CFF\] to-\[#00D4FF\]/g,
    "from-[var(--primary)] via-[var(--primary-2)] to-[var(--primary-3)]"
  );
  s = s.replace(
    /from-\[#7B2FFF\] to-\[#4F7CFF\]/g,
    "from-[var(--primary)] to-[var(--primary-2)]"
  );

  // Brand singles in tailwind arbitrary values
  const brandMap = [
    ["#7B2FFF", "var(--primary)"],
    ["#4F7CFF", "var(--primary-2)"],
    ["#00D4FF", "var(--primary-3)"],
    ["#A78BFF", "var(--accent)"],
    ["#C4B5FF", "var(--accent)"],
    ["#7AB3FF", "var(--accent)"],
    ["#70E6FF", "var(--accent)"],
  ];
  for (const [hex, token] of brandMap) {
    const esc = hex.replace("#", "\\#");
    s = s.replace(new RegExp(`\\[${esc}\\]`, "gi"), `[${token}]`);
  }

  // SVG / inline attribute hex (decorative brand only)
  s = s.replace(/stopColor="#7B2FFF"/gi, 'stopColor="var(--primary)"');
  s = s.replace(/stopColor="#4F7CFF"/gi, 'stopColor="var(--primary-2)"');
  s = s.replace(/stopColor="#00D4FF"/gi, 'stopColor="var(--primary-3)"');
  s = s.replace(/stroke="#7B2FFF"/gi, 'stroke="var(--primary)"');
  s = s.replace(/stroke="#4F7CFF"/gi, 'stroke="var(--primary-2)"');
  s = s.replace(/fill="#7B2FFF"/gi, 'fill="var(--primary)"');

  // Borders
  s = s.replace(/border-white\/\d+/g, "border-[var(--border)]");
  s = s.replace(/border-dashed border-\[var\(--border\)\]/g, "border-dashed border-[var(--border)]");

  // Text opacities (longer first)
  const textSecondary = ["90", "85", "80", "75", "70", "65", "60", "55", "50"];
  const textMuted = ["45", "40", "35", "30", "25", "20"];
  for (const o of textSecondary) {
    s = s.replace(new RegExp(`text-white\\/${o}\\b`, "g"), "text-[var(--text-secondary)]");
    s = s.replace(new RegExp(`hover:text-white\\/${o}\\b`, "g"), "hover:text-[var(--text-secondary)]");
  }
  for (const o of textMuted) {
    s = s.replace(new RegExp(`text-white\\/${o}\\b`, "g"), "text-[var(--text-muted)]");
    s = s.replace(new RegExp(`hover:text-white\\/${o}\\b`, "g"), "hover:text-[var(--text-muted)]");
  }
  s = s.replace(/hover:text-white\b/g, "hover:text-[var(--text-primary)]");
  s = s.replace(/text-white\b/g, "text-[var(--text-primary)]");

  // Hover surfaces
  s = s.replace(/hover:bg-white\/5\b/g, "hover:bg-[var(--surface-2)]");
  s = s.replace(/hover:bg-white\/8\b/g, "hover:bg-[var(--surface-2)]");
  s = s.replace(/hover:border-white\/\d+/g, "hover:border-[var(--border)]");

  return s;
}

const files = walk(ROOT);
const changed = [];

for (const file of files) {
  if (shouldSkip(file)) continue;
  const original = fs.readFileSync(file, "utf8");
  const { protectedContent, placeholders } = protectToasts(original);
  const next = restoreToasts(transform(protectedContent), placeholders);
  if (next !== original) {
    fs.writeFileSync(file, next, "utf8");
    changed.push(path.relative(process.cwd(), file).replace(/\\/g, "/"));
  }
}

console.log(`Updated ${changed.length} files:`);
for (const f of changed.sort()) console.log(`  - ${f}`);
