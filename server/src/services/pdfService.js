const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'pdf-template.html');

function getLogoBase64() {
  const localLogoPath = path.join(__dirname, '..', 'assets', 'logo.png');
  const clientLogoPath = path.join(__dirname, '..', '..', '..', 'client', 'src', 'assets', 'logo.png');
  const logoPath = fs.existsSync(localLogoPath) ? localLogoPath : clientLogoPath;
  try {
    const logoBuffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch {
    return '';
  }
}

function formatKSh(num) {
  const val = Number(num) || 0;
  return val.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSectionsHTML(sections) {
  return sections
    .map((section) => {
      const headerRow = `
        <tr class="sec-header">
          <td colspan="4">${escapeHTML(section.title || 'CATEGORY')}</td>
        </tr>`;

      const itemRows = (section.items || [])
        .map(
          (item) => `
          <tr>
            <td class="col-qty">${item.quantity || ''}</td>
            <td class="col-desc">${escapeHTML(item.description)}</td>
            <td class="col-price">${item.unitPrice ? formatKSh(item.unitPrice) : ''}</td>
            <td class="col-total">${formatKSh((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</td>
          </tr>`
        )
        .join('\n');

      return headerRow + '\n' + itemRows;
    })
    .join('\n');
}

function buildFillerRows(count) {
  const fillers = [];
  for (let i = 0; i < count; i++) {
    fillers.push(`
      <tr>
        <td class="col-qty">&nbsp;</td>
        <td class="col-desc">&nbsp;</td>
        <td class="col-price">&nbsp;</td>
        <td class="col-total">0</td>
      </tr>`);
  }
  return fillers.join('\n');
}

async function generate(invoiceData) {
  const { header, items, taxRate = 0, eventDetails = {}, sections } = invoiceData;

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

  const allItems = normalizedSections.flatMap((s) => s.items || []);
  const subtotal = allItems.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    0
  );
  const grandTotal = subtotal;

  const clientName = header.clientName || 'YAKUTI';
  const noOfGuests = eventDetails.noOfGuests || header.noOfGuests || '400 Pax';
  const colors = eventDetails.colors || header.colors || 'Gold, Orange & Aqua blue';
  const dateOfFunction = eventDetails.dateOfFunction || header.dateOfFunction || header.dueDate || '19th December, 2026';
  const eventType = eventDetails.eventType || header.eventType || 'Garden Wedding';
  const venue = eventDetails.venue || header.venue || 'Karen';
  const attn = eventDetails.attn || header.preparedBy || header.attn || 'Rosaline';
  const docDate = header.date || new Date().toLocaleDateString('en-GB');

  const logoSrc = getLogoBase64();

  let html = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

  const totalRowCount = allItems.length + normalizedSections.length;
  const neededFillers = Math.max(0, 10 - totalRowCount);

  html = html
    .replace(/{{LOGO_SRC}}/g, logoSrc)
    .replace(/{{CLIENT_NAME}}/g, escapeHTML(clientName))
    .replace(/{{NO_OF_GUESTS}}/g, escapeHTML(noOfGuests))
    .replace(/{{COLORS}}/g, escapeHTML(colors))
    .replace(/{{DATE_OF_FUNCTION}}/g, escapeHTML(dateOfFunction))
    .replace(/{{EVENT_TYPE}}/g, escapeHTML(eventType))
    .replace(/{{VENUE}}/g, escapeHTML(venue))
    .replace(/{{ATTN}}/g, escapeHTML(attn))
    .replace(/{{DOC_DATE}}/g, escapeHTML(docDate))
    .replace(/<tr class="sec-header">[\s\S]*?<\/tr>\s*{{LINE_ITEMS}}/, buildSectionsHTML(normalizedSections))
    .replace(/{{LINE_ITEMS}}/g, buildSectionsHTML(normalizedSections))
    .replace(/{{FILLER_ROWS}}/g, buildFillerRows(neededFillers))
    .replace(/{{SUBTOTAL}}/g, formatKSh(subtotal))
    .replace(/{{GRAND_TOTAL}}/g, formatKSh(grandTotal));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm',
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

module.exports = { generate };
