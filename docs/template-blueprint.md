# Ivory & Gold Events — Quotation Template Blueprint

## 1. Company Header (Rows 3–7)

| Cell / Range | Content | Style |
|---|---|---|
| **B3:B6** | Embedded Circular Logo | Image (`workbook.addImage`, 110x65 px) |
| **C4** | "IVORY AND GOLD" | Bold 14pt Arial, Navy `#041627` |
| **C5** | "EVENTS" | Bold 13pt Arial, Navy `#041627` |
| **D3:E3** | IVORY AND GOLD EVENTS | Bold 9pt, right-aligned |
| **D4:E4** | P.O. Box 10668 - 00100, Nairobi - Kenya | 8.5pt, right-aligned |
| **D5:E5** | Tel. +254 (0) 723657392, +254 (0) 725018909 | 8.5pt, right-aligned |
| **D6:E6** | Komarock, Nairobi | 8.5pt, right-aligned |
| **D7:E7** | Email: ivoryandgoldeventske@gmail.com | 8.5pt, right-aligned |

---

## 2. Quotation Banner (Row 8)

| Cell | Content | Formatting |
|---|---|---|
| **A8:E8** (merged) | `QUOTATION` | Bold 11pt, Centered, Periwinkle Fill `#C8D2F8`, Height 22pt |

---

## 3. Event & Client Details Grid (Rows 9–15)

| Row | Label (Col A) | Value (Cols B:C merged) | Right Header (Cols D:E merged) |
|---|---|---|---|
| **9** | Client | Client Name (e.g. `YAKUTI`) | *(blank)* |
| **10** | No.of Guests | No. of Guests (e.g. `400 Pax`) | *(blank)* |
| **11** | Colors | Color Scheme (e.g. `Gold, Orange & Aqua blue`) | *(blank)* |
| **12** | Date of function | Date (e.g. `19th December, 2026`) | *(blank)* |
| **13** | Event | Event Type (e.g. `Garden Wedding`) | *(blank)* |
| **14** | Venue | Venue Location (e.g. `Karen`) | *(blank)* |
| **15** | Attn: | Contact Person (e.g. `Rosaline`) | Quote Date (e.g. `19/12/2026`) |

---

## 4. Table Headers & Section (Rows 16–17)

| Row | Col A | Cols B:C (merged) | Col D | Col E |
|---|---|---|---|---|
| **16** | `QUANTITY` | `DESCRIPTION` | `UNIT PRICE` | `TOTAL` |
| **17** | `CATERING` (Section Category Header, Fill `#E0E7FD`, merged A17:E17) | | | |

---

## 5. Line Items (Row 18+)

| Column | Content | Type / Formula |
|---|---|---|
| **A** | Quantity | Integer / Number |
| **B:C** (merged) | Description | Text |
| **D** | Unit Price | Currency (`#,##0.00`) |
| **E** | Total | Excel Formula: `=A[row]*D[row]` |

---

## 6. Totals Section

| Row | Col D | Col E |
|---|---|---|
| **Sub Total** | `Sub Total` (Fill `#C8D2F8`, Bold) | `=SUM(E18:E[lastRow])` (Fill `#C8D2F8`, Bold) |
| **TOTAL** | `TOTAL` (Fill `#C8D2F8`, Bold 10pt) | `=E[subtotalRow]` (Fill `#C8D2F8`, Bold 10pt) |

---

## 7. Official Terms & Conditions (8 Clauses)

1. `*Full payment on order confirmation`
2. `* In the event of loss of/damage to Ivory and Gold Events property while at the client site, the client will be held liable and shall bear cost`
3. `* Quoted prices are valid for 30 days from original quote`
4. `* Ivory & Gold Events requires that client provide 24- hour security of equipment during setup & set down`
5. `* Any additional item/s added on site will attract a delivery cost`
6. `* All pricing information, discounts and equipment packaging contained in this document is confidential`
7. `* Cancellation charge; 50% charge with less than 7 days notice`
8. `Prepared by: Ivory & Gold Events`
