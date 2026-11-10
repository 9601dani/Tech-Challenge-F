import * as XLSX from "xlsx";

type ExcelCell = string | number;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function exportReportExcel(options: {
  title: string;
  headers: string[];
  rows: ExcelCell[][];
  fileName?: string;
  sheetName?: string;
}) {
  const worksheet = XLSX.utils.aoa_to_sheet([options.headers, ...options.rows]);
  worksheet["!cols"] = options.headers.map((header, index) => ({
    wch: Math.min(45, Math.max(header.length + 2, ...options.rows.map((row) => String(row[index] ?? "").length + 2))),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName ?? "Reporte");
  XLSX.writeFile(workbook, options.fileName ?? `${slugify(options.title)}.xlsx`);
}
