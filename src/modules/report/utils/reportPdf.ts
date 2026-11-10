import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

type PdfCell = string | number;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export async function exportReportPdf(options: {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: PdfCell[][];
  fileName?: string;
}) {
  const pdfMakeModule = await import("pdfmake/build/pdfmake.min.js");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts.js");
  const pdfMake = ((pdfMakeModule as unknown as { default?: any }).default ?? pdfMakeModule) as any;
  const fonts = pdfFontsModule as unknown as {
    pdfMake?: { vfs?: Record<string, string> };
    default?: { pdfMake?: { vfs?: Record<string, string> }; vfs?: Record<string, string> };
  };
  const vfs = fonts.pdfMake?.vfs ?? fonts.default?.pdfMake?.vfs ?? fonts.default?.vfs;
  if (vfs) pdfMake.vfs = vfs;

  const tableBody: Content[][] = [
    options.headers.map((header) => ({ text: header, style: "tableHeader" })),
    ...options.rows.map((row) => row.map((cell) => String(cell))),
  ];
  const document: TDocumentDefinitions = {
    pageOrientation: options.headers.length > 4 ? "landscape" : "portrait",
    pageMargins: [32, 36, 32, 36],
    content: [
      { text: "SHOPCART", style: "brand" },
      { text: options.title, style: "title" },
      ...(options.subtitle ? [{ text: options.subtitle, style: "subtitle" } as Content] : []),
      {
        table: { headerRows: 1, widths: Array(options.headers.length).fill("*") as string[], body: tableBody },
        layout: "lightHorizontalLines",
      },
    ],
    styles: {
      brand: { color: "#dc2626", bold: true, characterSpacing: 2, fontSize: 9, margin: [0, 0, 0, 8] },
      title: { color: "#171a36", bold: true, fontSize: 18, margin: [0, 0, 0, 4] },
      subtitle: { color: "#64748b", fontSize: 9, margin: [0, 0, 0, 16] },
      tableHeader: { color: "#2f2eaa", bold: true, fontSize: 9 },
    },
    defaultStyle: { fontSize: 9, color: "#334155" },
  };

  pdfMake.createPdf(document).download(options.fileName ?? `${slugify(options.title)}.pdf`);
}
