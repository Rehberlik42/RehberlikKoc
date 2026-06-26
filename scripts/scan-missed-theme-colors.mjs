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

const patterns = [
  { name: "bg-hex", re: /bg-\[#([0-9a-fA-F]{3,8})\](?:\/\d+)?/g },
  { name: "from-hex", re: /from-\[#([0-9a-fA-F]{3,8})\](?:\/\d+)?/g },
  { name: "via-hex", re: /via-\[#([0-9a-fA-F]{3,8})\](?:\/\d+)?/g },
  { name: "to-hex", re: /to-\[#([0-9a-fA-F]{3,8})\](?:\/\d+)?/g },
  { name: "text-hex", re: /text-\[#([0-9a-fA-F]{3,8})\](?:\/\d+)?/g },
  { name: "border-hex", re: /border-\[#([0-9a-fA-F]{3,8})\](?:\/\d+)?/g },
  { name: "ring-hex", re: /ring-\[#([0-9a-fA-F]{3,8})\](?:\/\d+)?/g },
  { name: "shadow-hex", re: /shadow-\[#([0-9a-fA-F]{3,8})\](?:\/\d+)?/g },
  { name: "text-white", re: /text-white(?:\/\d+)?/g },
  { name: "border-white", re: /border-white(?:\/\[\d.]+\]|\/?\d+)?/g },
  { name: "bg-white-subtle", re: /bg-white\/(?:\[\d.]+\]|\d+)/g },
  { name: "slate-zinc-gray", re: /bg-(?:slate|zinc|gray|neutral)-(?:8|9)\d{2}(?:\/\d+)?/g },
  { name: "inline-bg-hex", re: /background:\s*["']#([0-9a-fA-F]{3,8})["']/g },
  { name: "inline-bgcolor-hex", re: /backgroundColor:\s*["']#([0-9a-fA-F]{3,8})["']/g },
  { name: "svg-stop", re: /stopColor=["']#([0-9a-fA-F]{3,8})["']/g },
  { name: "svg-stroke", re: /stroke=["']#([0-9a-fA-F]{3,8})["']/g },
  { name: "svg-fill", re: /fill=["']#([0-9a-fA-F]{3,8})["']/g },
  { name: "rgba-slate", re: /rgba\(15,\s*23,\s*42[^)]*\)/g },
  { name: "hex-literal", re: /["']#([0-9a-fA-F]{6})["']/g },
];

function luminance(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

const byFile = {};
const globalCounts = {};

for (const file of walk(ROOT)) {
  const content = fs.readFileSync(file, "utf8");
  const fileCounts = {};

  for (const { re } of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content))) {
      const full = m[0];
      if (full.includes("var(--")) continue;
      fileCounts[full] = (fileCounts[full] || 0) + 1;
      globalCounts[full] = (globalCounts[full] || 0) + 1;
    }
  }

  if (Object.keys(fileCounts).length) byFile[file] = fileCounts;
}

const sortedGlobal = Object.entries(globalCounts).sort((a, b) => b[1] - a[1]);

console.log("=== GLOBAL TOP ===");
for (const [k, v] of sortedGlobal.slice(0, 40)) {
  console.log(`${v}x\t${k}`);
}

console.log("\n=== BY FILE ===");
for (const file of Object.keys(byFile).sort()) {
  console.log(`\n${file}`);
  for (const [k, v] of Object.entries(byFile[file]).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v}x ${k}`);
  }
}
