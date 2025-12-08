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

// Helper to load image
const getLogoBase64 = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = '/logo.png';
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      console.warn("Failed to load logo for PDF");
      resolve(null);
    };
  });
};

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
export async function exportToPDF(options: ExportOptions) {
  const { filename, columns, data, title } = options;

  // Create PDF document
  const doc = new jsPDF({ orientation: "landscape" });

  const logoData = await getLogoBase64();
  let startY = 20;

  // Add logo if available
  if (logoData) {
    // Add logo at top left - increased width to fix compression
    doc.addImage(logoData, 'PNG', 14, 10, 50, 15);
  }

  // Add title if provided
  if (title) {
    doc.setFontSize(16);
    const titleY = logoData ? 35 : 20;
    doc.text(title, 14, titleY);
    startY = titleY + 10;
  } else if (logoData) {
    startY = 35;
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
    startY: startY,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      overflow: 'linebreak', // Ensure text wraps and doesn't mess up layout
    },
    headStyles: {
      fillColor: [140, 185, 174], // #8CB9AE
      textColor: 0, // Black text
      fontStyle: "bold",
      halign: 'center',
    },
    columnStyles: {
      // Optional: can customize specific columns if needed
    },
    alternateRowStyles: {
      fillColor: [248, 250, 249],
    },
    margin: { top: 20, left: 10, right: 10 },
  });

  // Save PDF
  doc.save(`${filename}.pdf`);
}

/**
 * Generic export function that respects user's export settings
 */
export async function exportData(
  format: "excel" | "pdf",
  options: ExportOptions
) {
  if (format === "excel") {
    exportToExcel(options);
  } else {
    await exportToPDF(options);
  }
}
