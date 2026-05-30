import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const htmlPath = path.join(root, "docs/MINDORA-PROJE-DOKUMANTASYONU.html");
const outPath = path.join(root, "docs/MINDORA-PROJE-DOKUMANTASYONU.pdf");

if (!fs.existsSync(htmlPath)) {
  console.error("HTML dosyasi bulunamadi:", htmlPath);
  process.exit(1);
}

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
await page.pdf({
  path: outPath,
  format: "A4",
  printBackground: true,
  margin: { top: "18mm", right: "16mm", bottom: "18mm", left: "16mm" },
});
await browser.close();
console.log("PDF olusturuldu:", outPath);
