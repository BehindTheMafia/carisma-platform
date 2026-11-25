// @ts-nocheck
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { svg2pdf } from 'svg2pdf.js';
import { type NotaDebitoFormData } from '@/types/notas-debito';
import { type CalibrationOffsets, DEFAULT_OFFSETS } from './calibrationNotaDebitoStorage';

// ── Empresa ───────────────────────────────────────────────────────────────────
const logoUrl = '/logorent.png';
const PDF_FONT_SIZE = 12;

const COMPANY = {
  NAME: 'Maria Auxiliadora Torres Montalvan',
  EMAIL: 'rentcartm26@gmail.com',
  PHONE: '8386-6806 (TIGO) | 76811323 (TIGO) | 2523-6262',
  ADDRESS: 'BO. LA REFORMA, POLICIA NACIONAL 2 1/2C E. MASAYA',
  RUC: '4011107950010N',
};

const COLORS = {
  PRIMARY_BLUE: [26, 74, 140],
  LIGHT_BLUE:   [232, 240, 254],
  GRAY_TEXT:    [80, 80, 80],
  BLACK:        [0, 0, 0],
  WHITE:        [255, 255, 255],
};

const ICON_FILE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M0 64C0 28.7 28.7 0 64 0H224L384 160V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zm224 32V160H320L224 96zM64 288c0 8.8 7.2 16 16 16H304c8.8 0 16-7.2 16-16s-7.2-16-16-16H80c-8.8 0-16 7.2-16 16zm0 96c0 8.8 7.2 16 16 16H304c8.8 0 16-7.2 16-16s-7.2-16-16-16H80c-8.8 0-16 7.2-16 16z"/></svg>`;

// ── Cache logo (recolorado azul, igual que pdfGenerator.ts) ──────────────────
let cachedLogoData: { data: string; w: number; h: number } | null = null;
async function getLogoData() {
  if (cachedLogoData) return cachedLogoData;
  return new Promise<{ data: string; w: number; h: number } | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const tc = COLORS.PRIMARY_BLUE;
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < d.data.length; i += 4) {
        if (d.data[i + 3] > 0) { d.data[i] = tc[0]; d.data[i+1] = tc[1]; d.data[i+2] = tc[2]; }
      }
      ctx.putImageData(d, 0, 0);
      cachedLogoData = { data: canvas.toDataURL('image/png'), w: img.width, h: img.height };
      resolve(cachedLogoData);
    };
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  });
}

// ── Utilidades ────────────────────────────────────────────────────────────────
async function drawIcon(doc: jsPDF, svg: string, cx: number, cy: number, r: number) {
  doc.setFillColor(...COLORS.PRIMARY_BLUE);
  doc.circle(cx, cy, r, 'F');
  if (svg.trim().startsWith('<svg')) {
    const el = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
    el.setAttribute('fill', '#FFFFFF');
    const s = r * 1.1;
    await svg2pdf(el, doc, { x: cx - s/2, y: cy - s/2, width: s, height: s });
  }
}

// Barra de sección ultra-compacta: 5mm alto, retorna y+7.5
async function drawSectionHeader(doc: jsPDF, svg: string, title: string, y: number, W: number, ML: number) {
  doc.setFillColor(...COLORS.LIGHT_BLUE);
  doc.rect(ML, y, W - ML*2, 5, 'F');
  doc.setTextColor(...COLORS.PRIMARY_BLUE);
  doc.setFont('times', 'bold');
  doc.setFontSize(PDF_FONT_SIZE);
  doc.text(title, ML + 10, y + 3.5);
  await drawIcon(doc, svg, ML + 3.2, y + 2.5, 3.2);

  // Línea gris después del título hasta el borde derecho de la barra
  const titleW = doc.getTextWidth(title);
  const lineStartX = ML + 10 + titleW + 3;
  const lineEndX   = W - ML - 1;
  if (lineStartX < lineEndX) {
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.25);
    doc.line(lineStartX, y + 2.7, lineEndX, y + 2.7);
  }

  return y + 7.5;
}

function drawPageDecorations(doc: jsPDF, W: number) {
  const H = doc.internal.pageSize.getHeight();
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFillColor(...COLORS.PRIMARY_BLUE);
    doc.rect(0, 0, W, 4, 'F');
    doc.setFillColor(...COLORS.LIGHT_BLUE);
    doc.rect(0, 4, W, 1.5, 'F');
    doc.setFillColor(...COLORS.PRIMARY_BLUE);
    doc.triangle(W, H, W-35, H, W, H-5, 'F');
    doc.setFillColor(...COLORS.LIGHT_BLUE);
    doc.triangle(W-18, H, W-55, H, W, H-4, 'F');
  }
  doc.setPage(n);
}

// Cuando value está vacío dibuja una línea de escritura; cuando tiene valor muestra el texto
function infoCell(
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  lw = 20,          // ancho de la etiqueta
  lineEndX = 0,     // X final de la línea (0 = automático: hasta borde de columna)
) {
  // Etiqueta
  doc.setFont('times', 'bold'); doc.setFontSize(PDF_FONT_SIZE); doc.setTextColor(...COLORS.GRAY_TEXT);
  doc.text(label, x, y);

  if (value) {
    // Valor disponible: mostrar texto
    doc.setFont('times', 'normal'); doc.setFontSize(PDF_FONT_SIZE); doc.setTextColor(...COLORS.BLACK);
    if (lineEndX > 0) {
      const availableWidth = lineEndX - x - lw;
      const textWidth = doc.getTextWidth(value);
      if (textWidth > availableWidth) {
        doc.setFontSize(PDF_FONT_SIZE * availableWidth / textWidth);
      }
    }
    doc.text(value, x + lw, y);
  } else {
    // Sin valor: dibujar línea de escritura
    const lineStart = x + lw;
    const lineEnd   = lineEndX > 0 ? lineEndX : lineStart + 52; // 52mm de línea por defecto
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.2);
    doc.line(lineStart, y + 0.5, lineEnd, y + 0.5);
  }
}

function fmtDate(s: string) {
  if (!s) return ''; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`;
}

// ── Header: logo y datos de empresa ───────────────────────────────────────────
async function drawHeaderND(doc: jsPDF, W: number, ML: number, ndNumber: string) {
  const rightX = W - ML;
  let cy = 8;

  // Título centrado
  doc.setTextColor(...COLORS.PRIMARY_BLUE);
  doc.setFont('times', 'bold');
  doc.setFontSize(PDF_FONT_SIZE);
  doc.text('NOTA DE DÉBITO', W/2, cy + 4.5, { align: 'center' });
  if (ndNumber) {
    doc.setFontSize(PDF_FONT_SIZE);
    doc.text(`N.º ${ndNumber}`, rightX, cy + 4.5, { align: 'right' });
  }
  cy += 10;

  // Logo y datos de empresa
  try {
    const logo = await getLogoData();
    if (logo) {
      const lh = 28;
      const lw = (logo.w / logo.h) * lh;
      // El margen transparente del PNG permite ampliar el logo sin alargar el encabezado.
      doc.addImage(logo.data, 'PNG', ML, cy - 6, lw, lh);

      const iy = cy + 0.5;
      doc.setFont('times', 'bold');   doc.setFontSize(PDF_FONT_SIZE); doc.setTextColor(...COLORS.PRIMARY_BLUE);
      doc.text(`RUC: ${COMPANY.RUC}`, ML + lw + 6, iy + 4.5);
      doc.text(COMPANY.NAME, rightX, iy + 4.5, { align: 'right' });
      doc.setFont('times', 'normal'); doc.setFontSize(PDF_FONT_SIZE); doc.setTextColor(...COLORS.GRAY_TEXT);
      doc.text(COMPANY.EMAIL,              rightX, iy + 9.4,  { align: 'right' });
      doc.text(`Tel: ${COMPANY.PHONE}`,    rightX, iy + 14.3, { align: 'right' });
      doc.text(COMPANY.ADDRESS,            rightX, iy + 19.2, { align: 'right' });

      cy += 22;
    }
  } catch (_) {}

  // Línea azul separadora
  doc.setDrawColor(...COLORS.PRIMARY_BLUE);
  doc.setLineWidth(0.25);
  doc.line(ML, cy, W - ML, cy);
  return cy + 2.5;
}

// ── Generador principal ───────────────────────────────────────────────────────
async function renderNotaDebitoPDF(
  data: NotaDebitoFormData,
  calibrationOffsets: CalibrationOffsets | undefined,
  tableFontSize: number,
): Promise<jsPDF | null> {
  const offsets = calibrationOffsets || DEFAULT_OFFSETS;
  const off = (b: keyof CalibrationOffsets) => offsets[b] || { x: 0, y: 0 };

  // Media hoja carta horizontal: 215.9 × 139.7 mm
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: [139.7, 215.9] });
  const W = 215.9;
  const ML = 11 + off('general').x;
  const MR = 11;

  // ── 1. HEADER (≈ 0 → 40mm) ───────────────────────────────────────────────
  let y = 4 + off('general').y;
  y = await drawHeaderND(doc, W, ML, data.numero || 'ND-BORRADOR');
  y += off('fecha').y;

  // ── 2. BLOQUE CLIENTE — 3 filas en 2 columnas (≈ 40 → 53mm, 13mm) ────────
  const boxH = 19;
  doc.setFillColor(...COLORS.LIGHT_BLUE);
  doc.rect(ML, y, W - ML - MR, boxH, 'F');
  doc.setDrawColor(...COLORS.PRIMARY_BLUE);
  doc.setLineWidth(0.12);
  doc.rect(ML, y, W - ML - MR, boxH);

  const half = (W - ML - MR) / 2;
  const c1 = ML + 2.5, c2 = ML + half + 2.5;
  const lw = 27;  // ancho etiqueta
  // borde derecho de cada columna (para la línea)
  const col1End = ML + half - 3;
  const col2End = W - MR - 3;
  let ry = y + 5.2;
  const rh = 5.1;

  // Fila 1: Señor(es) | Fecha
  infoCell(doc, c1, ry, 'Señor(es):', data.cliente_nombre || '', lw, col1End);
  infoCell(doc, c2, ry, 'Fecha:', fmtDate(data.fecha), lw, col2End);
  ry += rh;

  // Fila 2: RUC | Condición (puede quedar vacía)
  infoCell(doc, c1, ry, 'RUC/Cédula:', data.cliente_ruc || '', lw, col1End);
  infoCell(doc, c2, ry, 'Condición:', data.condicion_pago || '', lw, col2End);
  ry += rh;

  // Fila 3: Dirección | Referencia
  infoCell(doc, c1, ry, 'Dirección:', data.cliente_direccion || '', lw, col1End);
  const ref = data.renta_numero
    ? `Renta: ${data.renta_numero}`
    : data.factura_numero
    ? `Factura: ${data.factura_numero}`
    : '';
  infoCell(doc, c2, ry, 'Referencia:', ref, lw, col2End);

  y = y + boxH + 1.5 + off('cliente').y;

  // ── 3. EN CONCEPTO DE (≈ 53 → 62mm) ─────────────────────────────────────
  const seccionY = y + off('tabla').y;
  const titleX = ML + 10;
  const titleTxt = 'EN CONCEPTO DE:';

  doc.setFont('times', 'bold');
  doc.setFontSize(PDF_FONT_SIZE);

  // calcular cuántas líneas ocupa el texto
  let descLines: string[] = [];
  if (data.descripcion_general) {
    const titleW = doc.getTextWidth(titleTxt);
    const maxW = Math.max(20, W - MR - titleX - titleW - 4);
    descLines = doc.splitTextToSize(data.descripcion_general.toUpperCase(), maxW);
  }

  const lineH = 5;
  const barH = Math.max(7, 4.8 + descLines.length * lineH);
  doc.setFillColor(...COLORS.LIGHT_BLUE);
  doc.rect(ML, seccionY, W - ML*2, barH, 'F');
  doc.setTextColor(...COLORS.PRIMARY_BLUE);
  doc.setFont('times', 'bold');
  doc.setFontSize(PDF_FONT_SIZE);
  doc.text(titleTxt, titleX, seccionY + 4.8);
  try { await drawIcon(doc, ICON_FILE, ML + 3.2, seccionY + 2.5, 3.2); } catch { /* icono no crítico */ }

  if (descLines.length > 0) {
    doc.text(descLines, titleX + doc.getTextWidth(titleTxt) + 4, seccionY + 4.8);
  } else {
    const titleW = doc.getTextWidth(titleTxt);
    const lineStartX = titleX + titleW + 3;
    const lineEndX = W - ML - 1;
    if (lineStartX < lineEndX) {
      doc.setDrawColor(160, 160, 160);
      doc.setLineWidth(0.25);
      doc.line(lineStartX, seccionY + 2.7, lineEndX, seccionY + 2.7);
    }
  }

  y = seccionY + barH + 2.5;

  const monedaSymbol = data.moneda === "USD" ? "$" : "C$";

  // Las filas vacías solo sirven para una nota sin ítems.
  const MIN_ROWS = data.items?.length ? data.items.length : 5;
  const tableBody = (data.items || []).map((it) => [
    it.codigo || '',
    // cantidad: solo mostrar si es > 0
    it.cantidad > 0 ? it.cantidad.toFixed(0) : '',
    it.descripcion || '',
    it.precio_unitario > 0 ? `${monedaSymbol}${it.precio_unitario.toFixed(2)}` : '',
    it.subtotal > 0 ? `${monedaSymbol}${it.subtotal.toFixed(2)}` : '',
  ]);
  // Rellenar la tabla únicamente cuando todavía no tiene ítems.
  while (tableBody.length < MIN_ROWS) {
    tableBody.push(['', '', '', '', '']);
  }

  const total = data.total || 0;

  autoTable(doc, {
    startY: y,
    margin: { top: 8, bottom: 6, left: ML, right: MR },
    rowPageBreak: 'avoid',
    showFoot: 'lastPage',
    head: [['Código', 'Cant.', 'Descripción', 'Valor Unitario', 'Total']],
    body: tableBody,
    foot: [
      [
        // col 0-2: vacías (Código, Cant., Descripción)
        { content: '', colSpan: 3, styles: { fillColor: COLORS.WHITE, lineColor: COLORS.PRIMARY_BLUE } },
        // col 3: etiqueta TOTAL alineada a la derecha (Valor Unitario)
        { content: 'TOTAL', styles: { halign: 'right', fillColor: COLORS.PRIMARY_BLUE, textColor: COLORS.WHITE, fontStyle: 'bold' } },
        // col 4: monto (Total) alineado a la derecha
        { content: `${monedaSymbol}${total.toFixed(2)}`, styles: { halign: 'right', fillColor: COLORS.PRIMARY_BLUE, textColor: COLORS.WHITE, fontStyle: 'bold' } },
      ],
    ],
    theme: 'grid',
    styles: {
      font: 'times', lineColor: COLORS.PRIMARY_BLUE, lineWidth: 0.1,
      textColor: COLORS.GRAY_TEXT, fontSize: tableFontSize, valign: 'middle', cellPadding: tableFontSize * 0.05,
    },
    headStyles: { fillColor: COLORS.PRIMARY_BLUE, textColor: COLORS.WHITE, fontStyle: 'bold', halign: 'center', fontSize: tableFontSize },
    bodyStyles:  { fillColor: COLORS.WHITE, minCellHeight: tableFontSize * (5.5 / PDF_FONT_SIZE) },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    footStyles: { fontStyle: 'bold', fontSize: tableFontSize, lineWidth: 0.1, lineColor: COLORS.PRIMARY_BLUE },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY ?? y + 38;
  if (doc.internal.getNumberOfPages() !== 1 || finalY > doc.internal.pageSize.getHeight() - 6) return null;

  // ── 5. OBSERVACIONES ──────────────────────────────────────────────────────
  if (data.observaciones) {
    try {
      doc.setFont('times', 'bold');
      doc.setTextColor(...COLORS.PRIMARY_BLUE);
      const obsLabel = 'OBS.:';
      const obsY = finalY + 4 + off('observaciones').y;
      let obsLines: string[] = [];
      let obsFontSize = PDF_FONT_SIZE;
      for (; obsFontSize >= 7; obsFontSize--) {
        doc.setFontSize(obsFontSize);
        const maxW = Math.max(20, W - MR - ML - doc.getTextWidth(obsLabel) - 4);
        obsLines = doc.splitTextToSize(data.observaciones.toUpperCase(), maxW);
        if (obsY + (obsLines.length - 1) * (obsFontSize * 5 / PDF_FONT_SIZE) <= doc.internal.pageSize.getHeight() - 6) break;
      }
      if (obsFontSize < 7) return null;
      doc.text(obsLabel, ML, obsY);
      doc.text(obsLines, ML + doc.getTextWidth(obsLabel) + 4, obsY);
    } catch { /* observaciones no crítico */ }
  }

  // ── 6. DECORACIONES ──────────────────────────────────────────────────────
  drawPageDecorations(doc, W);

  return doc;
}

export async function generateNotaDebitoPDF(
  data: NotaDebitoFormData,
  calibrationOffsets?: CalibrationOffsets,
): Promise<jsPDF> {
  for (const tableFontSize of [12, 11, 10, 9, 8, 7]) {
    const doc = await renderNotaDebitoPDF(data, calibrationOffsets, tableFontSize);
    if (doc) return doc;
  }
  throw new Error('La nota de débito tiene demasiado contenido para una sola página. Reducí los detalles o las observaciones.');
}
