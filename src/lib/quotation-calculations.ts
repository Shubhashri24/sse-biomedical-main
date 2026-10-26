import type { QuotationCommercialItem, DiscountType, CommercialQuotation } from "./mongodb";

export interface LineItemCalculationInput {
  quantity: number;
  unitPrice: number;
  discountType?: DiscountType;
  discountValue?: number;
  gstRate?: number;
}

export interface LineItemCalculationResult {
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
}

/**
 * Accurately calculate financial figures for a single quotation line item.
 * Adheres to standard Indian commercial taxation rules:
 * Gross = Quantity * UnitPrice
 * Discount = Percentage of Gross OR Fixed Amount
 * Taxable = Gross - Discount
 * GST = Taxable * (GSTRate / 100)
 * Total = Taxable + GST
 */
export function calculateLineItem(input: LineItemCalculationInput): LineItemCalculationResult {
  const quantity = Math.max(0, Number(input.quantity) || 0);
  const unitPrice = Math.max(0, Number(input.unitPrice) || 0);
  const discountType: DiscountType = input.discountType === "FIXED" ? "FIXED" : "PERCENT";
  const rawDiscount = Math.max(0, Number(input.discountValue) || 0);
  const gstRate = Math.max(0, Math.min(100, Number(input.gstRate) || 0));

  const grossAmount = Math.round(quantity * unitPrice * 100) / 100;

  let discountAmount = 0;
  if (discountType === "PERCENT") {
    const cappedPercent = Math.min(100, rawDiscount);
    discountAmount = Math.round(grossAmount * (cappedPercent / 100) * 100) / 100;
  } else {
    // Fixed amount discount cannot exceed gross
    discountAmount = Math.min(grossAmount, Math.round(rawDiscount * 100) / 100);
  }

  const taxableAmount = Math.round((grossAmount - discountAmount) * 100) / 100;
  const gstAmount = Math.round(taxableAmount * (gstRate / 100) * 100) / 100;
  const totalAmount = Math.round((taxableAmount + gstAmount) * 100) / 100;

  return {
    grossAmount,
    discountAmount,
    taxableAmount,
    gstAmount,
    totalAmount,
  };
}

export interface QuotationTotalsResult {
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalTax: number;
  grandTotal: number;
}

/**
 * Calculates aggregate totals for an array of quotation line items with consistent rounding.
 */
export function calculateQuotationTotals(
  items: Array<Pick<QuotationCommercialItem, "quantity" | "unitPrice" | "discountAmount" | "taxableAmount" | "gstAmount" | "totalAmount">>
): QuotationTotalsResult {
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableAmount = 0;
  let totalTax = 0;
  let grandTotal = 0;

  for (const item of items) {
    const gross = Math.round((item.quantity * item.unitPrice) * 100) / 100;
    subtotal += gross;
    totalDiscount += Math.round(item.discountAmount * 100) / 100;
    taxableAmount += Math.round(item.taxableAmount * 100) / 100;
    totalTax += Math.round(item.gstAmount * 100) / 100;
    grandTotal += Math.round(item.totalAmount * 100) / 100;
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Server-side validation for commercial quotation payload.
 */
export function validateCommercialQuotation(quote: Partial<CommercialQuotation>): ValidationResult {
  const errors: string[] = [];

  if (!quote.billingDetails) {
    errors.push("Customer billing details are required.");
  } else {
    if (!quote.billingDetails.customerName || !quote.billingDetails.customerName.trim()) {
      errors.push("Customer/contact name is required in billing details.");
    }
    if (!quote.billingDetails.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quote.billingDetails.email.trim())) {
      errors.push("A valid customer email is required in billing details.");
    }
  }

  if (!Array.isArray(quote.items) || quote.items.length === 0) {
    errors.push("Quotation must contain at least one line item.");
  } else {
    quote.items.forEach((item, idx) => {
      const pos = idx + 1;
      if (!item.productName || !item.productName.trim()) {
        errors.push(`Item #${pos}: Product name is required.`);
      }
      if (typeof item.quantity !== "number" || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        errors.push(`Item #${pos}: Quantity must be a positive whole number greater than 0.`);
      }
      if (typeof item.unitPrice !== "number" || item.unitPrice < 0 || isNaN(item.unitPrice)) {
        errors.push(`Item #${pos}: Unit price cannot be negative.`);
      }
      if (typeof item.discountValue === "number" && item.discountValue < 0) {
        errors.push(`Item #${pos}: Discount cannot be negative.`);
      }
      if (item.discountType === "PERCENT" && typeof item.discountValue === "number" && item.discountValue > 100) {
        errors.push(`Item #${pos}: Percentage discount cannot exceed 100%.`);
      }
      if (item.discountType === "FIXED" && typeof item.discountValue === "number") {
        const gross = (item.quantity || 0) * (item.unitPrice || 0);
        if (item.discountValue > gross) {
          errors.push(`Item #${pos}: Fixed discount (₹${item.discountValue}) exceeds line gross amount (₹${gross}).`);
        }
      }
      if (typeof item.gstRate === "number" && (item.gstRate < 0 || item.gstRate > 100)) {
        errors.push(`Item #${pos}: GST tax rate must be between 0% and 100%.`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format a number as Indian Currency (INR) with two decimal places.
 * Example: 158400 -> "1,58,400.00"
 */
export function formatINR(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return "0.00";
  return Number(val).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format date to "DD-MMM-YYYY" (e.g. 22-Oct-2025) matching reference PDF.
 */
export function formatDateIN(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
}
