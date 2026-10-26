export type TaxTreatment = "INTRA_STATE" | "INTER_STATE" | "NONE";

export interface InvoiceLineItemInput {
  description: string;
  quantity: number;
  rate: number;
  unit?: string;
  discount?: number;
  taxRate?: number;
  taxTreatment?: TaxTreatment;
}

export interface InvoiceLineItemCalculated {
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

export interface InvoiceTotalsInput {
  items: Array<{
    quantity: number;
    rate: number;
    discount?: number;
    taxRate?: number;
    amount?: number;
  }>;
  taxTreatment?: TaxTreatment;
  additionalCharges?: number;
  applyRoundOff?: boolean;
}

export interface InvoiceTotalsResult {
  totalQuantity: number;
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  additionalCharges: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
}

/**
 * Decimal-safe round to 2 decimal places to prevent floating-point drift.
 */
export function round2(num: number): number {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates financial figures for an individual invoice line item.
 */
export function calculateInvoiceLineItem(input: InvoiceLineItemInput): InvoiceLineItemCalculated {
  const quantity = Math.max(0, Number(input.quantity) || 0);
  const rate = Math.max(0, Number(input.rate) || 0);
  const rawDiscount = Math.max(0, Number(input.discount) || 0);
  const isTaxExempt = input.taxTreatment === "NONE";
  const taxRate = isTaxExempt ? 0 : Math.max(0, Math.min(100, Number(input.taxRate) || 0));

  const grossAmount = round2(quantity * rate);
  const discountAmount = Math.min(grossAmount, round2(rawDiscount));
  const taxableAmount = round2(grossAmount - discountAmount);
  const taxAmount = round2(taxableAmount * (taxRate / 100));
  const totalAmount = round2(taxableAmount + taxAmount);

  return {
    grossAmount,
    discountAmount,
    taxableAmount,
    taxRate,
    taxAmount,
    totalAmount,
  };
}

/**
 * Calculates aggregate invoice totals with standard Indian GST rules (CGST+SGST vs IGST).
 */
export function calculateInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotalsResult {
  const taxTreatment = input.taxTreatment || "NONE";
  const additionalCharges = round2(Math.max(0, Number(input.additionalCharges) || 0));
  const items = Array.isArray(input.items) ? input.items : [];

  let totalQuantity = 0;
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableAmount = 0;
  let totalTax = 0;

  for (const item of items) {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const rate = Math.max(0, Number(item.rate) || 0);
    const disc = Math.max(0, Number(item.discount) || 0);
    const taxRate = taxTreatment === "NONE" ? 0 : Math.max(0, Math.min(100, Number(item.taxRate) || 0));

    const line = calculateInvoiceLineItem({
      description: "",
      quantity: qty,
      rate,
      discount: disc,
      taxRate,
      taxTreatment,
    });

    totalQuantity += qty;
    subtotal += line.grossAmount;
    totalDiscount += line.discountAmount;
    taxableAmount += line.taxableAmount;
    totalTax += line.taxAmount;
  }

  subtotal = round2(subtotal);
  totalDiscount = round2(totalDiscount);
  taxableAmount = round2(taxableAmount);
  totalTax = round2(totalTax);
  totalQuantity = round2(totalQuantity);

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (taxTreatment === "INTRA_STATE") {
    // Intra-state: Half CGST + Half SGST
    cgstAmount = round2(totalTax / 2);
    sgstAmount = round2(totalTax - cgstAmount);
  } else if (taxTreatment === "INTER_STATE") {
    // Inter-state: Full IGST
    igstAmount = totalTax;
  } else {
    // NONE or standard rate already in line items
    cgstAmount = 0;
    sgstAmount = 0;
    igstAmount = 0;
    totalTax = 0;
  }

  const rawGrandTotal = round2(taxableAmount + totalTax + additionalCharges);

  let roundOff = 0;
  let grandTotal = rawGrandTotal;

  if (input.applyRoundOff) {
    const rounded = Math.round(rawGrandTotal);
    roundOff = round2(rounded - rawGrandTotal);
    grandTotal = rounded;
  }

  const amountInWords = amountToWordsIndian(grandTotal);

  return {
    totalQuantity,
    subtotal,
    totalDiscount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    additionalCharges,
    roundOff,
    grandTotal,
    amountInWords,
  };
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function convertBelowThousand(n: number): string {
  let str = "";
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ONES[n % 10] : "");
  } else if (n > 0) {
    str += ONES[n];
  }
  return str.trim();
}

/**
 * Converts any numeric amount into Indian Numbering System words.
 * Follows the sample format:
 * "INR Twenty Three Thousand Five Hundred only."
 */
export function amountToWordsIndian(amount: number): string {
  const rounded = round2(Math.abs(amount));
  if (rounded === 0) {
    return "INR Zero only.";
  }

  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  let words = "";

  // Indian numbering: Crores (1,00,00,000), Lakhs (1,00,000), Thousands (1,000), Hundreds (100)
  const crore = Math.floor(rupees / 10000000);
  let rem = rupees % 10000000;

  const lakh = Math.floor(rem / 100000);
  rem %= 100000;

  const thousand = Math.floor(rem / 1000);
  rem %= 1000;

  const hundred = rem;

  if (crore > 0) {
    words += convertBelowThousand(crore) + " Crore ";
  }
  if (lakh > 0) {
    words += convertBelowThousand(lakh) + " Lakh ";
  }
  if (thousand > 0) {
    words += convertBelowThousand(thousand) + " Thousand ";
  }
  if (hundred > 0) {
    words += convertBelowThousand(hundred) + " ";
  }

  words = words.trim();
  if (!words) {
    words = "Zero";
  }

  let finalWords = `INR ${words}`;

  if (paise > 0) {
    const paiseWords = convertBelowThousand(paise);
    finalWords += ` and ${paiseWords} Paise only.`;
  } else {
    finalWords += " only.";
  }

  return finalWords;
}

/**
 * Format a number as Indian Currency string.
 * Example: 23500 -> "23,500.00"
 */
export function formatINR(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(Number(val))) return "0.00";
  return Number(val).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format date in DD/MM/YYYY matching the reference sample PDF:
 * `Dated 02/09/2026`
 */
export function formatDateDDMMYYYY(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

export interface InvoiceValidationResult {
  valid: boolean;
  error?: string;
}

function hasValidPrecision(val: unknown, maxDecimals = 2): boolean {
  if (val === undefined || val === null || val === "") return true;
  const num = Number(val);
  if (!Number.isFinite(num)) return false;
  const s = String(val);
  const parts = s.split(".");
  return parts.length <= 1 || parts[1].length <= maxDecimals;
}

/**
 * Validates invoice line items and calculation inputs to prevent
 * negative quantities, negative rates, invalid discounts, out-of-range tax rates,
 * non-finite values, and invalid decimal precision.
 */
export function validateInvoiceInput(data: unknown): InvoiceValidationResult {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Invalid invoice payload." };
  }

  const payload = data as Record<string, unknown>;
  const customer = payload.customer as Record<string, unknown> | undefined;

  // Customer validation
  if (!customer || typeof customer !== "object") {
    return { valid: false, error: "Customer details are required." };
  }
  if (!customer.customerName || typeof customer.customerName !== "string" || !customer.customerName.trim()) {
    return { valid: false, error: "Customer / Party Name is required." };
  }

  // Items validation
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return { valid: false, error: "Invoice must contain at least one line item." };
  }

  for (let i = 0; i < payload.items.length; i++) {
    const item = payload.items[i] as Record<string, unknown> | undefined;
    const itemNum = i + 1;

    if (!item || typeof item !== "object") {
      return { valid: false, error: `Line item #${itemNum} is invalid.` };
    }

    if (!item.description || typeof item.description !== "string" || !item.description.trim()) {
      return { valid: false, error: `Description is required for line item #${itemNum}.` };
    }

    // Quantity validation
    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return { valid: false, error: `Quantity for line item #${itemNum} must be a positive number greater than zero.` };
    }
    if (!hasValidPrecision(item.quantity, 2)) {
      return { valid: false, error: `Quantity for line item #${itemNum} cannot exceed 2 decimal places.` };
    }

    // Rate validation
    const rate = Number(item.rate);
    if (!Number.isFinite(rate) || rate < 0) {
      return { valid: false, error: `Rate for line item #${itemNum} must be a non-negative number.` };
    }
    if (!hasValidPrecision(item.rate, 2)) {
      return { valid: false, error: `Rate for line item #${itemNum} cannot exceed 2 decimal places.` };
    }

    // Discount validation
    if (item.discount !== undefined && item.discount !== null && item.discount !== "") {
      const disc = Number(item.discount);
      if (!Number.isFinite(disc) || disc < 0) {
        return { valid: false, error: `Discount for line item #${itemNum} cannot be negative.` };
      }
      if (!hasValidPrecision(item.discount, 2)) {
        return { valid: false, error: `Discount for line item #${itemNum} cannot exceed 2 decimal places.` };
      }
      const gross = round2(qty * rate);
      if (round2(disc) > gross) {
        return { valid: false, error: `Discount for line item #${itemNum} cannot exceed the gross line amount (₹${gross.toFixed(2)}).` };
      }
    }

    // Tax rate validation
    if (item.taxRate !== undefined && item.taxRate !== null && item.taxRate !== "") {
      const taxRate = Number(item.taxRate);
      if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
        return { valid: false, error: `Tax rate for line item #${itemNum} must be between 0% and 100%.` };
      }
    }
  }

  // Additional charges validation
  if (payload.additionalCharges !== undefined && payload.additionalCharges !== null && payload.additionalCharges !== "") {
    const addCharges = Number(payload.additionalCharges);
    if (!Number.isFinite(addCharges) || addCharges < 0) {
      return { valid: false, error: "Additional charges cannot be negative." };
    }
    if (!hasValidPrecision(payload.additionalCharges, 2)) {
      return { valid: false, error: "Additional charges cannot exceed 2 decimal places." };
    }
  }

  // Tax type validation
  if (payload.taxType && typeof payload.taxType === "string" && !["INTRA_STATE", "INTER_STATE", "NONE"].includes(payload.taxType)) {
    return { valid: false, error: "Invalid GST tax type specified. Must be INTRA_STATE, INTER_STATE, or NONE." };
  }

  return { valid: true };
}
