// @ts-nocheck
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { svg2pdf } from 'svg2pdf.js';
import suvImgUrl from '@/assets/SUV.png';
import pickupImgUrl from '@/assets/PICKUP.png';
import sedanImgUrl from '@/assets/SEDAN.png';

const logoUrl = '/logorent.png';

const ICON_USER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M463 448.2C440.9 409.8 399.4 384 352 384L288 384C240.6 384 199.1 409.8 177 448.2C212.2 487.4 263.2 512 320 512C376.8 512 427.8 487.3 463 448.2zM64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320zM320 336C359.8 336 392 303.8 392 264C392 224.2 359.8 192 320 192C280.2 192 248 224.2 248 264C248 303.8 280.2 336 320 336z"/></svg>`;
const ICON_CAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M135.2 117.4L109.1 192H402.9l-26.1-74.6C372.3 104.6 360.2 96 346.6 96H165.4c-13.6 0-25.7 8.6-30.2 21.4zM39.6 196.8L74.8 96.3C88.3 57.8 124.6 32 165.4 32H346.6c40.8 0 77.1 25.8 90.6 64.3l35.2 100.5c23.2 9.6 39.6 32.5 39.6 59.2V400v48c0 17.7-14.3 32-32 32H448c-17.7 0-32-14.3-32-32V400H96v48c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32V400 256c0-26.7 16.4-49.6 39.6-59.2zM128 288a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm288 32a32 32 0 1 0 0-64 32 32 0 1 0 0 64z"/></svg>`;
const ICON_CALENDAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M128 0c17.7 0 32 14.3 32 32V64H288V32c0-17.7 14.3-32 32-32s32 14.3 32 32V64h48c26.5 0 48 21.5 48 48v48H0V112C0 85.5 21.5 64 48 64H96V32c0-17.7 14.3-32 32-32zM0 192H448V464c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V192zm312 96c0-13.3-10.7-24-24-24H160c-13.3 0-24 10.7-24 24v112c0 13.3 10.7 24 24 24h128c13.3 0 24-10.7 24-24V288z"/></svg>`;
const ICON_MONEY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M64 64C28.7 64 0 92.7 0 128V384c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V128c0-35.3-28.7-64-64-64H64zm64 320H64V320c35.3 0 64 28.7 64 64zM64 192V128h64c0 35.3-28.7 64-64 64zm448 0c-35.3 0-64-28.7-64-64h64v64zM512 384H448c0-35.3 28.7-64 64-64v64zM288 160a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"/></svg>`;
const ICON_PLUS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z"/></svg>`;
const ICON_INFO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h40c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-144a32 32 0 1 1 0-64 32 32 0 1 1 0 64z"/></svg>`;
const ICON_FILE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M0 64C0 28.7 28.7 0 64 0H224L384 160V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zm224 32V160H320L224 96zM64 288c0 8.8 7.2 16 16 16H304c8.8 0 16-7.2 16-16s-7.2-16-16-16H80c-8.8 0-16 7.2-16 16zm0 96c0 8.8 7.2 16 16 16H304c8.8 0 16-7.2 16-16s-7.2-16-16-16H80c-8.8 0-16 7.2-16 16z"/></svg>`;

const COMPANY = {
    NAME: 'Maria Auxiliadora Torres Montalvan',
    EMAIL: 'rentcartm26@gmail.com',
    PHONE: '8386-6806',
    ADDRESS: 'BO. LA REFORMA, POLICIA NACIONAL 2 1/2C E.'
};

const COLORS = {
    PRIMARY_BLUE: [26, 74, 140],
    LIGHT_BLUE: [232, 240, 254],
    GRAY_TEXT: [80, 80, 80],
    BLACK: [0, 0, 0],
    WHITE: [255, 255, 255],
    LIGHT_GRAY: [240, 240, 240]
};

const LEGAL_TEXT = 'Por medio de la presente se deja constancia que la transacción correspondiente a la reservación y uso del vehículo ha sido efectuada en condición de crédito, sujetándose el cliente a los términos y obligaciones pactadas, comprometiéndose a efectuar el pago correspondiente conforme a lo convenido entre ambas partes.';

const fmt = (val) => {
    const num = parseFloat(val);
    return !isNaN(num) ? `$${num.toFixed(2)}` : '$—';
};
const fmtc = (val) => {
    const num = parseFloat(val);
    return !isNaN(num) ? `C$${num.toFixed(2)}` : 'C$—';
};

const fmtDateStr = (dateStr) => {
    if (!dateStr) return '___ / ___ / ______';
    const [y, m, d] = dateStr.split('-');
    return `${d} / ${m} / ${y}`;
};

const getMonthName = (dateStr) => {
    if (!dateStr) return '_______________';
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const m = parseInt(dateStr.split('-')[1], 10);
    return months[m - 1];
};

function setupPDF() {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    return { doc, W: 210, H: 297, ML: 15, MR: 15 };
}

let cachedLogoData = null;
async function getLogoData() {
    if (cachedLogoData) return cachedLogoData;
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const targetColor = COLORS.PRIMARY_BLUE;
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 0) {
                    data[i] = targetColor[0];
                    data[i + 1] = targetColor[1];
                    data[i + 2] = targetColor[2];
                }
            }
            ctx.putImageData(imgData, 0, 0);
            cachedLogoData = { data: canvas.toDataURL('image/png'), w: img.width, h: img.height };
            resolve(cachedLogoData);
        };
        img.onerror = (e) => {
            console.error('Error loading logo:', e);
            resolve(null);
        };
        img.src = logoUrl;
    });
}

let cachedVehicleImages = {};
async function getVehicleImage(type) {
    if (cachedVehicleImages[type]) return cachedVehicleImages[type];
    const url = type === 'Pickup' ? pickupImgUrl : type === 'Sedán' ? sedanImgUrl : suvImgUrl;
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            cachedVehicleImages[type] = { data: canvas.toDataURL('image/png'), w: img.width, h: img.height };
            resolve(cachedVehicleImages[type]);
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

async function drawHeader(doc, W, ML, y, docTitle, invoiceNum = null) {
    let currentY = 12;

    try {
        const logo = await getLogoData();
        if (logo) {
            const logoHeight = 24;
            const logoWidth = (logo.w / logo.h) * logoHeight;
            const logoX = (W - logoWidth) / 2;
            doc.addImage(logo.data, 'PNG', logoX, currentY, logoWidth, logoHeight);
            currentY += logoHeight + 8;
        }
    } catch (e) {}

    if (currentY === 12) currentY = 20;

    doc.setTextColor(...COLORS.PRIMARY_BLUE);
    doc.setFont('times', 'bold');
    doc.setFontSize(16);

    let titleText = docTitle;

    const titleWidth = doc.getTextWidth(titleText);
    const midX = W / 2;

    doc.text(titleText, midX, currentY, { align: 'center' });

    if (invoiceNum) {
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.text(`N.º ${invoiceNum}`, W - ML, currentY, { align: 'right' });
    }

    doc.setDrawColor(...COLORS.PRIMARY_BLUE);
    doc.setLineWidth(0.5);

    const lineY = currentY - 2;
    doc.circle(midX - titleWidth/2 - 8, lineY, 0.8, 'F');
    doc.line(ML + 10, lineY, midX - titleWidth/2 - 10, lineY);

    doc.circle(midX + titleWidth/2 + 8, lineY, 0.8, 'F');
    doc.line(midX + titleWidth/2 + 10, lineY, W - ML - 10, lineY);

    if (docTitle === 'CONFIRMACIÓN DE RESERVA') {
        currentY += 5;
        doc.setFont('times', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.GRAY_TEXT);
        doc.text('Este no es un recibo', midX, currentY, { align: 'center' });
    }

    currentY += 8;

    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.PRIMARY_BLUE);
    doc.text(COMPANY.NAME, midX, currentY, { align: 'center' }); currentY += 4;
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.GRAY_TEXT);
    doc.text(`${COMPANY.EMAIL}  |  Tel: ${COMPANY.PHONE}`, midX, currentY, { align: 'center' }); currentY += 4;
    doc.text(COMPANY.ADDRESS, midX, currentY, { align: 'center' }); currentY += 8;

    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.setTextColor(...COLORS.PRIMARY_BLUE);
    doc.text('Fecha:', ML, currentY);

    doc.setDrawColor(...COLORS.PRIMARY_BLUE);
    doc.setLineWidth(0.3);
    doc.line(ML, currentY + 3, W - ML, currentY + 3);

    return currentY + 10;
}

async function drawIcon(doc, iconContent, cx, cy, radius) {
    doc.setFillColor(...COLORS.PRIMARY_BLUE);
    doc.circle(cx, cy, radius, 'F');

    if (typeof iconContent === 'string' && iconContent.trim().startsWith('<svg')) {
        const parser = new DOMParser();
        const svgElement = parser.parseFromString(iconContent, 'image/svg+xml').documentElement;
        svgElement.setAttribute('fill', '#FFFFFF');
        const iconSize = radius * 1.1;
        await svg2pdf(svgElement, doc, {
            x: cx - iconSize / 2,
            y: cy - iconSize / 2,
            width: iconSize,
            height: iconSize
        });
    } else {
        doc.setTextColor(...COLORS.WHITE);
        doc.setFont('times', 'bold');
        doc.setFontSize(9);
        doc.text(iconContent, cx, cy + 1.2, { align: 'center', baseline: 'middle' });
    }
}

export async function drawSectionHeader(doc, iconContent, title, y, W, ML) {
    const barHeight = 6;
    const circleRadius = 4.5;
    const cx = ML + 4;
    const cy = y + barHeight / 2;

    doc.setFillColor(...COLORS.LIGHT_BLUE);
    doc.rect(ML, y, W - ML * 2, barHeight, 'F');

    doc.setTextColor(...COLORS.PRIMARY_BLUE);
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text(title, ML + 12, y + 4.5);

    await drawIcon(doc, iconContent, cx, cy, circleRadius);

    return y + 10;
}

function twoColRow(doc, ML, y, label, value, W) {
    const LW = 45;
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.GRAY_TEXT);
    doc.text(label, ML + 2, y);

    doc.setFont('times', 'normal');
    doc.setTextColor(...COLORS.BLACK);
    doc.text(value || '—', ML + LW, y);

    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.2);
    doc.line(ML + 2, y + 2, W - ML - 2, y + 2);
    return y + 7;
}

function drawSignatures(doc, W, ML, y, leftName, rightName, leftTitle, rightTitle) {
    const midX = W / 2;
    doc.setDrawColor(...COLORS.PRIMARY_BLUE);
    doc.setLineWidth(0.4);
    doc.line(ML + 5, y, midX - 10, y);
    doc.line(midX + 10, y, W - ML - 5, y);

    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.PRIMARY_BLUE);
    doc.text(leftName, (ML + midX - 10) / 2 + ML / 2, y + 5, { align: 'center' });
    doc.text(rightName || '_________________________', (midX + 10 + W - ML - 5) / 2, y + 5, { align: 'center' });

    if (leftTitle) {
        doc.setFont('times', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.GRAY_TEXT);
        doc.text(leftTitle, (ML + midX - 10) / 2 + ML / 2, y + 10, { align: 'center' });
        doc.text(rightTitle || '', (midX + 10 + W - ML - 5) / 2, y + 10, { align: 'center' });
    }
}

function writeText(doc, W, ML, y, title, text, italic = false) {
    if (!text) return y;
    if (title) {
        doc.setFont('times', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...COLORS.PRIMARY_BLUE);
        doc.text(title, ML + 2, y); y += 5;
    }
    doc.setFont('times', italic ? 'italic' : 'normal');
    doc.setFontSize(8); doc.setTextColor(...(italic ? COLORS.GRAY_TEXT : COLORS.BLACK));
    const lines = doc.splitTextToSize(text, W - ML * 2 - 4);
    doc.text(lines, ML + (italic ? 0 : 2), y);
    return y + lines.length * 4 + 3;
}

function drawPageDecorations(doc, W) {
    const H = 297;
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(...COLORS.PRIMARY_BLUE);
        doc.rect(0, 0, W, 4, 'F');
        doc.setFillColor(...COLORS.LIGHT_BLUE);
        doc.rect(0, 4, W, 1.5, 'F');

        doc.setFillColor(...COLORS.PRIMARY_BLUE);
        doc.triangle(W, H, W - 40, H, W, H - 20, 'F');
        doc.setFillColor(...COLORS.LIGHT_BLUE);
        doc.triangle(W - 20, H, W - 60, H, W, H - 17, 'F');
    }
    doc.setPage(pageCount);
}

export async function generatePDF(data) {
    const { docType } = data;
    let doc;
    if (docType === 'proforma') doc = await genProforma(data);
    else if (docType === 'confirmacion') doc = await genConfirmacion(data);
    else if (docType === 'factura') doc = await genFactura(data);
    else if (docType === 'contrato') doc = await genContrato(data);
    else doc = await genConfirmacion(data);
    return doc;
}

async function drawSharedBody(doc, W, ML, y, data) {
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.GRAY_TEXT);
    doc.text(fmtDateStr(data.fechaDoc), ML + 45, y - 10);

    y = await drawSectionHeader(doc, ICON_USER, 'DATOS DEL CLIENTE', y, W, ML);
    y = twoColRow(doc, ML, y, 'Nombre:', data.cliente, W);
    y = twoColRow(doc, ML, y, 'Cédula / RUC:', data.ruc, W);
    y = twoColRow(doc, ML, y, 'Teléfono / Correo:', `${data.telefono || ''}  |  ${data.correo || ''}`, W);
    if (data.direccion) y = twoColRow(doc, ML, y, 'Dirección:', data.direccion, W);
    y += 2;

    y = await drawSectionHeader(doc, ICON_CAR, 'DATOS DEL VEHÍCULO', y, W, ML);
    y = twoColRow(doc, ML, y, 'Vehículo / Tipo:', `${data.vehiculo || ''} / ${data.tipoVehiculo || ''}`, W);
    y = twoColRow(doc, ML, y, 'Modelo / Año:', data.modelo, W);
    y = twoColRow(doc, ML, y, 'Transmisión:', data.transmision, W);
    y = twoColRow(doc, ML, y, 'Placa:', data.placa, W);
    if (data.detalles) y = twoColRow(doc, ML, y, 'Detalles:', data.detalles, W);
    y += 2;

    y = await drawSectionHeader(doc, ICON_CALENDAR, 'DETALLES DE LA RESERVA', y, W, ML);
    y = twoColRow(doc, ML, y, 'Recogida:', `${data.lugRec || 'Managua'}  |  ${fmtDateStr(data.frec)}  |  ${data.hrec || '08:00'}`, W);
    y = twoColRow(doc, ML, y, 'Devolución:', `${data.lugDev || 'Managua'}  |  ${fmtDateStr(data.fdev)}  |  ${data.hdev || '10:00'}`, W);
    y += 3;

    y = await drawSectionHeader(doc, ICON_MONEY, 'RESUMEN DE MONTOS', y, W, ML); y += 2;

    const sub = (parseFloat(data.dias) || 0) * (parseFloat(data.precio) || 0);

    let choferTotal = 0, viaticosTotal = 0, hospedajeTotal = 0;
    if (data.hasOtrosServicios) {
        choferTotal = (parseFloat(data.choferDias) || 0) * (parseFloat(data.choferPrecio) || 0);
        viaticosTotal = (parseFloat(data.viaticosDias) || 0) * (parseFloat(data.viaticosPrecio) || 0);
        hospedajeTotal = (parseFloat(data.hospedajeDias) || 0) * (parseFloat(data.hospedajePrecio) || 0);
    }

    const totalUSD = sub + (parseFloat(data.deposito) || 0) + choferTotal + viaticosTotal + hospedajeTotal;
    const totalNIO = totalUSD * (parseFloat(data.tasa) || 36.5);

    const hasExtras = choferTotal > 0 || viaticosTotal > 0 || hospedajeTotal > 0;

    const bodyRows = [
        hasExtras
            ? ['Renta del Vehículo', data.dias || '-', fmt(data.precio), fmt(data.deposito), '-', fmt(sub)]
            : ['Renta del Vehículo', data.dias || '-', fmt(data.precio), fmt(data.deposito), fmt(sub)]
    ];

    if (choferTotal > 0) {
        bodyRows.push(hasExtras
            ? ['Servicio de Chofer', data.choferDias || '-', fmt(data.choferPrecio), '-', '-', fmt(choferTotal)]
            : ['Servicio de Chofer', data.choferDias || '-', fmt(data.choferPrecio), '-', fmt(choferTotal)]);
    }
    if (viaticosTotal > 0) {
        bodyRows.push(hasExtras
            ? ['Viáticos', data.viaticosDias || '-', fmt(data.viaticosPrecio), '-', '-', fmt(viaticosTotal)]
            : ['Viáticos', data.viaticosDias || '-', fmt(data.viaticosPrecio), '-', fmt(viaticosTotal)]);
    }
    if (hospedajeTotal > 0) {
        bodyRows.push(hasExtras
            ? ['Hospedaje', data.hospedajeDias || '-', fmt(data.hospedajePrecio), '-', '-', fmt(hospedajeTotal)]
            : ['Hospedaje', data.hospedajeDias || '-', fmt(data.hospedajePrecio), '-', fmt(hospedajeTotal)]);
    }

    const tableHead = hasExtras
        ? [['Concepto', 'Días', 'Monto/Día', 'Depósito', 'Chofer', 'Subtotal']]
        : [['Concepto', 'Días', 'Monto/Día', 'Depósito', 'Subtotal']];

    const footColSpan = hasExtras ? 5 : 4;

    autoTable(doc, {
        startY: y,
        head: tableHead,
        body: bodyRows,
        foot: [
            [{ content: 'TOTAL USD', colSpan: footColSpan, styles: { halign: 'right', textColor: COLORS.PRIMARY_BLUE, fillColor: COLORS.LIGHT_BLUE } }, { content: fmt(totalUSD), styles: { textColor: COLORS.PRIMARY_BLUE, fillColor: COLORS.LIGHT_BLUE } }],
            [{ content: `Total en Córdobas (Tasa: ${data.tasa || 36.5})`, colSpan: footColSpan, styles: { halign: 'right', fillColor: COLORS.PRIMARY_BLUE, textColor: COLORS.WHITE } }, { content: fmtc(totalNIO), styles: { fillColor: COLORS.PRIMARY_BLUE, textColor: COLORS.WHITE } }],
        ],
        theme: 'grid',
        margin: { left: ML, right: ML },
        styles: {
            font: 'times',
            lineColor: COLORS.PRIMARY_BLUE,
            lineWidth: 0.1,
            textColor: COLORS.GRAY_TEXT,
            fontSize: 8.5,
            valign: 'middle',
            halign: 'center'
        },
        headStyles: {
            fillColor: COLORS.PRIMARY_BLUE,
            textColor: COLORS.WHITE,
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: { fillColor: COLORS.WHITE },
        alternateRowStyles: { fillColor: [248, 250, 255] },
        columnStyles: { 0: { halign: 'left' } },
        footStyles: { fontStyle: 'bold', fontSize: 9, lineWidth: 0.1, lineColor: COLORS.WHITE }
    });
    return doc.lastAutoTable.finalY + 4;
}

// --- DOCUMENTOS ---

async function genConfirmacion(data) {
    const { doc, W, ML } = setupPDF();
    let y = await drawHeader(doc, W, ML, 0, 'CONFIRMACIÓN DE RESERVA');

    y = await drawSharedBody(doc, W, ML, y, data);

    doc.setDrawColor(...COLORS.PRIMARY_BLUE);
    doc.setLineWidth(0.4);
    doc.line(ML, y, W - ML, y); y += 4;

    doc.setFillColor(...COLORS.WHITE);
    const sx = ML + 8;
    const sy = y + 5;
    doc.setDrawColor(...COLORS.PRIMARY_BLUE);
    doc.setLineWidth(0.5);
    doc.circle(sx, sy, 4);
    doc.line(sx - 1.5, sy, sx - 0.5, sy + 1.5);
    doc.line(sx - 0.5, sy + 1.5, sx + 2, sy - 1.5);

    doc.setFont('times', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.GRAY_TEXT);
    const lines = doc.splitTextToSize(LEGAL_TEXT, W - ML * 2 - 15);
    doc.text(lines, ML + 15, y + 2);
    y += lines.length * 4 + 6;

    drawPageDecorations(doc, W);

    return doc;
}

async function genFactura(data) {
    const { doc, W, ML } = setupPDF();
    let y = await drawHeader(doc, W, ML, 0, 'FACTURA', data.facturaNum || '______');

    y = await drawSharedBody(doc, W, ML, y, data);
    y = writeText(doc, W, ML, y, 'Nota:', data.nota);
    y = writeText(doc, W, ML, y, 'Observaciones:', data.obs);

    drawSignatures(doc, W, ML, 250, COMPANY.NAME, data.cliente, 'TM RENT A CAR', 'Cliente');
    drawPageDecorations(doc, W);
    return doc;
}

async function genProforma(data) {
    const { doc, W, ML } = setupPDF();
    let y = await drawHeader(doc, W, ML, 0, 'PROFORMA');
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.GRAY_TEXT);
    doc.text(fmtDateStr(data.fechaDoc), ML + 45, y - 10);

    y = await drawSectionHeader(doc, ICON_USER, 'DATOS DEL CLIENTE', y, W, ML);
    y = twoColRow(doc, ML, y, 'Cliente:', data.cliente, W);
    y = twoColRow(doc, ML, y, 'RUC / Cédula:', data.ruc, W);
    y = twoColRow(doc, ML, y, 'Correo:', data.correo, W);
    y += 4;

    y = await drawSectionHeader(doc, ICON_CAR, 'DETALLE DEL ALQUILER', y, W, ML);
    y += 2;

    const vehRows = (data.vehiculos || []).map(v => [
        v.name || '',
        v.model || '',
        v.days || '',
        fmt(v.price)
    ]);
    while (vehRows.length < 2) vehRows.push(['', '', '', '']);

    autoTable(doc, {
        startY: y,
        head: [['Vehículo', 'Modelo / Año', 'Días', 'Precio/Día']],
        body: vehRows,
        theme: 'grid',
        margin: { left: ML, right: ML },
        styles: { font: 'times', lineColor: COLORS.LIGHT_BLUE, lineWidth: 0.1, textColor: COLORS.GRAY_TEXT, fontSize: 8.5 },
        headStyles: { fillColor: COLORS.PRIMARY_BLUE, fontStyle: 'bold', textColor: COLORS.WHITE },
        alternateRowStyles: { fillColor: [248, 250, 255] }
    });
    y = doc.lastAutoTable.finalY + 6;

    let sub = 0;
    (data.vehiculos || []).forEach(v => sub += (parseFloat(v.days) || 0) * (parseFloat(v.price) || 0));

    let choferTotal = 0, viaticosTotal = 0, hospedajeTotal = 0;
    if (data.hasOtrosServicios) {
        choferTotal = (parseFloat(data.choferDias) || 0) * (parseFloat(data.choferPrecio) || 0);
        viaticosTotal = (parseFloat(data.viaticosDias) || 0) * (parseFloat(data.viaticosPrecio) || 0);
        hospedajeTotal = (parseFloat(data.hospedajeDias) || 0) * (parseFloat(data.hospedajePrecio) || 0);
    }

    const total = sub + (parseFloat(data.deposito) || 0) + choferTotal + viaticosTotal + hospedajeTotal;

    const bodyResumen = [];
    if (parseFloat(data.deposito) > 0) bodyResumen.push(['Depósito', fmt(data.deposito)]);
    if (choferTotal > 0) bodyResumen.push(['Chofer', fmt(choferTotal)]);
    if (viaticosTotal > 0) bodyResumen.push(['Viáticos', fmt(viaticosTotal)]);
    if (hospedajeTotal > 0) bodyResumen.push(['Hospedaje', fmt(hospedajeTotal)]);
    if (bodyResumen.length === 0) bodyResumen.push(['Cargos Adicionales', '$0.00']);

    autoTable(doc, {
        startY: y,
        body: bodyResumen,
        foot: [['TOTAL A PAGAR', fmt(total)]],
        theme: 'grid',
        margin: { left: ML + 80, right: ML },
        styles: { font: 'times', lineColor: COLORS.LIGHT_BLUE, lineWidth: 0.1, textColor: COLORS.GRAY_TEXT, fontSize: 8.5 },
        footStyles: { fillColor: COLORS.PRIMARY_BLUE, textColor: COLORS.WHITE, fontStyle: 'bold', fontSize: 9 }
    });
    y = doc.lastAutoTable.finalY + 8;

    if (data.nota) {
        y = await drawSectionHeader(doc, ICON_INFO, 'NOTAS', y, W, ML);
        y += 2;
        doc.setFont('times', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...COLORS.GRAY_TEXT);
        const lines = doc.splitTextToSize(data.nota, W - ML * 2 - 4);
        doc.text(lines, ML + 2, y);
        y += lines.length * 4 + 6;
    }

    doc.setFont('times', 'italic'); doc.setFontSize(8); doc.setTextColor(...COLORS.GRAY_TEXT);
    doc.text('Proforma válida por 10 días a partir de la fecha emitida.', W / 2, y, { align: 'center' });

    drawSignatures(doc, W, ML, 260, COMPANY.NAME, '', 'TM RENT A CAR', '');
    drawPageDecorations(doc, W);
    return doc;
}

async function genContrato(data) {
    const { doc, W, ML } = setupPDF();
    let y = await drawHeader(doc, W, ML, 0, 'CONTRATO DE ARRENDAMIENTO');

    const dateStr = data.fechaDoc;
    const d = dateStr ? dateStr.split('-')[2] : '___';
    const a = dateStr ? dateStr.split('-')[0] : '______';
    const mName = getMonthName(dateStr);

    doc.setFont('times', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...COLORS.GRAY_TEXT);
    const intro = `En la ciudad de ${data.ciudad || '_______________'}, a los ${d} días del mes de ${mName} del año ${a}, se celebra el presente contrato de arrendamiento de vehículo entre TM RENT A CAR, en adelante "EL ARRENDADOR", y el cliente descrito a continuación, en adelante "EL ARRENDATARIO".`;
    const introLines = doc.splitTextToSize(intro, W - ML * 2);
    doc.text(introLines, ML, y);
    y += introLines.length * 4 + 2;

    y = await drawSectionHeader(doc, ICON_USER, 'DATOS DEL ARRENDATARIO', y, W, ML);
    y = twoColRow(doc, ML, y, 'Nombre completo:', data.cliente, W);
    y = twoColRow(doc, ML, y, 'Cédula / RUC:', data.ruc, W);
    y = twoColRow(doc, ML, y, 'Dirección:', data.direccion, W);
    y = twoColRow(doc, ML, y, 'Teléfono / Correo:', `${data.telefono || ''}  |  ${data.correo || ''}`, W);
    y = twoColRow(doc, ML, y, 'Conductor Autorizado:', data.conductor, W);
    y += 2;

    y = await drawSectionHeader(doc, ICON_FILE, 'DATOS DEL VEHÍCULO Y RESERVA', y, W, ML);
    y = twoColRow(doc, ML, y, 'Vehículo / Tipo:', `${data.vehiculo || ''} / ${data.tipoVehiculo || ''}`, W);
    y = twoColRow(doc, ML, y, 'Modelo / Transmisión:', `${data.modelo || ''} / ${data.transmision || ''}`, W);
    y = twoColRow(doc, ML, y, 'Placa:', data.placa, W);
    y = twoColRow(doc, ML, y, 'Entrega (Fecha/Hora):', `${fmtDateStr(data.frec)} a las ${data.hrec || ''}`, W);
    y = twoColRow(doc, ML, y, 'Devolución (Fecha/Hora):', `${fmtDateStr(data.fdev)} a las ${data.hdev || ''}`, W);
    y += 2;

    const sub = (parseFloat(data.dias) || 0) * (parseFloat(data.precio) || 0);
    let choferTotal = 0;
    if (data.hasOtrosServicios) {
        choferTotal = (parseFloat(data.choferDias) || 0) * (parseFloat(data.choferPrecio) || 0);
    }
    const totalUSD = sub + (parseFloat(data.deposito) || 0) + choferTotal;

    y = await drawSectionHeader(doc, ICON_MONEY, 'CONDICIONES ECONÓMICAS', y, W, ML);
    y = twoColRow(doc, ML, y, 'Días de alquiler:', `${data.dias || 0}`, W);
    y = twoColRow(doc, ML, y, 'Valor del alquiler:', fmt(data.precio), W);
    y = twoColRow(doc, ML, y, 'Depósito en garantía:', fmt(data.deposito), W);
    if (choferTotal > 0) {
        y = twoColRow(doc, ML, y, 'Chofer:', fmt(choferTotal), W);
    }
    y = twoColRow(doc, ML, y, 'TOTAL:', fmt(totalUSD), W);
    y += 4;

    y = await drawSectionHeader(doc, ICON_CAR, 'ESTADO Y ACCESORIOS DEL VEHÍCULO AL MOMENTO DE LA ENTREGA', y, W, ML);
    doc.setFont('times', 'normal'); doc.setFontSize(8); doc.setTextColor(...COLORS.GRAY_TEXT);
    doc.text('El arrendatario declara recibir el vehículo en buenas condiciones de funcionamiento, limpieza y presentación, incluyendo los siguientes accesorios y documentos:', ML, y, { maxWidth: W - ML * 2 });
    y += 7;

    const col1Items = [
        { key: 'circulacion',  label: 'Circulación' },
        { key: 'seguro',       label: 'Seguro' },
        { key: 'llave',        label: 'Llave principal' },
        { key: 'radio',        label: 'Radio / Multimedia' },
        { key: 'camara',       label: 'Cámara de retroceso' },
        { key: 'bocina',       label: 'Bocina de retroceso' },
        { key: 'antivuelco',   label: 'Antivuelco' },
    ];
    const col2Items = [
        { key: 'baca',         label: 'Baca' },
        { key: 'alogenos',     label: 'Par de alógenos' },
        { key: 'traba',        label: 'Traba tuercas' },
        { key: 'herramientas', label: 'Herramientas básicas' },
        { key: 'gata',         label: 'Gata hidráulica' },
        { key: 'repuesto',     label: 'Llanta de repuesto' },
        { key: 'triangulos',   label: 'Triángulos de seguridad' },
    ];
    const acc = data.accesorios || {};

    const colWidth = (W - ML * 2) / 2;
    doc.setFontSize(8);
    for (let i = 0; i < 7; i++) {
        const item1 = col1Items[i];
        const checked1 = acc[item1.key] ? '[X]' : '[ ]';
        doc.text(`${checked1}  ${item1.label}`, ML + 2, y + (i * 4));

        const item2 = col2Items[i];
        const checked2 = acc[item2.key] ? '[X]' : '[ ]';
        doc.text(`${checked2}  ${item2.label}`, ML + colWidth, y + (i * 4));
    }

    y += 30;

    doc.setFont('times', 'bold'); doc.setTextColor(...COLORS.PRIMARY_BLUE);
    doc.text(`Nivel de combustible:`, ML, y);
    doc.setFont('times', 'normal'); doc.setTextColor(...COLORS.GRAY_TEXT);
    doc.text(data.nivelCombustible || '__________________', ML + 30, y);
    y += 5;

    doc.setFont('times', 'bold'); doc.setTextColor(...COLORS.PRIMARY_BLUE);
    doc.text(`Observaciones:`, ML, y);
    doc.setFont('times', 'normal'); doc.setTextColor(...COLORS.GRAY_TEXT);
    doc.text(data.obsEntrega || '__________________________________________________', ML + 22, y);
    y += 8;

    // Page 2
    doc.addPage(); y = 10;

    try {
        const vehicleImg = await getVehicleImage(data.tipoVehiculo || 'SUV');
        if (vehicleImg && vehicleImg.w > 1) {
            const vWidth = 140;
            let vHeight = (vehicleImg.h / vehicleImg.w) * vWidth;
            if (vHeight < 100) vHeight = 100;
            const vX = (W - vWidth) / 2;
            doc.addImage(vehicleImg.data, 'PNG', vX, y, vWidth, vHeight);
            y += vHeight + 5;
        }
    } catch (e) {
        y += 10;
    }

    const clauses = [
        ['3. CONDICIÓN DE ENTREGA', 'El arrendatario se compromete a devolver el vehículo en las mismas condiciones en que lo recibió, en tiempo y forma conforme a lo establecido en el presente contrato.'],
        ['4. POLÍTICA DE PAGO', 'Para clientes corporativos o contratos otorgados a crédito sin depósito en garantía, dicho monto será facturado y deberá ser cancelado conforme a las condiciones de pago acordadas.'],
        ['5. OBLIGACIONES', 'El arrendatario se compromete a: a) Utilizar el vehículo responsablemente. b) No permitir conductores no autorizados. c) No usarlo para fines ilícitos. d) Mantenerlo en buen estado. e) Reportar accidentes de inmediato.'],
        ['6. PROHIBICIONES', 'Queda prohibido: conducir bajo efectos de alcohol o sustancias ilícitas; participar en carreras; subarrendar el vehículo; utilizarlo fuera del territorio autorizado sin aprobación previa.'],
        ['7. ACCIDENTES', 'En caso de accidente, el arrendatario deberá notificar inmediatamente al arrendador y a las autoridades. Los daños por negligencia serán responsabilidad del arrendatario.'],
        ['8. PRÓRROGA', 'Toda solicitud de extensión del período de alquiler deberá ser comunicada con al menos 24 horas de anticipación y estará sujeta a disponibilidad.'],
        ['9. PÉRDIDA DE ACCESORIOS', 'El arrendatario será responsable por la pérdida o daño de accesorios, herramientas, llaves, documentos, placas, neumáticos o cualquier elemento entregado con el vehículo.'],
        ['10. MULTAS', 'Todas las multas, sanciones o cargos derivados del uso del vehículo durante el período de alquiler serán responsabilidad exclusiva del arrendatario.'],
        ['11. RETRASO EN ENTREGA', 'La entrega tardía podrá generar cargos adicionales equivalentes al valor diario de renta o la proporción correspondiente.'],
        ['12. LIMPIEZA', 'El vehículo deberá devolverse en las mismas condiciones de limpieza. De lo contrario, se aplicará un cargo de C$200.00. Si requiere limpieza profunda, el costo será evaluado y podrá deducirse del depósito o facturarse al cliente.'],
        ['13. INCUMPLIMIENTO', 'El incumplimiento de cualquier cláusula facultará al arrendador para dar por terminado el contrato y reclamar daños y perjuicios.'],
        ['14. ACEPTACIÓN', 'Las partes declaran haber leído, entendido y aceptado todas las condiciones establecidas en este contrato.']
    ];

    const colW = (W - ML * 2 - 8) / 2;
    const leftX = ML;
    const rightX = ML + colW + 8;
    const half = Math.ceil(clauses.length / 2);

    const fontSize = 8;
    const lineH = 3.5;
    const clauseGap = 2.5;

    let leftY = y;
    let rightY = y;

    for (let i = 0; i < half; i++) {
        const [lTitle, lText] = clauses[i];
        doc.setFont('times', 'bold'); doc.setFontSize(fontSize); doc.setTextColor(...COLORS.PRIMARY_BLUE);
        doc.text(lTitle, leftX, leftY); leftY += lineH + 0.5;
        doc.setFont('times', 'normal'); doc.setTextColor(...COLORS.GRAY_TEXT);
        const lLines = doc.splitTextToSize(lText, colW);
        doc.text(lLines, leftX, leftY);
        leftY += lLines.length * lineH + clauseGap;

        const rIdx = i + half;
        if (rIdx < clauses.length) {
            const [rTitle, rText] = clauses[rIdx];
            doc.setFont('times', 'bold'); doc.setFontSize(fontSize); doc.setTextColor(...COLORS.PRIMARY_BLUE);
            doc.text(rTitle, rightX, rightY); rightY += lineH + 0.5;
            doc.setFont('times', 'normal'); doc.setTextColor(...COLORS.GRAY_TEXT);
            const rLines = doc.splitTextToSize(rText, colW);
            doc.text(rLines, rightX, rightY);
            rightY += rLines.length * lineH + clauseGap;
        }
    }

    y = Math.max(leftY, rightY) + 4;

    const sigY = Math.max(y + 10, 255);
    drawSignatures(doc, W, ML, sigY, COMPANY.NAME, data.cliente, 'EL ARRENDADOR · TM RENT A CAR', 'EL ARRENDATARIO');
    drawPageDecorations(doc, W);
    return doc;
}
