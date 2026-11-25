// @ts-nocheck
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { type CalibrationOffsets, DEFAULT_OFFSETS } from './calibrationStorage';
import { getLogoData, getCustomLabel } from './pdfGenerator';
import { esFacturaPorConceptos, calcularTotalConceptos, calcularImporteConcepto, facturaConceptosSchema } from '@/lib/factura-conceptos';

const BLACK = [0, 0, 0];
const WHITE = [255, 255, 255];

const fmt = (val) => {
    const num = parseFloat(val);
    if (!num) return '';
    return `$${num.toFixed(2)}`;
};
const fmtc = (val) => {
    const num = parseFloat(val);
    if (!num) return '';
    return `C$${num.toFixed(2)}`;
};

const fmtDateStr = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d} / ${m} / ${y}`;
};

function setupPDF() {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' });
    return { doc, W: 215.9, H: 279.4, ML: 15, MR: 15 };
}

// Replicate original drawHeader EXACTLY but only draw the invoice number value (no labels, no company info, no line)
async function drawHeader(doc, W, ML, y, docTitle, invoiceNum = null) {
    let currentY = 8;
    const midX = W / 2;
    const rightX = W - ML;

    currentY += 12;

    if (docTitle === 'CONFIRMACIÓN DE RESERVA') {
        currentY += 5;
    }

    try {
        const logo = await getLogoData();
        if (logo) {
            const logoHeight = 48;
            currentY += Math.max(logoHeight, 24) + 8;
        }
    } catch (e) { }

    if (currentY === 12) currentY = 20;

    if (invoiceNum) {
        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...BLACK);
        doc.text(invoiceNum, W - ML, currentY, { align: 'right' });
    }

    return currentY + 10;
}

// Replicate original drawSectionHeader EXACTLY but invisible - just returns y + 10
function drawSectionHeader(y) {
    return y + 10;
}

// Replicate original twoColRow EXACTLY but only draw value (no label, no line)
function twoColRow(doc, ML, y, value, W) {
    const LW = 45;
    doc.setFont('times', 'normal');
    doc.setTextColor(...BLACK);
    doc.text(value || '', ML + LW, y);
    return y + 7;
}

// Replicate original writeText EXACTLY but only draw text (no title, but space allocated based on title length)
function writeText(doc, W, ML, y, title, text) {
    if (!text) return y;
    const startX = ML + 2;
    let titleWidth = 0;
    if (title) {
        doc.setFont('times', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...BLACK);
        doc.text(title, startX, y);
        titleWidth = doc.getTextWidth(title) + 1.5;
    }

    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BLACK);

    const availableWidthFirstLine = (W - ML * 2 - 4) - titleWidth;
    const availableWidthRest = W - ML * 2 - 4;

    if (doc.getTextWidth(text) <= availableWidthFirstLine) {
        doc.text(text, startX + titleWidth, y);
        return y + 4.5;
    } else {
        const words = text.split(' ');
        let currentLine = '';
        const lines = [];
        let isFirstLine = true;

        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const targetWidth = isFirstLine ? availableWidthFirstLine : availableWidthRest;
            if (doc.getTextWidth(testLine) <= targetWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = word;
                isFirstLine = false;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }

        if (lines.length > 0) {
            doc.text(lines[0], startX + titleWidth, y);
        }
        let currentY = y;
        for (let i = 1; i < lines.length; i++) {
            currentY += 4;
            doc.text(lines[i], startX, currentY);
        }
        return currentY + 4.5;
    }
}

// Replicate original drawBankFooter but draw everything invisibly (white on white, no border lines)
function drawBankFooterInvisible(doc, W, ML, y) {
    const accounts = [
        ['Banpro (Billetera Móvil - C$)', '83866806'],
        ['BAC (C$)', '364544957'],
        ['BAC ($)', '364990713'],
        ['Grupo LAFISE ($)', '117290083'],
        ['Avanz ($)', '114605530102'],
        ['FICOSA ($)', '23646501000012'],
    ];

    const half = Math.ceil(accounts.length / 2);
    const leftCol = accounts.slice(0, half);
    const rightCol = accounts.slice(half);

    const bodyRows = [];
    for (let i = 0; i < half; i++) {
        const l = leftCol[i] || ['', ''];
        const r = rightCol[i] || ['', ''];
        bodyRows.push([l[0], l[1], r[0], r[1]]);
    }

    // Advance y for invisible labels
    y += 5; // INFORMACIÓN DE PAGO
    y += 5; // María Auxiliadora Torres Montalvan

    autoTable(doc, {
        startY: y,
        head: [['CUENTA', 'NÚMERO', 'CUENTA', 'NÚMERO']],
        body: bodyRows,
        theme: 'grid',
        margin: { left: ML, right: ML },
        styles: {
            font: 'times',
            fontSize: 7,
            textColor: WHITE,
            lineColor: WHITE,
            lineWidth: 0,
            cellPadding: 1.2,
            fillColor: WHITE,
        },
        headStyles: {
            fillColor: WHITE,
            textColor: WHITE,
            fontStyle: 'bold',
            fontSize: 7,
            halign: 'center',
            lineColor: WHITE,
            lineWidth: 0,
        },
        columnStyles: {
            0: { halign: 'left', cellWidth: (W - ML * 2) * 0.35 },
            1: { halign: 'right', cellWidth: (W - ML * 2) * 0.15 },
            2: { halign: 'left', cellWidth: (W - ML * 2) * 0.35 },
            3: { halign: 'right', cellWidth: (W - ML * 2) * 0.15 },
        },
        bodyStyles: { fillColor: WHITE, textColor: WHITE, lineColor: WHITE, lineWidth: 0 },
        alternateRowStyles: { fillColor: WHITE },
    });

    return doc.lastAutoTable.finalY + 3;
}

export async function generateFacturaPreprinted(data, calibrationOffsets?: CalibrationOffsets) {
    if (esFacturaPorConceptos(data)) facturaConceptosSchema.parse(data);
    const rawFecha = data.fechaDoc || data.fecha;
    const normalizedData = {
        ...data,
        fechaDoc: rawFecha ? String(rawFecha).slice(0, 10) : undefined,
    };
    const offsets: CalibrationOffsets = calibrationOffsets || DEFAULT_OFFSETS;
    const { doc, W, ML: baseML } = setupPDF();
    const ML = baseML + offsets.general.x;
    let y = offsets.general.y;

    // --- HEADER (same flow as original genFactura) ---
    y = await drawHeader(doc, W, ML, y, 'FACTURA', normalizedData.facturaNum || normalizedData.docNum || '______');
    y += offsets.fecha.y;

    // --- CLIENT SECTION (same flow as original) ---
    y += offsets.cliente.y;

    // Date value at same position as original: ML + 45, y - 10
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...BLACK);
    doc.text(fmtDateStr(data.fechaDoc), ML + 45, y - 10);

    // Section header returns y + 10 (same as original drawSectionHeader)
    y = drawSectionHeader(y);

    // Client data values at same positions as original twoColRow
    y = twoColRow(doc, ML, y, data.cliente, W);
    y = twoColRow(doc, ML, y, data.ruc, W);
    const telCorreo = [data.telefono, data.correo].filter(Boolean).join('  |  ');
    y = twoColRow(doc, ML, y, telCorreo, W);
    y = twoColRow(doc, ML, y, data.direccion, W);
    y += 2;

    // --- MONEY SECTION (same flow as original) ---
    y += offsets.tabla.y;

    // Section header returns y + 10
    y = drawSectionHeader(y);
    y += 2;

    const porConceptos = esFacturaPorConceptos(data);
    const sub = porConceptos ? calcularTotalConceptos(data.conceptosFactura) : (parseFloat(data.dias) || 0) * (parseFloat(data.precio) || 0);

    let choferTotal = 0, viaticosTotal = 0, hospedajeTotal = 0;
    if (!porConceptos && data.hasOtrosServicios) {
        choferTotal = (parseFloat(data.choferDias) || 0) * (parseFloat(data.choferPrecio) || 0);
        viaticosTotal = (parseFloat(data.viaticosDias) || 0) * (parseFloat(data.viaticosPrecio) || 0);
        hospedajeTotal = (parseFloat(data.hospedajeDias) || 0) * (parseFloat(data.hospedajePrecio) || 0);
    }

    const deposito = porConceptos ? 0 : parseFloat(data.deposito) || 0;
    const tasa = parseFloat(data.tasa) || 36.6243;
    const conceptosNIO = porConceptos && data.monedaConceptos === 'NIO';
    const totalUSD = conceptosNIO ? sub / tasa : sub + deposito + choferTotal + viaticosTotal + hospedajeTotal;
    const totalNIO = conceptosNIO ? sub : totalUSD * tasa;
    const hasExtras = choferTotal > 0 || viaticosTotal > 0 || hospedajeTotal > 0;
    const blank = v => {
        const val = parseFloat(v);
        if (!val) return '';
        return String(v);
    };
    const hasRenta = (parseFloat(data.dias) > 0 || parseFloat(data.precio) > 0);
    const hasDep = (parseFloat(data.deposito) > 0) || !!data.depositoLabel;
    const hasChof = (parseFloat(data.choferDias) > 0 || parseFloat(data.choferPrecio) > 0) || !!data.choferLabel;
    const hasViat = (parseFloat(data.viaticosDias) > 0 || parseFloat(data.viaticosPrecio) > 0) || !!data.viaticosLabel;
    const hasHosp = (parseFloat(data.hospedajeDias) > 0 || parseFloat(data.hospedajePrecio) > 0) || !!data.hospedajeLabel;

    // Identical body rows to original — empty strings '' for empty values
    const bodyRows = porConceptos ? (data.conceptosFactura || []).map(item => [
        item.descripcion.trim(), String(item.cantidad), conceptosNIO ? fmtc(item.precioUnitario) : fmt(item.precioUnitario), conceptosNIO ? fmtc(calcularImporteConcepto(item)) : fmt(calcularImporteConcepto(item)),
    ]) : [
        hasExtras
            ? [hasRenta ? 'Renta del Vehículo' : '', hasRenta ? blank(data.dias) : '', hasRenta ? fmt(data.precio) : '', '', hasRenta ? fmt(sub) : '']
            : [hasRenta ? 'Renta del Vehículo' : '', hasRenta ? blank(data.dias) : '', hasRenta ? fmt(data.precio) : '', hasRenta ? fmt(sub) : ''],
        hasExtras
            ? [hasDep ? getCustomLabel('deposito', 'Depósito en Garantía', data) : '', '', '', '', hasDep ? fmt(data.deposito) : '']
            : [hasDep ? getCustomLabel('deposito', 'Depósito en Garantía', data) : '', '', '', hasDep ? fmt(data.deposito) : ''],
        hasExtras
            ? [hasChof ? getCustomLabel('chofer', 'Servicio de Chofer', data) : '', hasChof ? blank(data.choferDias) : '', hasChof ? fmt(data.choferPrecio) : '', '', hasChof ? fmt(choferTotal) : '']
            : [hasChof ? getCustomLabel('chofer', 'Servicio de Chofer', data) : '', hasChof ? blank(data.choferDias) : '', hasChof ? fmt(data.choferPrecio) : '', hasChof ? fmt(choferTotal) : ''],
        hasExtras
            ? [hasViat ? getCustomLabel('viaticos', 'Viáticos', data) : '', hasViat ? blank(data.viaticosDias) : '', hasViat ? fmt(data.viaticosPrecio) : '', '', hasViat ? fmt(viaticosTotal) : '']
            : [hasViat ? getCustomLabel('viaticos', 'Viáticos', data) : '', hasViat ? blank(data.viaticosDias) : '', hasViat ? fmt(data.viaticosPrecio) : '', hasViat ? fmt(viaticosTotal) : ''],
        hasExtras
            ? [hasHosp ? getCustomLabel('hospedaje', 'Hospedaje', data) : '', hasHosp ? blank(data.hospedajeDias) : '', hasHosp ? fmt(data.hospedajePrecio) : '', '', hasHosp ? fmt(hospedajeTotal) : '']
            : [hasHosp ? getCustomLabel('hospedaje', 'Hospedaje', data) : '', hasHosp ? blank(data.hospedajeDias) : '', hasHosp ? fmt(data.hospedajePrecio) : '', hasHosp ? fmt(hospedajeTotal) : ''],
    ];

    // Same header text as original (affects column width calculation) — invisible via headStyles
    const tableHead = porConceptos ? [['Concepto', 'Cantidad', 'Precio unitario', 'Importe']] : hasExtras
        ? [['Concepto', 'Días', 'Monto/Día', 'Chofer', 'Subtotal']]
        : [['Concepto', 'Días', 'Monto/Día', 'Subtotal']];

    const footColSpan = hasExtras ? 4 : 3;

    // Same autoTable config as original — let autoTable auto-calculate column widths
    autoTable(doc, {
        startY: y,
        head: tableHead,
        body: bodyRows,
        showFoot: porConceptos ? 'lastPage' : 'everyPage',
        foot: [
            [{ content: '', colSpan: footColSpan, styles: { halign: 'right', textColor: WHITE, fillColor: WHITE, fontStyle: 'bold', lineColor: WHITE, lineWidth: 0 } }, { content: fmt(totalUSD), styles: { textColor: BLACK, fillColor: WHITE, fontStyle: 'bold', lineColor: WHITE, lineWidth: 0 } }],
            [{ content: '', colSpan: footColSpan, styles: { halign: 'right', fillColor: WHITE, textColor: WHITE, fontStyle: 'bold', lineColor: WHITE, lineWidth: 0 } }, { content: fmtc(totalNIO), styles: { fillColor: WHITE, textColor: BLACK, fontStyle: 'bold', lineColor: WHITE, lineWidth: 0 } }],
        ],
        theme: 'grid',
        margin: { left: ML, right: ML },
        styles: {
            font: 'times',
            lineColor: WHITE,
            lineWidth: 0,
            textColor: BLACK,
            fontSize: 8.5,
            valign: 'middle',
            halign: 'center',
            fillColor: WHITE,
        },
        headStyles: {
            fillColor: WHITE,
            textColor: WHITE,
            fontStyle: 'bold',
            halign: 'center',
            lineColor: WHITE,
            lineWidth: 0,
        },
        bodyStyles: { fillColor: WHITE, textColor: BLACK },
        alternateRowStyles: { fillColor: WHITE },
        columnStyles: porConceptos ? {
            0: { halign: 'left', cellWidth: (W - ML * 2) * 0.58 },
            1: { cellWidth: (W - ML * 2) * 0.12 },
            2: { cellWidth: (W - ML * 2) * 0.15 },
            3: { cellWidth: (W - ML * 2) * 0.15 },
        } : { 0: { halign: 'left' } },
        footStyles: { fontStyle: 'bold', fontSize: 9, lineWidth: 0, lineColor: WHITE, fillColor: WHITE },
    });
    y = doc.lastAutoTable.finalY + 4;
    y += offsets.totales.y;

    // --- BANK FOOTER: skipped but y advanced (drawn invisibly to maintain exact matching layout positions) ---
    y = drawBankFooterInvisible(doc, W, ML, y + 4);

    // --- NOTA & OBSERVACIONES (same flow as original writeText) ---
    y = writeText(doc, W, ML, y + 4 + offsets.observaciones.y, 'Nota:', data.nota);
    y = writeText(doc, W, ML, y, 'Observaciones:', data.obs);

    // --- SIGNATURES (same position as original) ---
    const sigY = 265 + offsets.firmas.y + offsets.general.y;
    const midX = W / 2;

    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text(data.cliente || '', (midX + 10 + W - ML - 5) / 2, sigY + 5, { align: 'center' });

    return doc;
}
