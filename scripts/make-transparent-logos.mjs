/**
 * Siyah / koyu zemini şeffaflaştırır (yumuşak kenar).
 * Kullanım: node scripts/make-transparent-logos.mjs
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(root, "public");

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} hardCut  — tamamen şeffaf eşik (0–255)
 * @param {number} softEnd  — yumuşak geçiş bitişi
 */
function alphaForPixel(r, g, b, hardCut, softEnd) {
  const lum = Math.max(r, g, b);
  if (lum <= hardCut) return 0;
  if (lum >= softEnd) return 255;
  return Math.round(((lum - hardCut) / (softEnd - hardCut)) * 255);
}

async function removeDarkBg(inputName, outputName, hardCut = 42, softEnd = 95) {
  const input = path.join(publicDir, inputName);
  const output = path.join(publicDir, outputName);

  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = data.length / 4;
  let transparent = 0;

  for (let i = 0; i < pixels; i++) {
    const o = i * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const a = alphaForPixel(r, g, b, hardCut, softEnd);
    data[o + 3] = Math.min(data[o + 3], a);
    if (data[o + 3] < 10) transparent++;
  }

  const pngBuffer = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const trimmed = await sharp(pngBuffer).trim().png().toBuffer();
  const meta = await sharp(trimmed).metadata();

  await sharp(trimmed).toFile(output);

  console.log(
    `✓ ${outputName} (${meta.width}×${meta.height}) — şeffaf %${((transparent / pixels) * 100).toFixed(1)}`
  );
}

await removeDarkBg("mindora-logo.png", "mindora-logo-transparent.png", 48, 105);
await removeDarkBg("mindora-icon.png", "mindora-icon-transparent.png", 48, 105);
await removeDarkBg("dora-icon.png", "dora-icon-transparent.png", 48, 105);
