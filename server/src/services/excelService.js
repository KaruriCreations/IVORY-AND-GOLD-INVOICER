const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const localLogoPath = path.join(__dirname, '..', 'assets', 'logo.png');
const clientLogoPath = path.join(__dirname, '..', '..', '..', 'client', 'src', 'assets', 'logo.png');
const LOGO_PATH = fs.existsSync(localLogoPath) ? localLogoPath : clientLogoPath;

// Colors
const COLOR_PERIWINKLE = 'FFC8D2F8';
const COLOR_LIGHT_PERIWINKLE = 'FFE0E7FD';
const COLOR_DARK_NAVY = 'FF041627';
const COLOR_GRAY_TEXT = 'FF333333';
const COLOR_BORDER = 'FF000000';
const COLOR_THIN_BORDER = 'FF777777';

const BORDER_THIN = { style: 'thin', color: { argb: COLOR_THIN_BORDER } };
const BORDER_SOLID_BLACK = { style: 'thin', color: { argb: COLOR_BORDER } };

async function generate(invoiceData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Ivory and Gold Events';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Quotation', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      horizontalCentered: true,
      verticalCentered: false,
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
      },
    },
    views: [
      {
        state: 'normal',
        showGridLines: true,
        activeCell: 'A1',
        showRowColHeaders: false,
      },
    ],
  });

  delete sheet.pageSetup.scale;
  sheet.properties.pageSetUpPr = { fitToPage: true };

  // Column definitions (A to E) totaling 82 units to fit A4 page width perfectly
  sheet.columns = [
    { key: 'A', width: 12 }, // QUANTITY
    { key: 'B', width: 20 }, // DESCRIPTION (left half)
    { key: 'C', width: 20 }, // DESCRIPTION (right half)
    { key: 'D', width: 14 }, // UNIT PRICE
    { key: 'E', width: 16 }, // TOTAL
  ];

  const { header = {}, items, taxRate = 0, eventDetails = {}, sections } = invoiceData;

  // Normalize sections
  let normalizedSections = [];
  if (sections && sections.length > 0) {
    normalizedSections = sections;
  } else {
    normalizedSections = [
      {
        title: eventDetails.sectionTitle || header.sectionTitle || 'CATERING',
        items: items || [],
      },
    ];
  }

  // Extract meta fields with fallbacks
  const clientName = header.clientName || '';
  const noOfGuests = eventDetails.noOfGuests || header.noOfGuests || '';
  const colors = eventDetails.colors || header.colors || '';
  const dateOfFunction = eventDetails.dateOfFunction || header.dateOfFunction || header.dueDate || '';
  const eventType = eventDetails.eventType || header.eventType || '';
  const venue = eventDetails.venue || header.venue || '';
  const attn = eventDetails.attn || header.preparedBy || header.attn || '';
  const docDate = header.date || new Date().toLocaleDateString('en-GB');

  // -------------------------------------------------------------
  // Set header row heights & background
  // -------------------------------------------------------------
  for (let r = 1; r <= 7; r++) {
    sheet.getRow(r).height = 18;
  }

  // Set crisp white background across entire header area (Rows 3-7)
  for (let r = 3; r <= 7; r++) {
    for (let c = 1; c <= 5; c++) {
      sheet.getRow(r).getCell(c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' },
      };
    }
  }

  // -------------------------------------------------------------
  // 1. EMBED LOGO (Merge A3:A7)
  // -------------------------------------------------------------
  sheet.mergeCells('A3:A7');
  if (fs.existsSync(LOGO_PATH)) {
    const logoImage = workbook.addImage({
      filename: LOGO_PATH,
      extension: 'png',
    });

    sheet.addImage(logoImage, {
      tl: { col: 0.08, row: 2.1 },
      ext: { width: 74, height: 74 },
      editAs: 'oneCell',
    });
  }

  // -------------------------------------------------------------
  // 2. COMPANY NAME (Merge B3:C7)
  // -------------------------------------------------------------
  sheet.mergeCells('B3:C7');
  const nameCell = sheet.getCell('B3');
  nameCell.value = 'IVORY AND GOLD\nEVENTS';
  nameCell.font = { bold: true, size: 14, color: { argb: COLOR_DARK_NAVY }, name: 'Arial' };
  nameCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };

  // -------------------------------------------------------------
  // 3. CONTACT INFO (Rows 3-7, Cols D-E)
  // -------------------------------------------------------------
  const contactLines = [
    { row: 3, text: 'IVORY AND GOLD EVENTS', bold: true, size: 9 },
    { row: 4, text: 'P.O. Box 10668 - 00100, Nairobi - Kenya', bold: false, size: 8 },
    { row: 5, text: 'Tel. +254 (0) 723657392, +254 (0) 725018909', bold: false, size: 8 },
    { row: 6, text: 'Komarock, Nairobi', bold: false, size: 8 },
    { row: 7, text: 'Email: ivoryandgoldeventske@gmail.com', bold: false, size: 8 },
  ];

  contactLines.forEach(({ row, text, bold, size }) => {
    sheet.mergeCells(`D${row}:E${row}`);
    const cell = sheet.getCell(`D${row}`);
    cell.value = text;
    cell.font = { bold, size, color: { argb: COLOR_GRAY_TEXT }, name: 'Arial' };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
  });

  // Apply outer bounding border to header block (Rows 3-7, Cols 1-5)
  applyBoxBorder(sheet, 3, 7, 1, 5, BORDER_SOLID_BLACK);

  // -------------------------------------------------------------
  // 4. QUOTATION BANNER (Row 8)
  // -------------------------------------------------------------
  sheet.mergeCells('A8:E8');
  const bannerCell = sheet.getCell('A8');
  bannerCell.value = 'QUOTATION';
  bannerCell.font = { bold: true, size: 11, color: { argb: 'FF000000' }, name: 'Arial' };
  bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PERIWINKLE } };
  bannerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  applyBoxBorder(sheet, 8, 8, 1, 5, BORDER_SOLID_BLACK);
  sheet.getRow(8).height = 22;

  // -------------------------------------------------------------
  // 5. CLIENT & EVENT DETAILS (Rows 9-15)
  // -------------------------------------------------------------
  const metaRows = [
    { row: 9, label: 'Client', val: clientName },
    { row: 10, label: 'No.of Guests', val: noOfGuests },
    { row: 11, label: 'Colors', val: colors },
    { row: 12, label: 'Date of function', val: dateOfFunction },
    { row: 13, label: 'Event', val: eventType },
    { row: 14, label: 'Venue', val: venue },
    { row: 15, label: 'Attn:', val: attn, rightVal: docDate },
  ];

  metaRows.forEach(({ row, label, val, rightVal }) => {
    sheet.getRow(row).height = 18;

    const labelCell = sheet.getCell(`A${row}`);
    labelCell.value = label;
    labelCell.font = { bold: true, size: 9, color: { argb: 'FF000000' }, name: 'Arial' };
    labelCell.alignment = { vertical: 'middle' };
    labelCell.border = {
      left: BORDER_SOLID_BLACK,
      right: BORDER_SOLID_BLACK,
      top: BORDER_THIN,
      bottom: BORDER_THIN,
    };

    sheet.mergeCells(`B${row}:C${row}`);
    const valCell = sheet.getCell(`B${row}`);
    valCell.value = val;
    valCell.font = { size: 9, color: { argb: 'FF000000' }, name: 'Arial' };
    valCell.alignment = { vertical: 'middle' };
    sheet.getCell(`C${row}`).border = {
      right: BORDER_SOLID_BLACK,
      top: BORDER_THIN,
      bottom: BORDER_THIN,
    };
    valCell.border = {
      left: BORDER_SOLID_BLACK,
      top: BORDER_THIN,
      bottom: BORDER_THIN,
    };

    sheet.mergeCells(`D${row}:E${row}`);
    const deCell = sheet.getCell(`D${row}`);
    if (rightVal) {
      deCell.value = rightVal;
      deCell.alignment = { horizontal: 'right', vertical: 'middle' };
      deCell.font = { size: 9, color: { argb: 'FF000000' }, name: 'Arial' };
    }
    deCell.border = {
      right: BORDER_SOLID_BLACK,
      top: BORDER_THIN,
      bottom: BORDER_THIN,
    };
    sheet.getCell(`E${row}`).border = {
      right: BORDER_SOLID_BLACK,
      top: BORDER_THIN,
      bottom: BORDER_THIN,
    };
  });

  for (let c = 1; c <= 5; c++) {
    sheet.getRow(15).getCell(c).border = {
      ...sheet.getRow(15).getCell(c).border,
      bottom: BORDER_SOLID_BLACK,
    };
  }

  // -------------------------------------------------------------
  // 6. TABLE HEADERS (Row 16)
  // -------------------------------------------------------------
  sheet.getRow(16).height = 20;

  const headerCells = [
    { ref: 'A16', val: 'QUANTITY', merge: null },
    { ref: 'B16', val: 'DESCRIPTION', merge: 'B16:C16' },
    { ref: 'D16', val: 'UNIT PRICE', merge: null },
    { ref: 'E16', val: 'TOTAL', merge: null },
  ];

  headerCells.forEach(({ ref, val, merge }) => {
    if (merge) sheet.mergeCells(merge);
    const cell = sheet.getCell(ref);
    cell.value = val;
    cell.font = { bold: true, size: 9, color: { argb: 'FF000000' }, name: 'Arial' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PERIWINKLE } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  for (let c = 1; c <= 5; c++) {
    sheet.getRow(16).getCell(c).border = BORDER_SOLID_BLACK;
  }

  // -------------------------------------------------------------
  // 7. DYNAMIC CATEGORY SECTIONS & LINE ITEMS (Row 17 onwards)
  // -------------------------------------------------------------
  let currentRow = 17;
  const FIRST_DATA_ROW = 18;
  const dataRowIndexes = [];

  normalizedSections.forEach((section) => {
    // Write Section Header Banner
    sheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const secCell = sheet.getCell(`A${currentRow}`);
    secCell.value = (section.title || 'CATEGORY').toUpperCase();
    secCell.font = { bold: true, size: 9.5, color: { argb: 'FF000000' }, name: 'Arial' };
    secCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LIGHT_PERIWINKLE } };
    secCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(currentRow).height = 19;
    applyBoxBorder(sheet, currentRow, currentRow, 1, 5, BORDER_SOLID_BLACK);
    currentRow++;

    // Write Items for this section (only actual user items, no fake 0 rows)
    (section.items || []).forEach((item) => {
      sheet.getRow(currentRow).height = 19;

      const qtyCell = sheet.getCell(`A${currentRow}`);
      qtyCell.value = Number(item.quantity) || 0;
      qtyCell.font = { size: 9, name: 'Arial' };
      qtyCell.alignment = { horizontal: 'center', vertical: 'middle' };
      qtyCell.border = BORDER_THIN;

      sheet.mergeCells(`B${currentRow}:C${currentRow}`);
      const descCell = sheet.getCell(`B${currentRow}`);
      descCell.value = item.description || '';
      descCell.font = { size: 9, name: 'Arial' };
      descCell.alignment = { horizontal: 'left', vertical: 'middle' };
      descCell.border = BORDER_THIN;
      sheet.getCell(`C${currentRow}`).border = BORDER_THIN;

      const priceCell = sheet.getCell(`D${currentRow}`);
      priceCell.value = Number(item.unitPrice) || 0;
      priceCell.font = { size: 9, name: 'Arial' };
      priceCell.alignment = { horizontal: 'right', vertical: 'middle' };
      priceCell.numFmt = '#,##0.00';
      priceCell.border = BORDER_THIN;

      const totalCell = sheet.getCell(`E${currentRow}`);
      totalCell.value = {
        formula: `A${currentRow}*D${currentRow}`,
        result: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
      };
      totalCell.font = { size: 9, name: 'Arial' };
      totalCell.alignment = { horizontal: 'right', vertical: 'middle' };
      totalCell.numFmt = '#,##0.00';
      totalCell.border = BORDER_THIN;

      qtyCell.border = { ...qtyCell.border, left: BORDER_SOLID_BLACK };
      totalCell.border = { ...totalCell.border, right: BORDER_SOLID_BLACK };

      dataRowIndexes.push(currentRow);
      currentRow++;
    });
  });

  const LAST_DATA_ROW = currentRow > FIRST_DATA_ROW ? currentRow - 1 : FIRST_DATA_ROW;

  // -------------------------------------------------------------
  // 8. TOTALS SECTION
  // -------------------------------------------------------------
  const subtotalRow = currentRow;
  sheet.getRow(subtotalRow).height = 20;

  sheet.mergeCells(`A${subtotalRow}:C${subtotalRow}`);
  sheet.getCell(`A${subtotalRow}`).border = { left: BORDER_SOLID_BLACK, bottom: BORDER_THIN };
  sheet.getCell(`B${subtotalRow}`).border = { bottom: BORDER_THIN };
  sheet.getCell(`C${subtotalRow}`).border = { right: BORDER_SOLID_BLACK, bottom: BORDER_THIN };

  const subLabel = sheet.getCell(`D${subtotalRow}`);
  subLabel.value = 'Sub Total';
  subLabel.font = { bold: true, size: 9, name: 'Arial' };
  subLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PERIWINKLE } };
  subLabel.alignment = { horizontal: 'left', vertical: 'middle' };
  subLabel.border = BORDER_SOLID_BLACK;

  // Calculate sum across all data rows
  const allItems = normalizedSections.flatMap((s) => s.items || []);
  const computedTotal = allItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  const subVal = sheet.getCell(`E${subtotalRow}`);
  if (dataRowIndexes.length > 0) {
    subVal.value = {
      formula: `SUM(E${FIRST_DATA_ROW}:E${LAST_DATA_ROW})`,
      result: computedTotal,
    };
  } else {
    subVal.value = 0;
  }
  subVal.font = { bold: true, size: 9, name: 'Arial' };
  subVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PERIWINKLE } };
  subVal.alignment = { horizontal: 'right', vertical: 'middle' };
  subVal.numFmt = '#,##0.00';
  subVal.border = BORDER_SOLID_BLACK;

  // Grand Total Row
  const totalRow = subtotalRow + 1;
  sheet.getRow(totalRow).height = 22;

  sheet.mergeCells(`A${totalRow}:C${totalRow}`);
  sheet.getCell(`A${totalRow}`).border = { left: BORDER_SOLID_BLACK, bottom: BORDER_SOLID_BLACK };
  sheet.getCell(`B${totalRow}`).border = { bottom: BORDER_SOLID_BLACK };
  sheet.getCell(`C${totalRow}`).border = { right: BORDER_SOLID_BLACK, bottom: BORDER_SOLID_BLACK };

  const grandLabel = sheet.getCell(`D${totalRow}`);
  grandLabel.value = 'TOTAL';
  grandLabel.font = { bold: true, size: 10, name: 'Arial' };
  grandLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PERIWINKLE } };
  grandLabel.alignment = { horizontal: 'left', vertical: 'middle' };
  grandLabel.border = BORDER_SOLID_BLACK;

  const grandVal = sheet.getCell(`E${totalRow}`);
  grandVal.value = {
    formula: `E${subtotalRow}`,
    result: computedTotal,
  };
  grandVal.font = { bold: true, size: 10, name: 'Arial' };
  grandVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PERIWINKLE } };
  grandVal.alignment = { horizontal: 'right', vertical: 'middle' };
  grandVal.numFmt = '#,##0.00';
  grandVal.border = BORDER_SOLID_BLACK;

  // -------------------------------------------------------------
  // 9. TERMS & CONDITIONS
  // -------------------------------------------------------------
  const termsStartRow = totalRow + 2;

  const termsLines = [
    { text: 'TERMS & CONDITIONS', bold: true, underline: true, size: 9 },
    { text: '*Full payment on order confirmation', bold: true, size: 8 },
    { text: '* In the event of loss of/damage to Ivory and Gold Events property while at the client site, the client will', bold: true, size: 8 },
    { text: '  be held liable and shall bear cost', bold: true, size: 8 },
    { text: '* Quoted prices are valid for 30 days from original quote', bold: true, size: 8 },
    { text: '* Ivory & Gold Events requires that client provide 24- hour security of equipment during setup & set down', bold: true, size: 8 },
    { text: '* Any additional item/s added on site will attract a delivery cost', bold: true, size: 8 },
    { text: '* All pricing information, discounts and equipment packaging contained in this document is confidential', bold: true, size: 8 },
    { text: '* Cancellation charge; 50% charge with less than 7 days notice', bold: true, size: 8 },
    { text: '', bold: false, size: 8 },
    { text: 'Prepared by: Ivory & Gold Events', bold: true, size: 8.5 },
  ];

  termsLines.forEach((line, idx) => {
    const r = termsStartRow + idx;
    sheet.getRow(r).height = 15;
    sheet.mergeCells(`A${r}:E${r}`);
    const cell = sheet.getCell(`A${r}`);
    cell.value = line.text;
    cell.font = {
      bold: line.bold,
      underline: line.underline || false,
      size: line.size,
      color: { argb: 'FF000000' },
      name: 'Arial',
    };
    cell.alignment = { vertical: 'middle' };
    cell.border = { left: BORDER_SOLID_BLACK, right: BORDER_SOLID_BLACK };
    sheet.getCell(`E${r}`).border = { right: BORDER_SOLID_BLACK };
  });

  const finalDocRow = termsStartRow + termsLines.length;
  sheet.getRow(finalDocRow).height = 10;
  for (let c = 1; c <= 5; c++) {
    sheet.getRow(finalDocRow).getCell(c).border = {
      bottom: BORDER_SOLID_BLACK,
      left: c === 1 ? BORDER_SOLID_BLACK : undefined,
      right: c === 5 ? BORDER_SOLID_BLACK : undefined,
    };
  }

  // Set explicit printable area to avoid viewport overflow
  sheet.pageSetup.printArea = `A1:E${finalDocRow}`;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function applyBoxBorder(sheet, startRow, endRow, startCol, endCol, borderStyle) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = sheet.getRow(r).getCell(c);
      cell.border = {
        top: r === startRow ? borderStyle : cell.border?.top,
        bottom: r === endRow ? borderStyle : cell.border?.bottom,
        left: c === startCol ? borderStyle : cell.border?.left,
        right: c === endCol ? borderStyle : cell.border?.right,
      };
    }
  }
}

module.exports = { generate };
