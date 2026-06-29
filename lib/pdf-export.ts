import { PDF_EXPORT_BG } from "@/lib/pdf-export-constants";

export { PDF_EXPORT_BG } from "@/lib/pdf-export-constants";

export interface PdfExportOptions {
  /** Dosya adi oneki (tarih otomatik eklenir) */
  filenamePrefix?: string;
  /** PDF ust metninde gorunen rapor basligi */
  reportTitle?: string;
  /** html2canvas olcegi (varsayilan 2 = yuksek cozunurluk) */
  scale?: number;
}

/**
 * Verilen HTML elementini (HTMLElement, element id veya ref) PNG'ye cevirip
 * cok sayfali PDF olarak indirir. Yalnizca tarayicida calisir.
 */
export async function exportElementToPdf(
  target: HTMLElement | string | null,
  options: PdfExportOptions = {}
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("PDF export yalnizca tarayicida kullanilabilir.");
  }

  const el =
    typeof target === "string" ? document.getElementById(target) : target;

  if (!el) {
    throw new Error("PDF icin hedef element bulunamadi.");
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const scale = options.scale ?? 2;
  const reportTitle = options.reportTitle ?? "MINDORA Raporu";

  const canvas = await html2canvas(el, {
    scale,
    backgroundColor: PDF_EXPORT_BG,
    useCORS: true,
    allowTaint: true,
    logging: false,
    ignoreElements: (node) =>
      node.classList.contains("pdf-export-hide") ||
      node.classList.contains("print-hidden"),
    onclone: (_clonedDoc, clonedRoot) => {
      if (clonedRoot instanceof HTMLElement) {
        clonedRoot.style.backgroundColor = PDF_EXPORT_BG;
      }
    },
  });

  const imgData = canvas.toDataURL("image/png", 1.0);
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 10;
  const headerY = 12;

  const dateLabel = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const contentTop = 18;
  const contentWidth = pageWidth - marginX * 2;
  const imgHeightMm = (canvas.height * contentWidth) / canvas.width;

  let heightLeft = imgHeightMm;
  let position = 0;

  const addPageHeader = () => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(167, 139, 255);
    pdf.text(reportTitle, marginX, headerY - 4);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(148, 163, 184);
    pdf.text(dateLabel, pageWidth - marginX, headerY - 4, { align: "right" });

    pdf.setDrawColor(51, 65, 85);
    pdf.line(marginX, headerY, pageWidth - marginX, headerY);
  };

  addPageHeader();
  pdf.addImage(
    imgData,
    "PNG",
    marginX,
    contentTop + position,
    contentWidth,
    imgHeightMm
  );
  heightLeft -= pageHeight - contentTop;

  while (heightLeft > 0) {
    position = heightLeft - imgHeightMm;
    pdf.addPage();
    addPageHeader();
    pdf.addImage(
      imgData,
      "PNG",
      marginX,
      contentTop + position,
      contentWidth,
      imgHeightMm
    );
    heightLeft -= pageHeight - contentTop;
  }

  const dateSlug = new Date().toISOString().slice(0, 10);
  const prefix = options.filenamePrefix ?? "MINDORA-Raporu";
  pdf.save(`${prefix}-${dateSlug}.pdf`);
}
