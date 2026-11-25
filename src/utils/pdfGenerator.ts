// @ts-nocheck
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { svg2pdf } from 'svg2pdf.js';
import { type CalibrationOffsets, DEFAULT_OFFSETS } from './calibrationStorage';
import { getVehicleImageUrl } from '@/components/vehicle-damage-report/vehicle-image';
import firmaSelloUrl from '@/assets/firma y sello.png';
import { esFacturaPorConceptos, calcularTotalConceptos, calcularImporteConcepto, facturaConceptosSchema } from '@/lib/factura-conceptos';

const logoUrl = '/logorent.png';

const ICON_USER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M463 448.2C440.9 409.8 399.4 384 352 384L288 384C240.6 384 199.1 409.8 177 448.2C212.2 487.4 263.2 512 320 512C376.8 512 427.8 487.3 463 448.2zM64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320zM320 336C359.8 336 392 303.8 392 264C392 224.2 359.8 192 320 192C280.2 192 248 224.2 248 264C248 303.8 280.2 336 320 336z"/></svg>`;
const ICON_CAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M135.2 117.4L109.1 192H402.9l-26.1-74.6C372.3 104.6 360.2 96 346.6 96H165.4c-13.6 0-25.7 8.6-30.2 21.4zM39.6 196.8L74.8 96.3C88.3 57.8 124.6 32 165.4 32H346.6c40.8 0 77.1 25.8 90.6 64.3l35.2 100.5c23.2 9.6 39.6 32.5 39.6 59.2V400v48c0 17.7-14.3 32-32 32H448c-17.7 0-32-14.3-32-32V400H96v48c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32V400 256c0-26.7 16.4-49.6 39.6-59.2zM128 288a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm288 32a32 32 0 1 0 0-64 32 32 0 1 0 0 64z"/></svg>`;
const ICON_CALENDAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M128 0c17.7 0 32 14.3 32 32V64H288V32c0-17.7 14.3-32 32-32s32 14.3 32 32V64h48c26.5 0 48 21.5 48 48v48H0V112C0 85.5 21.5 64 48 64H96V32c0-17.7 14.3-32 32-32zM0 192H448V464c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V192zm312 96c0-13.3-10.7-24-24-24H160c-13.3 0-24 10.7-24 24v112c0 13.3 10.7 24 24 24h128c13.3 0 24-10.7 24-24V288z"/></svg>`;
const ICON_MONEY = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M64 64C28.7 64 0 92.7 0 128V384c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V128c0-35.3-28.7-64-64-64H64zm64 320H64V320c35.3 0 64 28.7 64 64zM64 192V128h64c0 35.3-28.7 64-64 64zm448 0c-35.3 0-64-28.7-64-64h64v64zM512 384H448c0-35.3 28.7-64 64-64v64zM288 160a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"/></svg>`;
const ICON_PLUS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z"/></svg>`;
const ICON_INFO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h40c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-144a32 32 0 1 1 0-64 32 32 0 1 1 0 64z"/></svg>`;
const ICON_FILE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M0 64C0 28.7 28.7 0 64 0H224L384 160V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zm224 32V160H320L224 96zM64 288c0 8.8 7.2 16 16 16H304c8.8 0 16-7.2 16-16s-7.2-16-16-16H80c-8.8 0-16 7.2-16 16zm0 96c0 8.8 7.2 16 16 16H304c8.8 0 16-7.2 16-16s-7.2-16-16-16H80c-8.8 0-16 7.2-16 16z"/></svg>`;
const ICON_EMAIL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/></svg>`;
const ICON_PHONE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z"/></svg>`;
const ICON_LOCATION = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg>`;

const COMPANY = {
    NAME: 'Maria Auxiliadora Torres Montalvan',
    EMAIL: 'rentcartm26@gmail.com',
    PHONE: '8386-6806 (TIGO) | 76811323 (TIGO) | 2523-6262',
    ADDRESS: 'BO. LA REFORMA, POLICIA NACIONAL 2 1/2C E. MASAYA',
    RUC: '4011107950010N'
};
let CURRENT_COMPANY = COMPANY;

function resolveCompany(data) {
    CURRENT_COMPANY = data?.datosEmpresa || COMPANY;
}

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
    if (!num) return '';
    return `$${num.toFixed(2)}`;
};
const fmtc = (val) => {
    const num = parseFloat(val);
    if (!num) return '';
    return `C$${num.toFixed(2)}`;
};

export function getCustomLabel(key: string, defaultLabel: string, data: any): string {
    if (data && data.customLabels && data.customLabels[key]) {
        return data.customLabels[key];
    }
    const directKey = `${key}Label`;
    if (data && data[directKey]) {
        return data[directKey];
    }
    return defaultLabel;
}

export const isFilled = (val) => val !== undefined && val !== '' && val !== null;

const fmtDateStr = (dateStr) => {
    if (!dateStr) return '';
    const clean = String(dateStr).slice(0, 10);
    const parts = clean.split('-');
    if (parts.length < 3) return clean;
    const [y, m, d] = parts;
    return `${d} / ${m} / ${y}`;
};

const getMonthName = (dateStr) => {
    if (!dateStr) return '_______________';
    const clean = String(dateStr).slice(0, 10);
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const parts = clean.split('-');
    if (parts.length < 2) return '_______________';
    const m = parseInt(parts[1], 10);
    return months[m - 1] || '_______________';
};

function setupPDF() {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' });
    return { doc, W: 215.9, H: 279.4, ML: 15, MR: 15 };
}

let cachedLogoData = null;
export async function getLogoData() {
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
    const url = getVehicleImageUrl(type);
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

let cachedFirmaSello = null;
async function getFirmaSello() {
    if (cachedFirmaSello) return cachedFirmaSello;
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            cachedFirmaSello = { data: canvas.toDataURL('image/png'), w: img.width, h: img.height };
            resolve(cachedFirmaSello);
        };
        img.onerror = () => resolve(null);
        img.src = firmaSelloUrl;
    });
}

async function drawHeader(doc, W, ML, y, docTitle, invoiceNum = null) {
    let currentY = 8;
    const midX = W / 2;
    const rightX = W - ML;

    doc.setTextColor(...COLORS.PRIMARY_BLUE);
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    if (!invoiceNum) {
        doc.text(docTitle, midX, currentY + 5, { align: 'center' });
    }

    currentY += 12;

    if (docTitle === 'CONFIRMACIÓN DE RESERVA') {
        doc.setFont('times', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.GRAY_TEXT);
        doc.text('Este no es un recibo', midX, currentY);
        currentY += 5;
    }

    try {
        const logo = await getLogoData();
        if (logo) {
            const logoHeight = 48;
            const logoWidth = (logo.w / logo.h) * logoHeight;
            doc.addImage(logo.data, 'PNG', ML, currentY, logoWidth, logoHeight);

            const infoY = currentY + 3;
            doc.setFont('times', 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(...COLORS.PRIMARY_BLUE);
            doc.text(CURRENT_COMPANY.NAME, rightX, infoY + 5, { align: 'right' });
            doc.setFont('times', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(...COLORS.GRAY_TEXT);
            const emailIconX = rightX - doc.getTextWidth(CURRENT_COMPANY.EMAIL) - 4;
            await drawIcon(doc, ICON_EMAIL, emailIconX, infoY + 9.5, 1.8);
            doc.text(CURRENT_COMPANY.EMAIL, rightX, infoY + 9.5, { align: 'right' });
            doc.text(`Tel: ${CURRENT_COMPANY.PHONE}`, rightX, infoY + 14, { align: 'right' });
            const phoneIconX = rightX - doc.getTextWidth(`Tel: ${CURRENT_COMPANY.PHONE}`) - 4;
            await drawIcon(doc, ICON_PHONE, phoneIconX, infoY + 13.5, 1.8);
            const addressIconX = rightX - doc.getTextWidth(CURRENT_COMPANY.ADDRESS) - 4;
            await drawIcon(doc, ICON_LOCATION, addressIconX, infoY + 18, 1.8);
            doc.text(CURRENT_COMPANY.ADDRESS, rightX, infoY + 18.5, { align: 'right' });
            doc.text(`RUC: ${CURRENT_COMPANY.RUC}`, rightX, infoY + 22.5, { align: 'right' });

            currentY += Math.max(logoHeight, 24) + 8;
        }
    } catch (e) {}

    if (currentY === 12) currentY = 20;

    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.setTextColor(...COLORS.PRIMARY_BLUE);
    doc.text('Fecha:', ML, currentY);
    if (invoiceNum) {
        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.text(`FACTURA N.º ${invoiceNum}`, W - ML, currentY, { align: 'right' });
    }

    doc.setDrawColor(...COLORS.PRIMARY_BLUE);
    doc.setLineWidth(0.3);
    doc.line(ML, currentY + 3, W - ML, currentY + 3);

    return currentY + 10;
}

async function drawHeaderCompact(doc, W, ML, docTitle, invoiceNum = null) {
    let currentY = 8;
    const midX = W / 2;
    const rightX = W - ML;

    doc.setTextColor(...COLORS.PRIMARY_BLUE);
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text(docTitle, midX, currentY + 6, { align: 'center' });
    if (invoiceNum) {
        doc.setFontSize(10);
        doc.text(`N.º ${invoiceNum}`, W - ML, currentY + 6, { align: 'right' });
    }
    currentY += 13;

    if (docTitle === 'CONFIRMACIÓN DE RESERVA') {
        doc.setFont('times', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.GRAY_TEXT);
        doc.text('Este no es un recibo', midX, currentY, { align: 'center' });
        currentY += 5;
    }

    try {
        const logo = await getLogoData();
        if (logo) {
            const logoHeight = 28;
            const logoWidth = (logo.w / logo.h) * logoHeight;
            doc.addImage(logo.data, 'PNG', ML, currentY, logoWidth, logoHeight);

            const infoY = currentY + 1;
            doc.setFont('times', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(...COLORS.PRIMARY_BLUE);
            doc.text(CURRENT_COMPANY.NAME, rightX, infoY + 4, { align: 'right' });
            doc.setFont('times', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...COLORS.GRAY_TEXT);
            doc.text(CURRENT_COMPANY.EMAIL, rightX, infoY + 8.5, { align: 'right' });
            doc.text(`Tel: ${CURRENT_COMPANY.PHONE}`, rightX, infoY + 13, { align: 'right' });
            doc.text(CURRENT_COMPANY.ADDRESS, rightX, infoY + 17.5, { align: 'right' });
            doc.text(`RUC: ${CURRENT_COMPANY.RUC}`, rightX, infoY + 22, { align: 'right' });

            currentY += Math.max(logoHeight, 24) + 4;
        }
    } catch (e) {}

    doc.setDrawColor(...COLORS.PRIMARY_BLUE);
    doc.setLineWidth(0.3);
    doc.line(ML, currentY, W - ML, currentY);

    return currentY + 5;
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
    doc.text(value || '', ML + LW, y);

    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.2);
    doc.line(ML + 2, y + 2, W - ML - 2, y + 2);
    return y + 7;
}

function twoColRowCompact(doc, ML, y, label, value, W) {
    const LW = 40;
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.GRAY_TEXT);
    doc.text(label, ML + 2, y);

    doc.setFont('times', 'normal');
    doc.setTextColor(...COLORS.BLACK);
    doc.text(value || '', ML + LW, y);

    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.15);
    doc.line(ML + 2, y + 1.5, W - ML - 2, y + 1.5);
    return y + 5.2;
}

async function drawSignatures(doc, W, ML, y, leftName, rightName, leftTitle, rightTitle, showFirma = true) {
    const midX = W / 2;
    doc.setDrawColor(...COLORS.PRIMARY_BLUE);
    doc.setLineWidth(0.3);
    doc.line(ML + 5, y, midX - 10, y);
    doc.line(midX + 10, y, W - ML - 5, y);

    const leftCenterX = (ML + midX - 10) / 2 + ML / 2;

    if (showFirma) {
        try {
            const firma = await getFirmaSello();
            if (firma) {
                const fh = 48;
                const fw = (firma.w / firma.h) * fh;
                const overlap = fh * 0.28;
                doc.addImage(firma.data, 'PNG', leftCenterX - fw / 2, y - fh + overlap, fw, fh);
            }
        } catch (e) {}
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.PRIMARY_BLUE);
    doc.text(leftName, leftCenterX, y + 7, { align: 'center' });
    doc.text(rightName || '_________________________', (midX + 10 + W - ML - 5) / 2, y + 5, { align: 'center' });

    if (leftTitle) {
        doc.setFont('times', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.GRAY_TEXT);
        doc.text(leftTitle, leftCenterX, y + 10, { align: 'center' });
        doc.text(rightTitle || '', (midX + 10 + W - ML - 5) / 2, y + 10, { align: 'center' });
    }
}

function writeText(doc, W, ML, y, title, text, italic = false) {
    if (!text) return y;
    const startX = ML + (italic ? 0 : 2);
    let titleWidth = 0;
    if (title) {
        doc.setFont('times', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.PRIMARY_BLUE);
        doc.text(title, startX, y);
        titleWidth = doc.getTextWidth(title) + 1.5; // 1.5mm space after the title
    }

    doc.setFont('times', italic ? 'italic' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...(italic ? COLORS.GRAY_TEXT : COLORS.BLACK));

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

function drawPageDecorations(doc, W) {
    const H = doc.internal.pageSize.getHeight();
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(...COLORS.PRIMARY_BLUE);
        doc.rect(0, 0, W, 4, 'F');
        doc.setFillColor(...COLORS.LIGHT_BLUE);
        doc.rect(0, 4, W, 1.5, 'F');

        doc.setFillColor(...COLORS.PRIMARY_BLUE);
        doc.triangle(W, H, W - 35, H, W, H - 18, 'F');
        doc.setFillColor(...COLORS.LIGHT_BLUE);
        doc.triangle(W - 18, H, W - 55, H, W, H - 15, 'F');
    }
    doc.setPage(pageCount);
}

function drawBankFooter(doc, W, ML, y) {
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

    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.PRIMARY_BLUE);
    doc.text('INFORMACIÓN DE PAGO', ML + 2, y); y += 5;

    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.BLACK);
    doc.text('María Auxiliadora Torres Montalvan', ML + 2, y); y += 5;

    autoTable(doc, {
        startY: y,
        head: [['CUENTA', 'NÚMERO', 'CUENTA', 'NÚMERO']],
        body: bodyRows,
        theme: 'grid',
        margin: { left: ML, right: ML },
        styles: {
            font: 'times',
            fontSize: 7,
            textColor: COLORS.GRAY_TEXT,
            lineColor: COLORS.PRIMARY_BLUE,
            lineWidth: 0.1,
            cellPadding: 1.2,
        },
        headStyles: {
            fillColor: COLORS.PRIMARY_BLUE,
            textColor: COLORS.WHITE,
            fontStyle: 'bold',
            fontSize: 7,
            halign: 'center',
        },
        columnStyles: {
            0: { halign: 'left', cellWidth: (W - ML * 2) * 0.35 },
            1: { halign: 'right', cellWidth: (W - ML * 2) * 0.15 },
            2: { halign: 'left', cellWidth: (W - ML * 2) * 0.35 },
            3: { halign: 'right', cellWidth: (W - ML * 2) * 0.15 },
        },
        bodyStyles: { fillColor: COLORS.WHITE },
        alternateRowStyles: { fillColor: [248, 250, 255] },
    });

    return doc.lastAutoTable.finalY + 3;
}

export async function generatePDF(data, calibrationOffsets?: CalibrationOffsets) {
    if (esFacturaPorConceptos(data)) facturaConceptosSchema.parse(data);
    resolveCompany(data);
    const rawFecha = data.fechaDoc || data.fecha;
    const normalizedData = {
        ...data,
        fechaDoc: rawFecha ? String(rawFecha).slice(0, 10) : undefined,
    };
    const { docType } = normalizedData;
    let doc;
    if (docType === 'proforma') doc = await genProforma(normalizedData);
    else if (docType === 'confirmacion') doc = await genConfirmacion(normalizedData);
    else if (docType === 'factura') doc = await genFactura(normalizedData, calibrationOffsets);
    else if (docType === 'contrato') doc = await genContrato(normalizedData);
    else doc = await genConfirmacion(normalizedData);
    return doc;
}

async function drawClientSection(doc, W, ML, y, data, compact = false) {
    const rowFn = compact ? twoColRowCompact : twoColRow;
    if (!compact) {
        doc.setFont('times', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.GRAY_TEXT);
        doc.text(fmtDateStr(data.fechaDoc), ML + 45, y - 10);
    }

    y = await drawSectionHeader(doc, ICON_USER, 'DATOS DEL CLIENTE', y, W, ML);
    y = rowFn(doc, ML, y, 'Nombre:', data.cliente, W);
    y = rowFn(doc, ML, y, 'Cédula / RUC:', data.ruc, W);
    const telCorreo = [data.telefono, data.correo].filter(Boolean).join('  |  ');
    y = rowFn(doc, ML, y, 'Teléfono / Correo:', telCorreo, W);
    y = rowFn(doc, ML, y, 'Dirección:', data.direccion, W);
    y += 2;

    return y;
}

async function drawVehicleSection(doc, W, ML, y, data, compact = false) {
    const rowFn = compact ? twoColRowCompact : twoColRow;
    y = await drawSectionHeader(doc, ICON_CAR, 'DATOS DEL VEHÍCULO', y, W, ML);
    y = rowFn(doc, ML, y, 'Vehículo / Tipo:', `${data.vehiculo || ''} / ${data.tipoVehiculo || ''}`, W);
    y = rowFn(doc, ML, y, 'Modelo / Año:', data.modelo, W);
    y = rowFn(doc, ML, y, 'Transmisión:', data.transmision, W);
    y = rowFn(doc, ML, y, 'Placa:', data.placa, W);
    if (data.color) y = rowFn(doc, ML, y, 'Color:', data.color, W);
    if (data.detalles) y = rowFn(doc, ML, y, 'Detalles:', data.detalles, W);
    y += 2;

    y = await drawSectionHeader(doc, ICON_CALENDAR, 'DETALLES DE LA RESERVA', y, W, ML);
    y = rowFn(doc, ML, y, 'Recogida:', `${data.lugRec || 'Managua'}  |  ${fmtDateStr(data.frec)}  |  ${data.hrec || '08:00'}`, W);
    y = rowFn(doc, ML, y, 'Devolución:', `${data.lugDev || 'Managua'}  |  ${fmtDateStr(data.fdev)}  |  ${data.hdev || '10:00'}`, W);
    y += 3;

    return y;
}

async function drawMoneySection(doc, W, ML, y, data) {
    y = await drawSectionHeader(doc, ICON_MONEY, 'RESUMEN DE MONTOS', y, W, ML); y += 2;

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
    const esBlanco = totalUSD === 0 &&
                     !data.cliente &&
                     !data.depositoLabel &&
                     !data.choferLabel &&
                     !data.viaticosLabel &&
                     !data.hospedajeLabel &&
                     !data.choferDias &&
                     !data.choferPrecio &&
                     !data.viaticosDias &&
                     !data.viaticosPrecio &&
                     !data.hospedajeDias &&
                     !data.hospedajePrecio &&
                     !data.deposito;

    const c = (name) => esBlanco ? '' : name;

    const hasRenta = (parseFloat(data.dias) > 0 || parseFloat(data.precio) > 0);
    const hasDep = (parseFloat(data.deposito) > 0) || !!data.depositoLabel;
    const hasChof = (parseFloat(data.choferDias) > 0 || parseFloat(data.choferPrecio) > 0) || !!data.choferLabel;
    const hasViat = (parseFloat(data.viaticosDias) > 0 || parseFloat(data.viaticosPrecio) > 0) || !!data.viaticosLabel;
    const hasHosp = (parseFloat(data.hospedajeDias) > 0 || parseFloat(data.hospedajePrecio) > 0) || !!data.hospedajeLabel;

    const bodyRows = porConceptos ? (data.conceptosFactura || []).map(item => [
        item.descripcion.trim(), String(item.cantidad), conceptosNIO ? fmtc(item.precioUnitario) : fmt(item.precioUnitario), conceptosNIO ? fmtc(calcularImporteConcepto(item)) : fmt(calcularImporteConcepto(item)),
    ]) : [
        hasExtras
            ? [hasRenta ? c('Renta del Vehículo') : '', hasRenta ? blank(data.dias) : '', hasRenta ? fmt(data.precio) : '', '', hasRenta ? fmt(sub) : '']
            : [hasRenta ? c('Renta del Vehículo') : '', hasRenta ? blank(data.dias) : '', hasRenta ? fmt(data.precio) : '', hasRenta ? fmt(sub) : ''],
        hasExtras
            ? [hasDep ? c(getCustomLabel('deposito', 'Depósito en Garantía', data)) : '', '', '', '', hasDep ? fmt(data.deposito) : '']
            : [hasDep ? c(getCustomLabel('deposito', 'Depósito en Garantía', data)) : '', '', '', hasDep ? fmt(data.deposito) : ''],
        hasExtras
            ? [hasChof ? c(getCustomLabel('chofer', 'Servicio de Chofer', data)) : '', hasChof ? blank(data.choferDias) : '', hasChof ? fmt(data.choferPrecio) : '', '', hasChof ? fmt(choferTotal) : '']
            : [hasChof ? c(getCustomLabel('chofer', 'Servicio de Chofer', data)) : '', hasChof ? blank(data.choferDias) : '', hasChof ? fmt(data.choferPrecio) : '', hasChof ? fmt(choferTotal) : ''],
        hasExtras
            ? [hasViat ? c(getCustomLabel('viaticos', 'Viáticos', data)) : '', hasViat ? blank(data.viaticosDias) : '', hasViat ? fmt(data.viaticosPrecio) : '', '', hasViat ? fmt(viaticosTotal) : '']
            : [hasViat ? c(getCustomLabel('viaticos', 'Viáticos', data)) : '', hasViat ? blank(data.viaticosDias) : '', hasViat ? fmt(data.viaticosPrecio) : '', hasViat ? fmt(viaticosTotal) : ''],
        hasExtras
            ? [hasHosp ? c(getCustomLabel('hospedaje', 'Hospedaje', data)) : '', hasHosp ? blank(data.hospedajeDias) : '', hasHosp ? fmt(data.hospedajePrecio) : '', '', hasHosp ? fmt(hospedajeTotal) : '']
            : [hasHosp ? c(getCustomLabel('hospedaje', 'Hospedaje', data)) : '', hasHosp ? blank(data.hospedajeDias) : '', hasHosp ? fmt(data.hospedajePrecio) : '', hasHosp ? fmt(hospedajeTotal) : ''],
    ];

    const tableHead = porConceptos ? [['Concepto', 'Cantidad', 'Precio unitario', 'Importe']] : hasExtras
        ? [['Concepto', 'Días', 'Monto/Día', 'Chofer', 'Subtotal']]
        : [['Concepto', 'Días', 'Monto/Día', 'Subtotal']];

    const footColSpan = hasExtras ? 4 : 3;

    autoTable(doc, {
        startY: y,
        head: tableHead,
        body: bodyRows,
        showFoot: porConceptos ? 'lastPage' : 'everyPage',
        foot: [
            [{ content: conceptosNIO ? 'TOTAL CÓRDOBAS' : 'TOTAL USD', colSpan: footColSpan, styles: { halign: 'right', textColor: COLORS.PRIMARY_BLUE, fillColor: COLORS.LIGHT_BLUE } }, { content: conceptosNIO ? fmtc(totalNIO) : fmt(totalUSD), styles: { textColor: COLORS.PRIMARY_BLUE, fillColor: COLORS.LIGHT_BLUE } }],
            [{ content: conceptosNIO ? `Equivalente en USD (Tasa: ${tasa})` : `Total en Córdobas (Tasa: ${tasa})`, colSpan: footColSpan, styles: { halign: 'right', fillColor: COLORS.LIGHT_BLUE, textColor: COLORS.PRIMARY_BLUE } }, { content: conceptosNIO ? fmt(totalUSD) : fmtc(totalNIO), styles: { fillColor: COLORS.LIGHT_BLUE, textColor: COLORS.PRIMARY_BLUE } }],
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
        columnStyles: porConceptos ? {
            0: { halign: 'left', cellWidth: (W - ML * 2) * 0.58 },
            1: { cellWidth: (W - ML * 2) * 0.12 },
            2: { cellWidth: (W - ML * 2) * 0.15 },
            3: { cellWidth: (W - ML * 2) * 0.15 },
        } : { 0: { halign: 'left' } },
        footStyles: { fontStyle: 'bold', fontSize: 9, lineWidth: 0.1, lineColor: COLORS.PRIMARY_BLUE }
    });
    return doc.lastAutoTable.finalY + 4;
}

async function drawSharedBody(doc, W, ML, y, data, compact = false) {
    y = await drawClientSection(doc, W, ML, y, data, compact);
    y = await drawVehicleSection(doc, W, ML, y, data, compact);
    y = await drawMoneySection(doc, W, ML, y, data);
    return y;
}

// --- DOCUMENTOS ---

async function genConfirmacion(data) {
    const { doc, W, ML } = setupPDF();
    let y = await drawHeaderCompact(doc, W, ML, 'CONFIRMACIÓN DE RESERVA', data.docNum || data.facturaNum);

    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.PRIMARY_BLUE);
    doc.text('Fecha:', ML, y);
    doc.setFont('times', 'normal');
    doc.setTextColor(...COLORS.BLACK);
    doc.text(fmtDateStr(data.fechaDoc), ML + 12, y);
    y += 6;

    y = await drawSharedBody(doc, W, ML, y, data, true);

    if (!data.sinNotaCredito) {
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
        y += lines.length * 4 + 8;
    } else {
        y += 10;
    }

    const sigY = Math.max(y + 12, 235);
    await drawSignatures(doc, W, ML, sigY, CURRENT_COMPANY.NAME, data.cliente, 'TM RENT A CAR', 'Cliente', !data.sinFirma);

    drawPageDecorations(doc, W);

    return doc;
}

async function genFactura(data, offsets: CalibrationOffsets = DEFAULT_OFFSETS) {
    const { doc, W, ML: baseML } = setupPDF();
    const ML = baseML + offsets.general.x;
    let y = offsets.general.y;

    y = await drawHeader(doc, W, ML, y, 'FACTURA', data.facturaNum || data.docNum || '______');
    y += offsets.fecha.y;

    y = await drawClientSection(doc, W, ML, y + offsets.cliente.y, data);

    y = await drawMoneySection(doc, W, ML, y + offsets.tabla.y, data);
    y += offsets.totales.y;

    if (esFacturaPorConceptos(data) && y > 190) {
        doc.addPage();
        y = 20;
    }
    y = drawBankFooter(doc, W, ML, y + 4);
    y = writeText(doc, W, ML, y + 4 + offsets.observaciones.y, 'Nota:', data.nota);
    y = writeText(doc, W, ML, y, 'Observaciones:', data.obs);
    if (esFacturaPorConceptos(data) && y > 245) {
        doc.addPage();
        y = 20;
    }
    const firmaY = esFacturaPorConceptos(data) ? Math.max(245, y + 15) : 265;
    await drawSignatures(doc, W, ML, firmaY + offsets.firmas.y + offsets.general.y, CURRENT_COMPANY.NAME, data.cliente, 'TM RENT A CAR', 'Cliente', !data.sinFirma);
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
    y = twoColRow(doc, ML, y, 'Teléfono:', data.telefono, W);
    if (data.direccion) y = twoColRow(doc, ML, y, 'Dirección:', data.direccion, W);
    y = twoColRow(doc, ML, y, 'Correo:', data.correo, W);
    y += 4;

    y = await drawSectionHeader(doc, ICON_CAR, 'DETALLE DEL ALQUILER', y, W, ML);
    y += 2;

    let sub = 0;
    (data.vehiculos || []).forEach(v => sub += (parseFloat(v.days) || 0) * (parseFloat(v.price) || 0));

    let choferTotal = 0, viaticosTotal = 0, hospedajeTotal = 0;
    if (data.hasOtrosServicios) {
        choferTotal = (parseFloat(data.choferDias) || 0) * (parseFloat(data.choferPrecio) || 0);
        viaticosTotal = (parseFloat(data.viaticosDias) || 0) * (parseFloat(data.viaticosPrecio) || 0);
        hospedajeTotal = (parseFloat(data.hospedajeDias) || 0) * (parseFloat(data.hospedajePrecio) || 0);
    }

    const total = sub + (parseFloat(data.deposito) || 0) + choferTotal + viaticosTotal + hospedajeTotal;

    const unifiedBody = [
        ...(data.vehiculos || []).map(v => [
            v.name || '',
            v.model || '',
            v.color || '',
            String(v.days || ''),
            fmt(v.price),
            fmt((parseFloat(v.days) || 0) * (parseFloat(v.price) || 0)),
        ]),
    ];
    if (parseFloat(data.deposito) > 0) unifiedBody.push(['Depósito', '', '', '', '', fmt(data.deposito)]);
    if (choferTotal > 0) unifiedBody.push(['Servicio de Chofer', '', '', '', '', fmt(choferTotal)]);
    if (viaticosTotal > 0) unifiedBody.push(['Viáticos', '', '', '', '', fmt(viaticosTotal)]);
    if (hospedajeTotal > 0) unifiedBody.push(['Hospedaje', '', '', '', '', fmt(hospedajeTotal)]);

    autoTable(doc, {
        startY: y,
        head: [['Vehículo', 'Modelo / Año', 'Color', 'Días', 'Precio/Día', 'Subtotal']],
        body: unifiedBody,
        foot: [
            [{ content: 'TOTAL A PAGAR', colSpan: 5, styles: { halign: 'right', fillColor: COLORS.PRIMARY_BLUE, textColor: COLORS.WHITE, fontStyle: 'bold' } }, { content: fmt(total), styles: { fillColor: COLORS.PRIMARY_BLUE, textColor: COLORS.WHITE, fontStyle: 'bold' } }],
        ],
        theme: 'grid',
        margin: { left: ML, right: ML },
        styles: { font: 'times', lineColor: COLORS.LIGHT_BLUE, lineWidth: 0.1, textColor: COLORS.GRAY_TEXT, fontSize: 8.5 },
        headStyles: { fillColor: COLORS.PRIMARY_BLUE, fontStyle: 'bold', textColor: COLORS.WHITE },
        alternateRowStyles: { fillColor: [248, 250, 255] },
        footStyles: { fontSize: 9, lineWidth: 0.1, lineColor: COLORS.WHITE }
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

    const validezDias = data.validezDias !== undefined && data.validezDias !== "" ? data.validezDias : 10;
    doc.setFont('times', 'italic'); doc.setFontSize(8); doc.setTextColor(...COLORS.GRAY_TEXT);
    doc.text(`Proforma válida por ${validezDias} días a partir de la fecha emitida.`, W / 2, y, { align: 'center' });

    await drawSignatures(doc, W, ML, 260, CURRENT_COMPANY.NAME, data.cliente, 'TM RENT A CAR', data.ruc || '', !data.sinFirma);
    drawPageDecorations(doc, W);
    return doc;
}

async function genContrato(data) {
    const { doc, W, ML } = setupPDF();
    let y = await drawHeaderCompact(doc, W, ML, 'CONTRATO DE ARRENDAMIENTO', data.docNum || data.facturaNum);

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
    y = twoColRowCompact(doc, ML, y, 'Nombre completo:', data.cliente, W);
    y = twoColRowCompact(doc, ML, y, 'Cédula / RUC:', data.ruc, W);
    y = twoColRowCompact(doc, ML, y, 'Dirección:', data.direccion, W);
    const telCorreo = [data.telefono, data.correo].filter(Boolean).join('  |  ');
    y = twoColRowCompact(doc, ML, y, 'Teléfono / Correo:', telCorreo, W);
    y = twoColRowCompact(doc, ML, y, 'Conductor Autorizado:', data.conductor, W);

    y = await drawSectionHeader(doc, ICON_FILE, 'DATOS DEL VEHÍCULO Y RESERVA', y, W, ML);
    y = twoColRowCompact(doc, ML, y, 'Vehículo / Tipo:', `${data.vehiculo || ''} / ${data.tipoVehiculo || ''}`, W);
    y = twoColRowCompact(doc, ML, y, 'Modelo / Transmisión:', `${data.modelo || ''} / ${data.transmision || ''}`, W);
    y = twoColRowCompact(doc, ML, y, 'Placa:', data.placa, W);
    if (data.color) y = twoColRowCompact(doc, ML, y, 'Color:', data.color, W);
    y = twoColRowCompact(doc, ML, y, 'Entrega (Fecha/Hora):', `${fmtDateStr(data.frec)} a las ${data.hrec || ''}`, W);
    y = twoColRowCompact(doc, ML, y, 'Devolución (Fecha/Hora):', `${fmtDateStr(data.fdev)} a las ${data.hdev || ''}`, W);

    const sub = (parseFloat(data.dias) || 0) * (parseFloat(data.precio) || 0);
    let choferTotal = 0;
    if (data.hasOtrosServicios) {
        choferTotal = (parseFloat(data.choferDias) || 0) * (parseFloat(data.choferPrecio) || 0);
    }
    const totalUSD = sub + (parseFloat(data.deposito) || 0) + choferTotal;

    y = await drawSectionHeader(doc, ICON_MONEY, 'CONDICIONES ECONÓMICAS', y, W, ML);
    y = twoColRowCompact(doc, ML, y, 'Días de alquiler:', `${data.dias || 0}`, W);
    y = twoColRowCompact(doc, ML, y, 'Valor del alquiler:', fmt(data.precio), W);
    y = twoColRowCompact(doc, ML, y, 'Depósito en garantía:', fmt(data.deposito), W);
    if (choferTotal > 0) {
        y = twoColRowCompact(doc, ML, y, 'Chofer:', fmt(choferTotal), W);
    }
    y = twoColRowCompact(doc, ML, y, 'TOTAL:', fmt(totalUSD), W);

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

    y += 28;

    doc.setFont('times', 'bold'); doc.setTextColor(...COLORS.PRIMARY_BLUE);
    doc.text(`Nivel de combustible:`, ML, y);
    doc.setFont('times', 'normal'); doc.setTextColor(...COLORS.GRAY_TEXT);
    doc.text(data.nivelCombustible || '', ML + 30, y);
    y += 5;

    doc.setFont('times', 'bold'); doc.setTextColor(...COLORS.PRIMARY_BLUE);
    doc.text(`Observaciones:`, ML, y);
    doc.setFont('times', 'normal'); doc.setTextColor(...COLORS.GRAY_TEXT);
    doc.text(data.obsEntrega || '', ML + 22, y);

    // Page 2
    doc.addPage(); y = 10;

    try {
        const vehicleImg = await getVehicleImage(data.tipoVehiculo || 'SUV');
        if (vehicleImg && vehicleImg.w > 1) {
            const vWidth = 180;
            let vHeight = (vehicleImg.h / vehicleImg.w) * vWidth;
            const vX = (W - vWidth) / 2;
            doc.addImage(vehicleImg.data, 'PNG', vX, y, vWidth, vHeight);
            y += vHeight + 5;
        }
    } catch (e) {
        y += 10;
    }

    const clauses = [
        ['1. OBJETO DEL CONTRATO', 'El arrendador entrega al arrendatario, en calidad de arrendamiento, el vehículo descrito en el presente contrato, para uso personal o corporativo, en el territorio de Nicaragua, salvo autorización expresa en contrario.'],
        ['2. DEPÓSITO EN GARANTÍA', 'El depósito de garantía será devuelto al arrendatario una vez finalizado el contrato y entregado el vehículo, siempre que este sea restituido en las mismas condiciones en que fue recibido, salvo el desgaste normal por su uso. En caso de que el vehículo presente daños, deterioros o faltantes imputables al arrendatario, el depósito de garantía será retenido en su totalidad y no será objeto de devolución. Si el costo de la reparación, reposición o cualquier otro perjuicio ocasionado excediere el monto del depósito de garantía, el arrendatario se obliga a pagar la diferencia necesaria hasta cubrir la totalidad de los daños y perjuicios ocasionados.'],
        ['3. CONDICIÓN DE ENTREGA', 'El arrendatario se compromete a devolver el vehículo en las mismas condiciones en que lo recibió, en tiempo y forma conforme a lo establecido en el presente contrato.'],
        ['4. POLÍTICA DE PAGO', 'Para clientes corporativos o contratos otorgados a crédito sin depósito en garantía, dicho monto será facturado y deberá ser cancelado conforme a las condiciones de pago acordadas. Los arrendatarios que no cuenten con autorización de crédito deberán cancelar el valor total del arrendamiento de contado, al momento de la entrega del vehículo y previo al inicio del servicio.'],
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

    const leftClauses = clauses.slice(0, 5);
    const rightClauses = clauses.slice(5);

    const fontSize = 8;
    const lineH = 3.5;
    const clauseGap = 2.5;

    let leftY = y;
    let rightY = y;

    const maxLen = Math.max(leftClauses.length, rightClauses.length);
    for (let i = 0; i < maxLen; i++) {
        if (i < leftClauses.length) {
            const [lTitle, lText] = leftClauses[i];
            doc.setFont('times', 'bold'); doc.setFontSize(fontSize); doc.setTextColor(...COLORS.PRIMARY_BLUE);
            doc.text(lTitle, leftX, leftY); leftY += lineH + 0.5;
            doc.setFont('times', 'normal'); doc.setTextColor(...COLORS.GRAY_TEXT);
            const lLines = doc.splitTextToSize(lText, colW);
            doc.text(lLines, leftX, leftY);
            leftY += lLines.length * lineH + clauseGap;
        }

        if (i < rightClauses.length) {
            const [rTitle, rText] = rightClauses[i];
            doc.setFont('times', 'bold'); doc.setFontSize(fontSize); doc.setTextColor(...COLORS.PRIMARY_BLUE);
            doc.text(rTitle, rightX, rightY); rightY += lineH + 0.5;
            doc.setFont('times', 'normal'); doc.setTextColor(...COLORS.GRAY_TEXT);
            const rLines = doc.splitTextToSize(rText, colW);
            doc.text(rLines, rightX, rightY);
            rightY += rLines.length * lineH + clauseGap;
        }
    }

    y = Math.max(leftY, rightY) + 4;

    const sigY = 255;
    await drawSignatures(doc, W, ML, sigY, CURRENT_COMPANY.NAME, data.cliente, 'EL ARRENDADOR · TM RENT A CAR', 'EL ARRENDATARIO', !data.sinFirma);
    drawPageDecorations(doc, W);
    return doc;
}

export { COMPANY };
