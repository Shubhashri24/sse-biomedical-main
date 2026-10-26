import PDFDocument from "pdfkit";
import type { InvoiceDoc } from "./mongodb";
import { formatINR, formatDateDDMMYYYY } from "./invoice-calculations";

/**
 * Generate a professional invoice PDF mirroring the Care_monitor (1).pdf reference sample.
 * Features:
 * - Top Left: Invoice No.
 * - Top Right: Dated DD/MM/YYYY
 * - Centered Company Details (Shree Shyam Electronics, Jalgaon, Maharashtra Code 27, Email)
 * - Centered bold "Invoice" title
 * - "Party" name and hospital billing address
 * - Classic framed goods table with vertical column dividers:
 *   Description of Goods | Quantity | Rate | per | Amount
 * - Total row with total quantity and final invoice amount
 * - "E. & O.E"
 * - Amount Chargeable (in words)
 * - Company's Bank Details (Bank Name, A/c No, Branch & IFS Code)
 * - Legal Declaration block
 * - "for Shree Shyam Electronics" & "Authorised Signatory"
 * - "This is a Computer Generated Invoice"
 * - Multi-page pagination support for long invoices
 */
export async function generateInvoicePDF(invoice: InvoiceDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4", // 595.28 x 841.89 points
        margins: { top: 32, bottom: 25, left: 38, right: 38 },
        bufferPages: true,
        info: {
          Title: `Invoice-${invoice.invoiceNumber || invoice.invoiceId}`,
          Author: invoice.company?.companyName || "Shree Shyam Electronics",
          Subject: `Tax / Commercial Invoice for ${invoice.customer?.customerName || "Customer"}`,
          Creator: "Shree Shyam Electronics Invoice Engine",
        },
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err: Error) => reject(err));

      const leftMargin = 38;
      const printableWidth = 519.28;
      const rightEdge = leftMargin + printableWidth; // 557.28

      // Table column coordinates
      const colDesc = { x: leftMargin, width: 224 };
      const colQty = { x: leftMargin + 224, width: 60 };
      const colRate = { x: leftMargin + 284, width: 80 };
      const colPer = { x: leftMargin + 364, width: 45 };
      const colAmount = { x: leftMargin + 409, width: 110.28 };

      const colDividers = [
        colQty.x,
        colRate.x,
        colPer.x,
        colAmount.x,
      ];

      const isDraft = !invoice.isFinalized || invoice.status === "DRAFT";
      const isCancelled = invoice.status === "CANCELLED";

      function drawHeader(isFirstPage = true): number {
        if (isFirstPage) {
          // Top row: Invoice No (Left) and Dated (Right)
          const topY = 32;

          doc.font("Helvetica").fontSize(10).fillColor("#000000");
          if (isDraft) {
            doc.text("Draft Ref.", leftMargin, topY);
            doc.font("Helvetica-Bold").fontSize(11).text(invoice.invoiceId, leftMargin + 65, topY);
          } else {
            doc.text("Invoice No.", leftMargin, topY);
            doc.font("Helvetica-Bold").fontSize(11).text(invoice.invoiceNumber || invoice.invoiceId, leftMargin + 65, topY);
          }

          const formattedDate = formatDateDDMMYYYY(invoice.invoiceDate || new Date());
          doc.font("Helvetica").fontSize(10);
          const datedLabel = "Dated ";
          const datedWidth = doc.widthOfString(datedLabel);
          doc.font("Helvetica-Bold").fontSize(10.5);
          const dateValWidth = doc.widthOfString(formattedDate);
          const totalDateWidth = datedWidth + dateValWidth;

          doc.font("Helvetica").fontSize(10).text(datedLabel, rightEdge - totalDateWidth, topY);
          doc.font("Helvetica-Bold").fontSize(10.5).text(formattedDate, rightEdge - dateValWidth, topY);

          // Company details centered below
          let currentY = 40;
          const company = invoice.company || {};

          doc
            .font("Helvetica-Bold")
            .fontSize(12.5)
            .fillColor("#000000")
            .text(company.companyName || "Shree Shyam Electronics", leftMargin, currentY, {
              align: "center",
              width: printableWidth,
            });

          currentY += 15;
          doc.font("Helvetica").fontSize(9).fillColor("#111827");

          // Address lines
          if (company.address) {
            // Split if contains comma
            const addrParts = company.address.split(",").map((s) => s.trim()).filter(Boolean);
            if (addrParts.length > 2) {
              doc.text(addrParts.slice(0, 2).join(", "), leftMargin, currentY, { align: "center", width: printableWidth });
              currentY += 11;
              doc.text(addrParts.slice(2).join(", "), leftMargin, currentY, { align: "center", width: printableWidth });
              currentY += 11;
            } else {
              doc.text(company.address, leftMargin, currentY, { align: "center", width: printableWidth });
              currentY += 11;
            }
          }

          const stateLine = `State Name : ${company.state || "Maharashtra"}, Code : ${company.stateCode || "27"}`;
          doc.text(stateLine, leftMargin, currentY, { align: "center", width: printableWidth });
          currentY += 11;

          if (company.email) {
            doc.text(`E-Mail : ${company.email}`, leftMargin, currentY, { align: "center", width: printableWidth });
            currentY += 11;
          }

          if (company.gstin) {
            doc.text(`GSTIN : ${company.gstin}`, leftMargin, currentY, { align: "center", width: printableWidth });
            currentY += 11;
          }

          currentY += 10;

          // Centered Invoice Title
          let invoiceTitle = "Invoice";
          let titleColor = "#000000";
          if (isCancelled) {
            invoiceTitle = "CANCELLED INVOICE";
            titleColor = "#dc2626";
          } else if (isDraft) {
            invoiceTitle = "PROFORMA / ESTIMATE (DRAFT)";
            titleColor = "#4b5563";
          }

          doc
            .font("Helvetica-Bold")
            .fontSize(13)
            .fillColor(titleColor)
            .text(invoiceTitle, leftMargin, currentY, { align: "center", width: printableWidth });

          currentY += 22;

          // Party section (Matching sample: "Party    <Hospital Name>")
          const partyY = currentY;
          doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000").text("Party", leftMargin + 85, partyY);

          const customer = invoice.customer || { customerName: "" };
          let partyText = customer.customerName;
          if (customer.facilityName && !partyText.includes(customer.facilityName)) {
            partyText = `${partyText} (${customer.facilityName})`;
          }

          doc.font("Helvetica-Bold").fontSize(10).fillColor("#000000");
          doc.text(partyText, leftMargin + 125, partyY, {
            width: printableWidth - 130,
            align: "left",
          });

          // Compute height of customer text
          const partyHeight = doc.heightOfString(partyText, { width: printableWidth - 130 });
          currentY = partyY + Math.max(16, partyHeight + 4);

          // Billing address if available
          const addrLines: string[] = [
            customer.billingAddress || "",
            [customer.city, customer.state, customer.pinCode].filter(Boolean).join(", "),
            customer.gstin ? `GSTIN: ${customer.gstin}` : "",
          ].filter((l) => Boolean(l.trim()));

          if (addrLines.length > 0) {
            doc.font("Helvetica").fontSize(8.5).fillColor("#374151");
            for (const line of addrLines) {
              doc.text(line, leftMargin + 125, currentY, { width: printableWidth - 130 });
              currentY += 11;
            }
            currentY += 4;
          }

          return currentY + 6;
        } else {
          // Continuation page header
          const continuationDocRef = isDraft ? `Draft ${invoice.invoiceId}` : `Invoice ${invoice.invoiceNumber || invoice.invoiceId}`;
          doc
            .font("Helvetica-Bold")
            .fontSize(10)
            .fillColor("#000000")
            .text(`${invoice.company?.companyName || "Shree Shyam Electronics"} — ${continuationDocRef} (Contd.)`, leftMargin, 32, {
              width: printableWidth,
              align: "left",
            });

          doc
            .strokeColor("#9ca3af")
            .lineWidth(0.5)
            .moveTo(leftMargin, 48)
            .lineTo(rightEdge, 48)
            .stroke();

          return 56;
        }
      }

      function drawTableHeader(y: number): number {
        const headerHeight = 22;

        // Top line
        doc.strokeColor("#000000").lineWidth(0.75).moveTo(leftMargin, y).lineTo(rightEdge, y).stroke();
        // Bottom line
        doc.strokeColor("#000000").lineWidth(0.75).moveTo(leftMargin, y + headerHeight).lineTo(rightEdge, y + headerHeight).stroke();
        // Left & right outer borders
        doc.strokeColor("#000000").lineWidth(0.75).moveTo(leftMargin, y).lineTo(leftMargin, y + headerHeight).stroke();
        doc.strokeColor("#000000").lineWidth(0.75).moveTo(rightEdge, y).lineTo(rightEdge, y + headerHeight).stroke();

        // Vertical dividers for header
        for (const divX of colDividers) {
          doc.strokeColor("#000000").lineWidth(0.75).moveTo(divX, y).lineTo(divX, y + headerHeight).stroke();
        }

        doc.fillColor("#000000").font("Helvetica").fontSize(9);

        // Header text labels exactly as sample
        doc.text("Description of Goods", colDesc.x + 6, y + 6, { width: colDesc.width - 12, align: "center" });
        doc.text("Quantity", colQty.x, y + 6, { width: colQty.width, align: "center" });
        doc.text("Rate", colRate.x, y + 6, { width: colRate.width - 4, align: "center" });
        doc.text("per", colPer.x, y + 6, { width: colPer.width, align: "center" });
        doc.text("Amount", colAmount.x, y + 6, { width: colAmount.width - 8, align: "center" });

        return y + headerHeight;
      }

      let y = drawHeader(true);
      let currentPageTableStartY = y;
      y = drawTableHeader(y);

      const items = invoice.items || [];
      const bottomLimit = 540; // Max Y for items on single page to leave room for bank/declaration/signatory

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const srNo = `${i + 1}. `;

        let descText = `${srNo}${item.description || "Medical Equipment"}`;
        if (item.detailedDescription && item.detailedDescription.trim()) {
          descText += `\n${item.detailedDescription.trim()}`;
        }

        doc.font("Helvetica-Bold").fontSize(9.5);
        const descHeight = doc.heightOfString(descText, { width: colDesc.width - 14 });
        const rowHeight = Math.max(26, descHeight + 12);

        // Check if page overflow
        if (y + rowHeight > bottomLimit) {
          // Close current page table box
          doc.strokeColor("#000000").lineWidth(0.75).moveTo(leftMargin, y).lineTo(rightEdge, y).stroke();
          // Draw column dividers up to this point
          for (const divX of colDividers) {
            doc.strokeColor("#000000").lineWidth(0.75).moveTo(divX, currentPageTableStartY).lineTo(divX, y).stroke();
          }
          doc.strokeColor("#000000").lineWidth(0.75).moveTo(leftMargin, currentPageTableStartY).lineTo(leftMargin, y).stroke();
          doc.strokeColor("#000000").lineWidth(0.75).moveTo(rightEdge, currentPageTableStartY).lineTo(rightEdge, y).stroke();

          doc.addPage();
          y = drawHeader(false);
          currentPageTableStartY = y;
          y = drawTableHeader(y);
        }

        // Render line cells
        doc.fillColor("#000000").font("Helvetica-Bold").fontSize(9.5);

        // Description of Goods
        doc.text(descText, colDesc.x + 8, y + 6, {
          width: colDesc.width - 16,
          align: "left",
        });

        // Quantity (e.g. "1.00")
        const qtyFormatted = Number(item.quantity || 0).toFixed(2);
        doc.text(qtyFormatted, colQty.x, y + 6, {
          width: colQty.width,
          align: "center",
        });

        // Rate
        const rateFormatted = formatINR(item.rate);
        doc.font("Helvetica").text(rateFormatted, colRate.x, y + 6, {
          width: colRate.width - 8,
          align: "right",
        });

        // per (e.g. "Qty")
        doc.text(item.unit || "Qty", colPer.x, y + 6, {
          width: colPer.width,
          align: "center",
        });

        // Amount
        doc.font("Helvetica").text(formatINR(item.amount), colAmount.x, y + 6, {
          width: colAmount.width - 10,
          align: "right",
        });

        y += rowHeight;
      }

      // Fill remaining vertical space in table to reach standard table bottom matching sample invoice
      const targetTableHeight = Math.max(y, 480);
      const emptySpace = targetTableHeight - y;
      if (emptySpace > 0) {
        y = targetTableHeight;
      }

      // Draw Total Row
      const totalRowHeight = 22;
      const totalY = y;

      // Line above total row
      doc.strokeColor("#000000").lineWidth(0.75).moveTo(leftMargin, totalY).lineTo(rightEdge, totalY).stroke();
      // Line below total row
      doc.strokeColor("#000000").lineWidth(0.75).moveTo(leftMargin, totalY + totalRowHeight).lineTo(rightEdge, totalY + totalRowHeight).stroke();

      // Outer left and right borders of whole table from currentPageTableStartY to totalY + totalRowHeight
      doc.strokeColor("#000000").lineWidth(0.75).moveTo(leftMargin, currentPageTableStartY).lineTo(leftMargin, totalY + totalRowHeight).stroke();
      doc.strokeColor("#000000").lineWidth(0.75).moveTo(rightEdge, currentPageTableStartY).lineTo(rightEdge, totalY + totalRowHeight).stroke();

      // Vertical column dividers through whole table
      for (const divX of colDividers) {
        doc.strokeColor("#000000").lineWidth(0.75).moveTo(divX, currentPageTableStartY).lineTo(divX, totalY + totalRowHeight).stroke();
      }

      // Render Total row content
      doc.fillColor("#000000").font("Helvetica").fontSize(10);
      doc.text("Total", colDesc.x + colDesc.width - 45, totalY + 5, { width: 40, align: "right" });

      const totalQtyFormatted = Number(invoice.totalQuantity || 0).toFixed(2);
      doc.font("Helvetica-Bold").text(totalQtyFormatted, colQty.x, totalY + 5, {
        width: colQty.width,
        align: "center",
      });

      doc.font("Helvetica-Bold").text(formatINR(invoice.grandTotal), colAmount.x, totalY + 5, {
        width: colAmount.width - 10,
        align: "right",
      });

      y = totalY + totalRowHeight;

      // E. & O.E on the right just under table
      doc.font("Helvetica").fontSize(8).fillColor("#000000").text("E. & O.E", rightEdge - 50, y + 4, { align: "right", width: 50 });

      // Amount Chargeable (in words) on left
      const wordsY = y + 4;
      doc.font("Helvetica").fontSize(8.5).fillColor("#000000").text("Amount Chargeable (in words)", leftMargin, wordsY);

      doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#000000");
      const amountWords = invoice.amountInWords || "INR Zero only.";
      doc.text(amountWords, leftMargin, wordsY + 12, { width: 220 });

      // Bank Details block (Centered / slightly right of center matching sample)
      const bank = invoice.company || {};
      const hasBankDetails = Boolean(
        bank.isBankVerified && (bank.bankName || bank.accountNumber || bank.branchAndIfsc || bank.ifscCode)
      );

      const bankX = 235;
      let bankY = wordsY + 22;

      if (hasBankDetails) {
        doc.font("Helvetica").fontSize(9).fillColor("#000000").text("Company's Bank Details", bankX, bankY);
        bankY += 16;

        const labelWidth = 85;
        if (bank.bankName) {
          doc.font("Helvetica").fontSize(8.5).text("Bank Name", bankX, bankY);
          doc.font("Helvetica-Bold").fontSize(8.5).text(`:${bank.bankName}`, bankX + labelWidth, bankY);
          bankY += 12;
        }

        if (bank.accountHolderName) {
          doc.font("Helvetica").fontSize(8.5).text("A/c Holder", bankX, bankY);
          doc.font("Helvetica-Bold").fontSize(8.5).text(`:${bank.accountHolderName}`, bankX + labelWidth, bankY);
          bankY += 12;
        }

        if (bank.accountNumber) {
          doc.font("Helvetica").fontSize(8.5).text("A/c No.", bankX, bankY);
          doc.font("Helvetica-Bold").fontSize(8.5).text(`:${bank.accountNumber}`, bankX + labelWidth, bankY);
          bankY += 12;
        }

        if (bank.branchAndIfsc || bank.ifscCode) {
          const ifscText = bank.branchAndIfsc || (bank.branchName ? `${bank.branchName} (${bank.ifscCode})` : bank.ifscCode);
          doc.font("Helvetica").fontSize(8.5).text(`Branch & IFS Code: ${ifscText}`, bankX, bankY + 4);
          bankY += 16;
        }
      }

      // Declaration block (Bottom Left)
      const declY = Math.max(bankY + 10, 680);
      doc.font("Helvetica").fontSize(7.5).fillColor("#000000").text("Declaration", leftMargin, declY);

      const declText =
        bank.declaration ||
        "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.";

      doc.font("Helvetica").fontSize(7).fillColor("#111827").text(declText, leftMargin, declY + 9, {
        width: 175,
        lineGap: 1.5,
      });

      // Authorized Signatory block (Bottom Right matching sample)
      const sigX = 350;
      const sigWidth = rightEdge - sigX;

      doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#000000");
      doc.text(`for ${bank.companyName || "Shree Shyam Electronics"}`, sigX, declY - 4, {
        width: sigWidth,
        align: "right",
      });

      // Space for signature/stamp
      doc.font("Helvetica").fontSize(9).fillColor("#000000");
      doc.text(bank.signatoryTitle || "Authorised Signatory", sigX, declY + 44, {
        width: sigWidth,
        align: "right",
      });

      // Footer: "This is a Computer Generated Invoice"
      const footerY = 765;
      doc.font("Helvetica").fontSize(8).fillColor("#000000");
      doc.text("This is a Computer Generated Invoice", leftMargin, footerY, {
        align: "center",
        width: printableWidth,
      });

      // Horizontal line under "This is a Computer Generated Invoice"
      const footerTextWidth = doc.widthOfString("This is a Computer Generated Invoice");
      const lineStartX = (leftMargin + rightEdge - footerTextWidth) / 2 - 8;
      const lineEndX = lineStartX + footerTextWidth + 16;
      doc.strokeColor("#000000").lineWidth(0.5).moveTo(lineStartX, footerY + 10).lineTo(lineEndX, footerY + 10).stroke();

      // Multi-page page numbering if >1 page
      const pageRange = doc.bufferedPageRange();
      if (pageRange.count > 1) {
        for (let p = 0; p < pageRange.count; p++) {
          doc.switchToPage(p);
          doc.page.margins.bottom = 0;
          doc
            .font("Helvetica")
            .fontSize(7.5)
            .fillColor("#6b7280")
            .text(`Page ${p + 1} of ${pageRange.count}`, leftMargin, 810, {
              align: "center",
              width: printableWidth,
              lineBreak: false,
            });
        }
      }

      // Draw watermark across all pages if Draft or Cancelled
      if (isDraft || isCancelled) {
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        for (let p = 0; p < pageRange.count; p++) {
          doc.switchToPage(p);
          doc.save();
          if (isCancelled) {
            doc.opacity(0.18).fillColor("#dc2626");
            doc.font("Helvetica-Bold").fontSize(52);
            doc.rotate(-45, { origin: [pageWidth / 2, pageHeight / 2] });
            doc.text("CANCELLED", 0, pageHeight / 2 - 25, { width: pageWidth, align: "center" });
          } else if (isDraft) {
            doc.opacity(0.12).fillColor("#475569");
            doc.font("Helvetica-Bold").fontSize(30);
            doc.rotate(-45, { origin: [pageWidth / 2, pageHeight / 2] });
            doc.text("DRAFT / ESTIMATE — NOT A TAX INVOICE", -40, pageHeight / 2 - 20, { width: pageWidth + 80, align: "center" });
          }
          doc.restore();
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
