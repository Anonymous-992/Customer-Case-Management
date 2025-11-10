import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export interface ExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExportColumn[];
  data: any[];
  title?: string;
}

/**
 * Export data to Excel format
 */
export function exportToExcel(options: ExportOptions) {
  const { filename, sheetName = "Sheet1", columns, data } = options;

  // Create header row
  const headers = columns.map(col => col.label);

  // Create data rows
  const rows = data.map(item =>
    columns.map(col => {
      const value = item[col.key];
      return col.format ? col.format(value) : value;
    })
  );

  // Combine headers and rows
  const worksheetData = [headers, ...rows];

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  const colWidths = columns.map(col => ({
    wch: Math.max(col.label.length, 15)
  }));
  worksheet["!cols"] = colWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate Excel file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Export data to PDF format
 */
export function exportToPDF(options: ExportOptions) {
  const { filename, columns, data, title } = options;

  // Create PDF document
  const doc = new jsPDF();

  // Add title if provided
  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, 20);
  }

  // Prepare table data
  const headers = columns.map(col => col.label);
  const rows = data.map(item =>
    columns.map(col => {
      const value = item[col.key];
      return col.format ? col.format(value) : (value?.toString() || "");
    })
  );

  // Add table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: title ? 30 : 20,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 20 },
  });

  // Save PDF
  doc.save(`${filename}.pdf`);
}

/**
 * Generic export function that respects user's export settings
 */
export function exportData(
  format: "excel" | "pdf",
  options: ExportOptions
) {
  if (format === "excel") {
    exportToExcel(options);
  } else {
    exportToPDF(options);
  }
}
