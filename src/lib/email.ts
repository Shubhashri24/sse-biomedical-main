import nodemailer from "nodemailer";
import type { QuotationRequestDoc } from "./mongodb";

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000, // 10s connection establishment timeout
    greetingTimeout: 10000,   // 10s greeting timeout
    socketTimeout: 15000,     // 15s inactivity socket timeout
  });
}

function sanitizeSmtpError(err: unknown): string {
  const rawMsg = err instanceof Error ? err.message : String(err);
  if (
    rawMsg.includes("Invalid login") ||
    rawMsg.includes("Username and Password not accepted") ||
    rawMsg.includes("535")
  ) {
    return "SMTP authentication failed. Please verify that a valid 16-character Google App Password is configured in SMTP_PASSWORD.";
  }
  if (
    rawMsg.includes("ETIMEDOUT") ||
    rawMsg.includes("ESOCKETTIMEDOUT") ||
    rawMsg.includes("Greeting never received") ||
    rawMsg.includes("timeout")
  ) {
    return "SMTP connection timed out. Please check network connectivity to the mail server.";
  }
  if (rawMsg.includes("ECONNREFUSED")) {
    return "Connection refused by SMTP host. Please verify SMTP_HOST and SMTP_PORT.";
  }
  if (rawMsg.includes("ENOTFOUND")) {
    return "SMTP host could not be resolved. Please verify SMTP_HOST.";
  }
  if (rawMsg.includes("EENVELOPE") || rawMsg.includes("No recipients defined")) {
    return "Invalid recipient address or rejection by mail server.";
  }
  return "Email dispatch failed. Please verify SMTP configuration and recipient address.";
}

/**
 * Send notification email to the administrator when a new quotation is received.
 */
export async function sendAdminNotification(
  quotation: QuotationRequestDoc
): Promise<EmailResult> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn(
      "[Email Service] ADMIN_EMAIL not configured in environment. Skipping admin email notification."
    );
    return { success: false, error: "ADMIN_EMAIL environment variable not configured" };
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.warn(
      "[Email Service] SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASSWORD) not configured. Skipping admin notification dispatch."
    );
    return { success: false, error: "SMTP credentials not configured" };
  }

  const subject = `New Quotation Request – ${quotation.equipment} – ${quotation.requestId}`;

  const textContent = `
New Quotation Request

Request ID: ${quotation.requestId}

CUSTOMER
Name: ${quotation.customerName}
Email: ${quotation.customerEmail}
Phone: ${quotation.phone}
Facility: ${quotation.facility || "Not specified"}

EQUIPMENT
Category: ${quotation.category}
Equipment: ${quotation.equipment}
Equipment Code: ${quotation.equipmentCode || "N/A"}
Quantity: ${quotation.quantity}

MESSAGE
${quotation.message || "No additional message."}

Submitted:
${quotation.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
  `.trim();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
      <h2 style="color: #0c131c; border-bottom: 2px solid #35e7c6; padding-bottom: 8px;">
        New Quotation Request — <span style="color: #35e7c6;">${quotation.requestId}</span>
      </h2>

      <h3 style="color: #333; margin-top: 20px;">Customer Information</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; font-weight: bold; width: 140px;">Name:</td><td>${quotation.customerName}</td></tr>
        <tr><td style="padding: 4px 0; font-weight: bold;">Email:</td><td><a href="mailto:${quotation.customerEmail}">${quotation.customerEmail}</a></td></tr>
        <tr><td style="padding: 4px 0; font-weight: bold;">Phone:</td><td><a href="tel:${quotation.phone}">${quotation.phone}</a></td></tr>
        <tr><td style="padding: 4px 0; font-weight: bold;">Facility:</td><td>${quotation.facility || "Not specified"}</td></tr>
      </table>

      <h3 style="color: #333; margin-top: 20px;">Equipment Information</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; font-weight: bold; width: 140px;">Category:</td><td>${quotation.category}</td></tr>
        <tr><td style="padding: 4px 0; font-weight: bold;">Equipment:</td><td>${quotation.equipment}</td></tr>
        <tr><td style="padding: 4px 0; font-weight: bold;">Equipment Code:</td><td>${quotation.equipmentCode || "N/A"}</td></tr>
        <tr><td style="padding: 4px 0; font-weight: bold;">Quantity:</td><td>${quotation.quantity}</td></tr>
      </table>

      <h3 style="color: #333; margin-top: 20px;">Requirement Message</h3>
      <div style="background: #f4f6f8; padding: 12px; border-radius: 4px; font-style: italic;">
        ${quotation.message ? quotation.message.replace(/\n/g, "<br/>") : "No additional message."}
      </div>

      <p style="font-size: 12px; color: #777; margin-top: 24px;">
        Submitted at ${quotation.createdAt.toISOString()} via Shree Shyam Electronics Biomedical Systems Catalog.
      </p>
    </div>
  `;

  try {
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@shreeshyamelectronics.com";
    const info = await transporter.sendMail({
      from: `"SSE Biomedical Inquiries" <${fromAddress}>`,
      to: adminEmail,
      replyTo: quotation.customerEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    return { success: true, messageId: info.messageId };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[Email Service] Failed to send admin email notification:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send official quotation reply email to the customer from the admin dashboard.
 */
export async function sendCustomerReply({
  customerName,
  customerEmail,
  equipment,
  requestId,
  replyMessage,
}: {
  customerName: string;
  customerEmail: string;
  equipment: string;
  requestId: string;
  replyMessage: string;
}): Promise<EmailResult> {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      success: false,
      error: "SMTP credentials not configured on server. Please configure SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env.local.",
    };
  }

  const subject = `Quotation Request – ${equipment} – ${requestId}`;

  const textContent = `
Dear ${customerName},

Thank you for contacting Shree Shyam Electronics regarding your requirement for ${equipment}.

${replyMessage}

If you have any further questions, please feel free to contact us.

Regards,
Shree Shyam Electronics
Biomedical Systems Division
Phone: +91 82752 90643
  `.trim();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
      <div style="border-bottom: 2px solid #35e7c6; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #0c131c;">SHREE SHYAM ELECTRONICS</h2>
        <span style="font-size: 12px; text-transform: uppercase; color: #666; letter-spacing: 0.15em;">Biomedical Systems Division</span>
      </div>

      <p>Dear <strong>${customerName}</strong>,</p>

      <p>
        Thank you for contacting Shree Shyam Electronics regarding your quotation requirement for 
        <strong>${equipment}</strong> (Reference ID: <code>${requestId}</code>).
      </p>

      <div style="background: #f8fafc; border-left: 4px solid #35e7c6; padding: 16px; margin: 20px 0; white-space: pre-line; color: #222;">
${replyMessage}
      </div>

      <p>If you have any further questions, specifications to clarify, or immediate delivery requirements, please feel free to reach out directly.</p>

      <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; pt: 16px; font-size: 13px; color: #475569;">
        <strong>Shree Shyam Electronics</strong><br/>
        Biomedical Systems Division<br/>
        Contact Person: Amol Agrawal<br/>
        Phone: <a href="tel:+918275290643" style="color: #0284c7;">+91 82752 90643</a>
      </div>
    </div>
  `;

  try {
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || "info@shreeshyamelectronics.com";
    const info = await transporter.sendMail({
      from: `"Shree Shyam Electronics" <${fromAddress}>`,
      to: customerEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    return { success: true, messageId: info.messageId };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[Email Service] Failed to send customer reply email:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send official commercial quotation email to the customer with the generated PDF attached.
 */
export async function sendQuotationPdfEmail({
  customerName,
  customerEmail,
  quotationNumber,
  grandTotal,
  currency = "INR",
  pdfBuffer,
  pdfFilename,
}: {
  customerName: string;
  customerEmail: string;
  quotationNumber: string;
  grandTotal: number;
  currency?: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}): Promise<EmailResult> {
  const transporter = getTransporter();
  if (!transporter) {
    return {
      success: false,
      error: "SMTP credentials not configured on server. Please configure SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env.local to dispatch quotations with attachments.",
    };
  }

  const formattedTotal = `${currency} ${Number(grandTotal).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const subject = `Official Commercial Quotation – ${quotationNumber} – Shree Shyam Electronics`;

  const textContent = `
Dear ${customerName},

Please find attached the official commercial quotation (${quotationNumber}) for your requested biomedical equipment from Shree Shyam Electronics.

QUOTATION SUMMARY
- Quotation Number: ${quotationNumber}
- Customer Name: ${customerName}
- Grand Total: ${formattedTotal}
- Attached Document: ${pdfFilename}

The complete itemized pricing, technical specifications, warranty schedule, and commercial terms are detailed in the attached PDF.

If you have any questions or require further assistance, please contact us.

Regards,
Shree Shyam Electronics
Biomedical Systems Division
MIDC Bhagi Pala Market, Jalgaon, Jalgaon – 425003
Phone: +91 82752 90643
Email: lokeshpurya@gmail.com
  `.trim();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 22px 24px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.03em; color: #38bdf8;">SHREE SHYAM ELECTRONICS</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Biomedical Equipment & Systems Division</p>
      </div>

      <div style="padding: 24px;">
        <p style="margin-top: 0; font-size: 15px;">Dear <strong>${customerName}</strong>,</p>

        <p style="font-size: 14px; color: #334155;">
          Thank you for your interest in Shree Shyam Electronics. As requested, we are pleased to deliver our official commercial quotation for your biomedical equipment requirements.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 160px;">Quotation Number:</td>
              <td style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #0f172a;">${quotationNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Customer Name:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Total Amount:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #047857; font-size: 16px;">${formattedTotal}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">PDF Attachment:</td>
              <td style="padding: 6px 0; color: #0284c7; font-weight: 600;">📎 ${pdfFilename}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13.5px; color: #475569;">
          The attached PDF document contains complete itemized pricing, applicable discounts, tax breakdowns, warranty information, and terms &amp; conditions.
        </p>

        <p style="font-size: 13.5px; color: #475569;">
          Should your procurement committee require additional documentation, purchase orders, or technical presentations, please do not hesitate to contact us.
        </p>

        <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          <strong>Shree Shyam Electronics</strong><br/>
          Biomedical Systems Division<br/>
          MIDC Bhagi Pala Market, Jalgaon, Jalgaon – 425003<br/>
          Phone: <a href="tel:+918275290643" style="color: #0284c7;">+91 82752 90643</a> &bull; Email: <a href="mailto:lokeshpurya@gmail.com" style="color: #0284c7;">lokeshpurya@gmail.com</a>
        </div>
      </div>
    </div>
  `;

  try {
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || "info@shreeshyamelectronics.com";
    const info = await transporter.sendMail({
      from: `"Shree Shyam Electronics" <${fromAddress}>`,
      to: customerEmail,
      subject,
      text: textContent,
      html: htmlContent,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return { success: true, messageId: info.messageId };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[Email Service] Failed to send quotation PDF email:", errorMessage);
    return { success: false, error: sanitizeSmtpError(err) };
  }
}

/**
 * Send official tax invoice email to the customer with the generated PDF attached.
 */
export async function sendInvoicePdfEmail({
  customerName,
  customerEmail,
  invoiceNumber,
  grandTotal,
  balanceDue,
  dueDate,
  currency = "INR",
  pdfBuffer,
  pdfFilename,
}: {
  customerName: string;
  customerEmail: string;
  invoiceNumber: string;
  grandTotal: number;
  balanceDue?: number;
  dueDate?: Date | null;
  currency?: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}): Promise<EmailResult> {
  const recipient = (customerEmail || "").trim();
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return {
      success: false,
      error: "A valid recipient email address is required to dispatch the invoice.",
    };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return {
      success: false,
      error: "SMTP credentials not configured on server. Please configure SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env.local to dispatch invoices.",
    };
  }

  const formattedTotal = `${currency} ${Number(grandTotal).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const formattedDue = balanceDue !== undefined
    ? `${currency} ${Number(balanceDue).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : undefined;

  const formattedDueDate = dueDate
    ? new Date(dueDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : undefined;

  const safeFilename = (pdfFilename || `Invoice-${invoiceNumber}.pdf`).replace(/[/\\?%*:|"<>]/g, "-");
  const subject = `Official Tax Invoice – ${invoiceNumber} – Shree Shyam Electronics`;

  const textContent = `
Dear ${customerName},

Please find attached official Tax Invoice (${invoiceNumber}) from Shree Shyam Electronics Biomedical Systems Division.

INVOICE SUMMARY
- Invoice Number: ${invoiceNumber}
- Customer / Facility: ${customerName}
- Total Invoice Amount: ${formattedTotal}
${formattedDue !== undefined ? `- Balance Due: ${formattedDue}\n` : ""}${formattedDueDate ? `- Payment Due Date: ${formattedDueDate}\n` : ""}- Attached Document: ${safeFilename}

The complete itemized goods/services list, tax breakdown, serial numbers, warranty terms, and banking payment instructions are contained in the attached official PDF.

If you have any questions or require additional payment documentation, please contact our billing department:
Phone: +91 82752 90643
Email: lokeshpurya@gmail.com

Regards,
Shree Shyam Electronics
Biomedical Systems Division
MIDC Bhagi Pala Market, Jalgaon, Maharashtra – 425003
  `.trim();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 22px 24px; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.03em; color: #38bdf8;">SHREE SHYAM ELECTRONICS</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Biomedical Equipment &amp; Systems Division &bull; Tax Invoice</p>
      </div>

      <div style="padding: 24px;">
        <p style="margin-top: 0; font-size: 15px;">Dear <strong>${customerName}</strong>,</p>

        <p style="font-size: 14px; color: #334155;">
          Please find attached our official Tax Invoice for your biomedical equipment and services supplied by Shree Shyam Electronics.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 160px;">Invoice Number:</td>
              <td style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #0f172a;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Customer / Facility:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Invoice Total:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #047857; font-size: 16px;">${formattedTotal}</td>
            </tr>
            ${
              formattedDue !== undefined
                ? `<tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Balance Due:</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #b45309;">${formattedDue}</td>
                  </tr>`
                : ""
            }
            ${
              formattedDueDate
                ? `<tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Due Date:</td>
                    <td style="padding: 6px 0; color: #334155;">${formattedDueDate}</td>
                  </tr>`
                : ""
            }
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">PDF Attachment:</td>
              <td style="padding: 6px 0; color: #0284c7; font-weight: 600;">📎 ${safeFilename}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13.5px; color: #475569;">
          The attached computer-generated PDF contains complete itemized equipment descriptions, HSN codes, quantity breakdowns, applicable tax computations (GST), warranty coverage, and official bank account details for remittances.
        </p>

        <p style="font-size: 13.5px; color: #475569;">
          Should your finance or procurement department require any supporting documents or clarifications, please reach out to our team.
        </p>

        <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          <strong>Shree Shyam Electronics</strong><br/>
          Biomedical Systems Division<br/>
          MIDC Bhagi Pala Market, Jalgaon, Maharashtra – 425003<br/>
          Phone: <a href="tel:+918275290643" style="color: #0284c7;">+91 82752 90643</a> &bull; Email: <a href="mailto:lokeshpurya@gmail.com" style="color: #0284c7;">lokeshpurya@gmail.com</a>
        </div>
      </div>
    </div>
  `;

  try {
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || "info@shreeshyamelectronics.com";
    const info = await transporter.sendMail({
      from: `"Shree Shyam Electronics" <${fromAddress}>`,
      to: recipient,
      subject,
      text: textContent,
      html: htmlContent,
      attachments: [
        {
          filename: safeFilename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return { success: true, messageId: info.messageId };
  } catch (err: unknown) {
    const rawError = err instanceof Error ? err.message : String(err);
    console.error("[Email Service] Failed to send invoice PDF email:", rawError);
    return { success: false, error: sanitizeSmtpError(err) };
  }
}


