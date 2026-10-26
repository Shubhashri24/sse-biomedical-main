import PDFDocument from "pdfkit";
import type { CommercialQuotation, CompanyQuotationSettings } from "./mongodb";
import { formatINR, formatDateIN } from "./quotation-calculations";

/**
 * Generate a professional quotation PDF following the Shree Shyam Electronics reference sample.
 * Features:
 * - Matching company header with Amol Agrawal, Jalgaon address, phone & email
 * - Right-aligned Date & Quotation Number
 * - Clean BILL TO section populated from customer profile
 * - Itemized equipment table with dark charcoal header
 * - Columns: Product Name, Qty, Price (INR), Discount (INR), TAX/GST (INR), Amount (INR)
 * - Multiline text wrapping and automatic pagination across multiple pages
 * - Repeated table headers on continuation pages
 * - Dark total summary bar matching the reference PDF
 * - Configurable Terms & Conditions
 * - Authorized signatory block
 * - Page numbering (Page X of Y)
 */
export async function generateQuotationPDF(
  quote: CommercialQuotation,
  company: CompanyQuotationSettings
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4", // 595.28 x 841.89 points
        margins: { top: 36, bottom: 25, left: 40, right: 40 },
        bufferPages: true,
        info: {
          Title: `Quotation-${quote.quotationNumber}`,
          Author: company.companyName,
          Subject: `Commercial Quotation for ${quote.billingDetails.customerName}`,
          Creator: "Shree Shyam Electronics Quotation Engine",
        },
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err: Error) => reject(err));

      const printableWidth = 515.28;
      const leftMargin = 40;
      const rightEdge = leftMargin + printableWidth; // 555.28

      // Table layout metrics
      const colProduct = { x: 40, width: 185 };
      const colQty = { x: 225, width: 45 };
      const colPrice = { x: 270, width: 65 };
      const colDiscount = { x: 335, width: 60 };
      const colTax = { x: 395, width: 55 };
      const colAmount = { x: 450, width: 65 };

      // Helper function to draw the main header
      function drawHeader(isFirstPage = true) {
        if (isFirstPage) {
          // Large Centered "Quotation"
          doc
            .font("Helvetica-Bold")
            .fontSize(22)
            .fillColor("#000000")
            .text("Quotation", leftMargin, 36, { align: "center", width: printableWidth });

          // Company details centered below
          let currentY = 66;
          doc
            .font("Helvetica-Bold")
            .fontSize(13)
            .fillColor("#000000")
            .text(company.companyName, leftMargin, currentY, { align: "center", width: printableWidth });

          currentY += 16;
          doc
            .font("Helvetica")
            .fontSize(10.5)
            .fillColor("#111827")
            .text(company.contactPerson, leftMargin, currentY, { align: "center", width: printableWidth });

          currentY += 14;
          doc
            .font("Helvetica")
            .fontSize(9.5)
            .fillColor("#374151")
            .text(company.address, leftMargin, currentY, { align: "center", width: printableWidth });

          currentY += 13;
          const phoneText = company.phone ? `Ph No. : ${company.phone}` : "";
          const emailText = company.email ? `Email : ${company.email}` : "";
          const contactLine = [phoneText, emailText].filter(Boolean).join(", ");
          if (contactLine) {
            doc
              .font("Helvetica")
              .fontSize(9.5)
              .fillColor("#374151")
              .text(contactLine, leftMargin, currentY, { align: "center", width: printableWidth });
            currentY += 15;
          }

          // Horizontal divider line
          doc
            .strokeColor("#9ca3af")
            .lineWidth(0.75)
            .moveTo(leftMargin, currentY)
            .lineTo(rightEdge, currentY)
            .stroke();

          return currentY + 12;
        } else {
          // Compact header for continuation pages
          doc
            .font("Helvetica-Bold")
            .fontSize(11)
            .fillColor("#000000")
            .text(`${company.companyName} — Quotation ${quote.quotationNumber} (Continued)`, leftMargin, 36, {
              align: "left",
              width: printableWidth,
            });

          doc
            .strokeColor("#9ca3af")
            .lineWidth(0.5)
            .moveTo(leftMargin, 52)
            .lineTo(rightEdge, 52)
            .stroke();

          return 62;
        }
      }

      // Helper to draw Table Header
      function drawTableHeader(y: number): number {
        const headerHeight = 28;
        doc.rect(leftMargin, y, printableWidth, headerHeight).fill("#23262d");

        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8.5);

        // Product Name
        doc.text("Product Name", colProduct.x + 4, y + 9, { width: colProduct.width - 8, align: "left" });

        // Qty
        doc.text("Qty", colQty.x, y + 9, { width: colQty.width, align: "center" });

        // Price (INR)
        doc.text("Price\n(INR)", colPrice.x, y + 3, { width: colPrice.width - 4, align: "right" });

        // Discount (INR)
        doc.text("Discount\n(INR)", colDiscount.x, y + 3, { width: colDiscount.width - 4, align: "right" });

        // TAX/GST (INR)
        doc.text("TAX/GST\n(INR)", colTax.x, y + 3, { width: colTax.width - 4, align: "right" });

        // Amount (INR)
        doc.text("Amount\n(INR)", colAmount.x, y + 3, { width: colAmount.width - 6, align: "right" });

        return y + headerHeight;
      }

      // Start Page 1 Header
      let y = drawHeader(true);

      // Quotation Metadata (Right side) & BILL TO (Left side)
      const metaY = y;
      const formattedDate = formatDateIN(quote.date);
      const formattedValid = formatDateIN(quote.validUntil);

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#000000")
        .text(`Date : ${formattedDate}`, 330, metaY, { align: "right", width: 225 });

      if (quote.quotationNumber) {
        doc
          .font("Helvetica-Bold")
          .fontSize(9.5)
          .fillColor("#1f2937")
          .text(`Quotation No : ${quote.quotationNumber}`, 330, metaY + 15, { align: "right", width: 225 });
      }

      if (formattedValid) {
        doc
          .font("Helvetica")
          .fontSize(8.5)
          .fillColor("#4b5563")
          .text(`Valid Until : ${formattedValid}`, 330, metaY + 29, { align: "right", width: 225 });
      }

      // BILL TO (Left side)
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000").text("BILL TO", leftMargin, metaY);

      let billY = metaY + 16;
      doc.font("Helvetica").fontSize(9.5).fillColor("#111827");

      const b = quote.billingDetails;
      if (b.customerName) {
        doc.text(b.customerName, leftMargin, billY);
        billY += 13;
      }
      if (b.organizationName) {
        doc.text(b.organizationName, leftMargin, billY);
        billY += 13;
      }
      if (b.address) {
        doc.text(b.address, leftMargin, billY);
        billY += 13;
      }
      const cityState = [b.city, b.state].filter(Boolean).join(", ");
      if (cityState) {
        doc.text(cityState, leftMargin, billY);
        billY += 13;
      }
      if (b.country) {
        doc.text(b.country, leftMargin, billY);
        billY += 13;
      }
      if (b.postalCode) {
        doc.text(b.postalCode, leftMargin, billY);
        billY += 13;
      }
      if (b.phone || b.email) {
        const contactArr = [b.phone ? `Ph: ${b.phone}` : "", b.email ? `Email: ${b.email}` : ""].filter(Boolean);
        doc.fontSize(8.5).fillColor("#4b5563").text(contactArr.join(" | "), leftMargin, billY);
        billY += 13;
      }

      // Spacing before table
      y = Math.max(billY, metaY + 50) + 14;

      // Draw initial Table Header
      y = drawTableHeader(y);

      // Render line items
      const items = quote.items || [];
      const bottomLimit = 720; // Leave room for page margin / footer

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Format product display text
        let productDisplayText = item.productName || "Equipment Item";
        if (item.productCode && !productDisplayText.includes(item.productCode)) {
          productDisplayText = `${productDisplayText}\n(${item.productCode})`;
        }

        doc.font("Helvetica").fontSize(9);
        const nameHeight = doc.heightOfString(productDisplayText, { width: colProduct.width - 8 });
        const rowHeight = Math.max(24, nameHeight + 10);

        // Check page overflow
        if (y + rowHeight > bottomLimit) {
          doc.addPage();
          y = drawHeader(false);
          y = drawTableHeader(y);
        }

        // Draw row bottom line
        doc
          .strokeColor("#e5e7eb")
          .lineWidth(0.5)
          .moveTo(leftMargin, y + rowHeight)
          .lineTo(rightEdge, y + rowHeight)
          .stroke();

        // Render cells
        doc.fillColor("#111827").font("Helvetica").fontSize(9);

        // Product Name (wraps multiline)
        doc.text(productDisplayText, colProduct.x + 4, y + 5, {
          width: colProduct.width - 8,
          align: "left",
        });

        // Quantity (e.g. "8 qty")
        doc.text(`${item.quantity} qty`, colQty.x, y + 5, {
          width: colQty.width,
          align: "center",
        });

        // Unit Price
        doc.text(formatINR(item.unitPrice), colPrice.x, y + 5, {
          width: colPrice.width - 4,
          align: "right",
        });

        // Discount
        doc.text(formatINR(item.discountAmount), colDiscount.x, y + 5, {
          width: colDiscount.width - 4,
          align: "right",
        });

        // TAX/GST
        doc.text(formatINR(item.gstAmount), colTax.x, y + 5, {
          width: colTax.width - 4,
          align: "right",
        });

        // Final Line Amount
        doc.font("Helvetica-Bold").text(formatINR(item.totalAmount), colAmount.x, y + 5, {
          width: colAmount.width - 6,
          align: "right",
        });

        y += rowHeight;
      }

      // Draw Total Summary Bar (Matching Reference Sample)
      // Check space for summary bar
      if (y + 35 > bottomLimit) {
        doc.addPage();
        y = drawHeader(false);
      }

      const totalBarY = y + 2;
      const totalBarX = colQty.x; // starts from Qty / Price column to right margin
      const totalBarWidth = rightEdge - totalBarX;
      const totalBarHeight = 26;

      doc.rect(totalBarX, totalBarY, totalBarWidth, totalBarHeight).fill("#23262d");

      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
      doc.text("Total", colPrice.x - 30, totalBarY + 8, { width: 45, align: "right" });

      // Discount Total
      doc.fontSize(8).text(`${formatINR(quote.totalDiscount)}\nINR`, colDiscount.x, totalBarY + 3, {
        width: colDiscount.width - 4,
        align: "right",
      });

      // Tax Total
      doc.fontSize(8).text(`${formatINR(quote.totalTax)}\nINR`, colTax.x, totalBarY + 3, {
        width: colTax.width - 4,
        align: "right",
      });

      // Grand Total Amount
      doc.fontSize(8.5).text(`${formatINR(quote.grandTotal)}\nINR`, colAmount.x, totalBarY + 3, {
        width: colAmount.width - 6,
        align: "right",
      });

      y = totalBarY + totalBarHeight + 25;

      // Check space for Terms & Conditions & Signatory
      if (y + 130 > bottomLimit) {
        doc.addPage();
        y = drawHeader(false);
      }

      // Terms & Conditions section
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000").text("Terms & conditions", leftMargin, y);
      y += 15;

      doc
        .strokeColor("#9ca3af")
        .lineWidth(0.5)
        .moveTo(leftMargin, y)
        .lineTo(leftMargin + 200, y)
        .stroke();
      y += 8;

      const termsList = Array.isArray(quote.terms) && quote.terms.length > 0
        ? quote.terms
        : company.defaultTerms;

      doc.font("Helvetica").fontSize(9).fillColor("#1f2937");
      for (const t of termsList) {
        if (!t.trim()) continue;
        const prefix = t.trim().startsWith("-") ? "" : "- ";
        doc.text(`${prefix}${t.trim()}`, leftMargin, y);
        y += 13;
      }

      // Customer-facing notes if provided
      if (quote.notes && quote.notes.trim()) {
        y += 6;
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#374151").text("Remarks:", leftMargin, y);
        y += 12;
        doc.font("Helvetica").fontSize(8.5).fillColor("#4b5563").text(quote.notes.trim(), leftMargin, y, {
          width: 320,
        });
      }

      // Authorized Signatory Block (Bottom Right)
      const sigY = Math.max(y + 10, 710);
      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor("#111827")
        .text(`For ${company.companyName}`, 340, sigY, { width: 215, align: "right" });

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#4b5563")
        .text("Authorized Signatory", 340, sigY + 45, { width: 215, align: "right" });

      // Second pass: Apply page numbering only when the quotation spans multiple pages
      const pageRange = doc.bufferedPageRange();
      if (pageRange.count > 1) {
        for (let p = 0; p < pageRange.count; p++) {
          doc.switchToPage(p);
          doc.page.margins.bottom = 0; // prevent triggering extra page
          doc
            .font("Helvetica")
            .fontSize(7.5)
            .fillColor("#9ca3af")
            .text(`Page ${p + 1} of ${pageRange.count}`, leftMargin, 815, {
              align: "center",
              width: printableWidth,
              lineBreak: false,
            });
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
