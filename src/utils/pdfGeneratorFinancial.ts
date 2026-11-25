// @ts-nocheck
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { type DatosReporteFinancieroCalculados } from "@/lib/reportes-pdf-query";

const logoUrl = "/logorent.png";

const COLORS = {
  NAVY_BLUE: [30, 58, 138],     // #1E3A8A
  SLATE_HEADER: [51, 65, 85],   // #334155
  LIGHT_BG: [248, 250, 252],    // #F8FAFC
  TEXT_DARK: [15, 23, 42],      // #0F172A
  MUTED_GRAY: [100, 116, 139],  // #64748B
  BORDER_GRAY: [226, 232, 240], // #E2E8F0
  GOLD: [200, 155, 60],         // #C89B3C
  EMERALD: [16, 185, 129],      // #10B981
  ROSE: [225, 29, 72],          // #E11D48
};

// Formateador de moneda contable (ej. US$ 2,450.50 o C$ 18,550.20)
function formatMoneyPDF(amount: number, moneda: string): string {
  const symbol = moneda === "USD" ? "US$" : "C$";
  const num = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? "-" : "";
  return `${sign}${symbol} ${num}`;
}

// Carga de logo en base64
let cachedLogoData: { data: string; w: number; h: number } | null = null;
async function getLogoData(): Promise<{ data: string; w: number; h: number } | null> {
  if (cachedLogoData) return cachedLogoData;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        cachedLogoData = {
          data: canvas.toDataURL("image/png"),
          w: img.width,
          h: img.height,
        };
        resolve(cachedLogoData);
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  });
}

export async function generarPDFReporteFinanciero(
  data: DatosReporteFinancieroCalculados
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter", // 215.9 x 279.4 mm
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  // 1. Cargar Logo
  const logoInfo = await getLogoData();

  // ── ENCABEZADO DE PÁGINA 1 ──────────────────────────────────────────────────
  let y = 12;

  if (logoInfo) {
    const logoHeight = 16;
    const logoWidth = (logoInfo.w / logoInfo.h) * logoHeight;
    doc.addImage(logoInfo.data, "PNG", marginX, y, logoWidth, logoHeight);
  }

  // Nombre y datos de la empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.NAVY_BLUE);
  doc.text(data.empresaInfo.nombre, marginX + 36, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.MUTED_GRAY);
  doc.text(`RUC: ${data.empresaInfo.ruc}`, marginX + 36, y + 8);
  doc.text(`Dirección: ${data.empresaInfo.direccion}`, marginX + 36, y + 12);
  doc.text(`Tel: ${data.empresaInfo.telefono} · Email: ${data.empresaInfo.correo}`, marginX + 36, y + 16);

  // Título del documento (Derecha)
  const esOperativo = data.filtros.tipoDocumento === "operativo_completo";
  const docTitle = esOperativo
    ? "ESTADO DE RESULTADOS OPERATIVO"
    : "ESTADO DE RESULTADOS (FLOTA PROPIA)";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.NAVY_BLUE);
  doc.text(docTitle, pageWidth - marginX, y + 4, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.MUTED_GRAY);
  doc.text(`Período: ${data.periodoLabel}`, pageWidth - marginX, y + 9, { align: "right" });
  doc.text(`Moneda: ${data.moneda} (T.C. 1 USD = ${data.tipoCambio} NIO)`, pageWidth - marginX, y + 13, { align: "right" });
  doc.text(`Emisión: ${data.fechaEmision}`, pageWidth - marginX, y + 17, { align: "right" });

  y += 24;

  // Línea divisoria decorativa
  doc.setDrawColor(...COLORS.NAVY_BLUE);
  doc.setLineWidth(0.8);
  doc.line(marginX, y, pageWidth - marginX, y);

  y += 6;

  // ── SECCIÓN 1: INGRESOS OPERATIVOS ──────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.NAVY_BLUE);
  doc.text("1. INGRESOS OPERATIVOS", marginX, y);
  y += 3;

  const ingresosBody = data.ingresosDetalle.map((item) => [
    item.concepto,
    formatMoneyPDF(item.subtotal, data.moneda),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["CONCEPTO DE INGRESO", "SUBTOTAL"]],
    body: ingresosBody,
    foot: [
      [
        "TOTAL INGRESOS OPERATIVOS",
        formatMoneyPDF(data.totalIngresos, data.moneda),
      ],
    ],
    theme: "grid",
    margin: { left: marginX, right: marginX },
    headStyles: {
      fillColor: COLORS.NAVY_BLUE,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    footStyles: {
      fillColor: COLORS.LIGHT_BG,
      textColor: COLORS.NAVY_BLUE,
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: COLORS.TEXT_DARK,
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 50, halign: "right", fontStyle: "bold" },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── SECCIÓN 2: EGRESOS OPERATIVOS POR CATEGORÍA ─────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.NAVY_BLUE);
  doc.text("2. EGRESOS OPERATIVOS POR CATEGORÍA", marginX, y);
  y += 3;

  const egresosBody = data.egresosCategorizados.map((item) => [
    item.categoriaLabel,
    `${item.cantidadMovimientos} movimiento(s)`,
    formatMoneyPDF(item.subtotal, data.moneda),
  ]);

  if (egresosBody.length === 0) {
    egresosBody.push(["Sin egresos registrados en el período", "0", formatMoneyPDF(0, data.moneda)]);
  }

  autoTable(doc, {
    startY: y,
    head: [["CATEGORÍA DE GASTO", "MOVIMIENTOS", "SUBTOTAL"]],
    body: egresosBody,
    foot: [
      [
        "TOTAL EGRESOS OPERATIVOS",
        "",
        formatMoneyPDF(data.totalEgresosOperativos, data.moneda),
      ],
    ],
    theme: "grid",
    margin: { left: marginX, right: marginX },
    headStyles: {
      fillColor: COLORS.SLATE_HEADER,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    footStyles: {
      fillColor: COLORS.LIGHT_BG,
      textColor: COLORS.ROSE,
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: COLORS.TEXT_DARK,
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 40, halign: "center", textColor: COLORS.MUTED_GRAY },
      2: { cellWidth: 50, halign: "right", fontStyle: "bold" },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── SECCIÓN 3: COSTO DE SUBARRENDOS (Solo en Operativo Completo) ────────────
  if (esOperativo && data.subarriendosTabla.length > 0) {
    // Si la tabla supera el espacio restante, saltar de página
    if (y > pageHeight - 60) {
      doc.addPage();
      y = 16;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.NAVY_BLUE);
    doc.text("3. DETALLE DE VEHÍCULOS SUBARRENDADOS (PROVEEDORES)", marginX, y);
    y += 3;

    const subBody = data.subarriendosTabla.map((s) => [
      s.vehiculo,
      s.cliente,
      `${s.dias} día(s)`,
      formatMoneyPDF(s.precioVendido, data.moneda),
      formatMoneyPDF(s.costoProveedor, data.moneda),
      formatMoneyPDF(s.utilidad, data.moneda),
      `${s.margenPct.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [
        [
          "VEHÍCULO",
          "CLIENTE",
          "DÍAS",
          "PRECIO VENDIDO",
          "COSTO PROVEEDOR",
          "UTILIDAD",
          "MARGEN %",
        ],
      ],
      body: subBody,
      foot: [
        [
          "TOTAL SUBARRIENDOS",
          "",
          "",
          formatMoneyPDF(data.totalPrecioVendidoSubarriendos, data.moneda),
          formatMoneyPDF(data.totalCostoProveedorSubarriendos, data.moneda),
          formatMoneyPDF(data.totalUtilidadSubarriendos, data.moneda),
          "",
        ],
      ],
      theme: "grid",
      margin: { left: marginX, right: marginX },
      headStyles: {
        fillColor: [109, 40, 217], // Violeta corporativo
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      footStyles: {
        fillColor: COLORS.LIGHT_BG,
        textColor: COLORS.NAVY_BLUE,
        fontStyle: "bold",
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: COLORS.TEXT_DARK,
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 32, halign: "right" },
        4: { cellWidth: 32, halign: "right", textColor: COLORS.ROSE },
        5: { cellWidth: 30, halign: "right", fontStyle: "bold", textColor: COLORS.EMERALD },
        6: { cellWidth: 20, halign: "right" },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── SECCIÓN 4: CASCADA Y ESTADO DE RESULTADOS EJECUTIVO ────────────────────
  if (y > pageHeight - 65) {
    doc.addPage();
    y = 16;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.NAVY_BLUE);
  doc.text("RESUMEN DE ESTADO DE RESULTADOS", marginX, y);
  y += 3;

  const resumenRows = [];

  if (esOperativo) {
    resumenRows.push(
      ["Total Ingresos Brutos", formatMoneyPDF(data.totalIngresos, data.moneda)],
      ["(-) Costo de Subarriendos (Proveedores)", `-${formatMoneyPDF(data.totalCostoProveedorSubarriendos, data.moneda)}`],
      ["(=) Utilidad Bruta", formatMoneyPDF(data.utilidadBruta, data.moneda)],
      ["(-) Egresos Operativos Generales", `-${formatMoneyPDF(data.totalEgresosOperativos, data.moneda)}`],
      ["(=) UTILIDAD OPERATIVA / NETA REAL", formatMoneyPDF(data.utilidadNeta, data.moneda)],
      ["MARGEN NETO OPERATIVO (%)", `${data.margenNetaPct.toFixed(2)}%`]
    );
  } else {
    resumenRows.push(
      ["Total Ingresos (Flota Propia)", formatMoneyPDF(data.totalIngresos, data.moneda)],
      ["(-) Gastos Operativos (Flota Propia)", `-${formatMoneyPDF(data.totalEgresosOperativos, data.moneda)}`],
      ["(=) UTILIDAD NETA (FLOTA PROPIA)", formatMoneyPDF(data.utilidadNeta, data.moneda)],
      ["MARGEN NETO (%)", `${data.margenNetaPct.toFixed(2)}%`]
    );
  }

  autoTable(doc, {
    startY: y,
    head: [["CONCEPTO FINANCIERO", "IMPORTE / PORCENTAJE"]],
    body: resumenRows,
    theme: "plain",
    margin: { left: marginX, right: marginX },
    headStyles: {
      fillColor: COLORS.NAVY_BLUE,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: COLORS.TEXT_DARK,
    },
    columnStyles: {
      0: { cellWidth: "auto", fontStyle: "bold" },
      1: { cellWidth: 60, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (hookData) => {
      // Destacar la fila de utilidad neta
      if (
        hookData.row.cells[0]?.raw?.toString().includes("UTILIDAD OPERATIVA") ||
        hookData.row.cells[0]?.raw?.toString().includes("UTILIDAD NETA")
      ) {
        hookData.cell.styles.fillColor = [236, 253, 245]; // Verde menta claro
        hookData.cell.styles.textColor = COLORS.EMERALD;
        hookData.cell.styles.fontSize = 9.5;
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // ── SECCIÓN DE FIRMAS Y LEYENDA (Al final) ──────────────────────────────────
  if (y > pageHeight - 45) {
    doc.addPage();
    y = 25;
  } else {
    y += 10;
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.MUTED_GRAY);
  doc.text(
    "Documento generado automáticamente por el sistema ERP Carisma Platform. Toda la información ha sido auditada y calculada conforme a las reglas contables registradas.",
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 16;

  // Cuadros de Firma
  const col1X = marginX + 20;
  const col2X = pageWidth - marginX - 60;
  const lineW = 50;

  doc.setDrawColor(...COLORS.MUTED_GRAY);
  doc.setLineWidth(0.5);

  // Firma 1
  doc.line(col1X, y, col1X + lineW, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.TEXT_DARK);
  doc.text("Firma Responsable Administrativo", col1X + lineW / 2, y + 4, { align: "center" });

  // Firma 2
  doc.line(col2X, y, col2X + lineW, y);
  doc.text("Firma Contabilidad", col2X + lineW / 2, y + 4, { align: "center" });

  // ── ENCABEZADO Y PIE DE PÁGINA EN TODAS LAS PÁGINAS ──────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  const printTimestamp = new Date().toLocaleString("es-ES");

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Pie de página
    doc.setDrawColor(...COLORS.BORDER_GRAY);
    doc.setLineWidth(0.4);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.MUTED_GRAY);
    doc.text(
      `ERP Carisma Platform · Impreso el ${printTimestamp} · Generado por: ${data.usuarioEmisor}`,
      marginX,
      pageHeight - 7
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, pageHeight - 7, {
      align: "right",
    });
  }

  return doc;
}
