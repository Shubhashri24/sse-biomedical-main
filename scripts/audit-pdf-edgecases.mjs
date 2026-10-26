import { generateInvoicePDF } from "../src/lib/invoice-pdf-generator.ts";

async function testPdfEdgeCases() {
  console.log("=== TESTING PDF OUTPUT EDGE CASES ===");

  // Edge case 1: Minimal fields (missing all optional fields)
  const minimalInvoice = {
    invoiceId: "INV-MIN-001",
    invoiceNumber: "00103/0001",
    status: "UNPAID",
    invoiceDate: new Date(),
    customer: {
      customerName: "City Clinic",
    },
    company: {
      companyName: "Shree Shyam Electronics",
      address: "M.I.D.C. Jalgaon",
      state: "Maharashtra",
      stateCode: "27",
      phone: "8275290643",
      email: "lokeshpurya@gmail.com",
    },
    items: [
      {
        description: "Patient Monitor",
        quantity: 1,
        unit: "Qty",
        rate: 10000,
        taxableAmount: 10000,
        taxAmount: 0,
        amount: 10000,
      },
    ],
    totalQuantity: 1,
    subtotal: 10000,
    totalDiscount: 0,
    taxableAmount: 10000,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    taxType: "NONE",
    additionalCharges: 0,
    roundOff: 0,
    grandTotal: 10000,
    amountInWords: "INR Ten Thousand only.",
    paymentRecords: [],
    amountPaid: 0,
    balanceDue: 10000,
    isFinalized: true,
  };

  const buf1 = await generateInvoicePDF(minimalInvoice);
  console.log("1. Minimal fields PDF generated:", buf1.length, "bytes | Header:", buf1.subarray(0, 5).toString());

  // Edge case 2: Long product names and descriptions
  const longDescInvoice = {
    ...minimalInvoice,
    items: [
      {
        description: "Advanced High-Acuity Modular Multiparameter Patient Monitoring Workstation with 15.6-inch Full HD Anti-Glare Touchscreen, 12-Lead ECG Analysis, Dual Invasive Blood Pressure, Masimo rainbow SET SpO2, Microstream Capnography, Cardiac Output, BIS Index, and Arrhythmia Detection Suite",
        detailedDescription: "Manufactured under ISO 13485:2016 Certified Medical Device Quality Systems. Supplied with 5-lead ECG cable, adult/pediatric NIBP cuffs, adult reusable SpO2 sensor, temperature probe, power cord, user manual, and factory calibration certificate valid for 12 months from installation date.",
        quantity: 3,
        unit: "Units",
        rate: 85000,
        taxableAmount: 255000,
        taxAmount: 0,
        amount: 255000,
      },
    ],
    totalQuantity: 3,
    subtotal: 255000,
    grandTotal: 255000,
    amountInWords: "INR Two Lakh Fifty Five Thousand only.",
  };

  const buf2 = await generateInvoicePDF(longDescInvoice);
  console.log("2. Long text descriptions PDF generated:", buf2.length, "bytes | Header:", buf2.subarray(0, 5).toString());

  // Edge case 3: Multi-page invoice (18 items)
  const multiPageInvoice = {
    ...minimalInvoice,
    items: Array.from({ length: 18 }).map((_, i) => ({
      description: `Hospital Grade Medical Equipment System Line Item ${i + 1}`,
      detailedDescription: `Model Code: MED-SYS-${100 + i} | Certified CE Class IIb`,
      quantity: 1,
      unit: "Qty",
      rate: 12500,
      taxableAmount: 12500,
      taxAmount: 0,
      amount: 12500,
    })),
    totalQuantity: 18,
    subtotal: 225000,
    grandTotal: 225000,
    amountInWords: "INR Two Lakh Twenty Five Thousand only.",
  };

  const buf3 = await generateInvoicePDF(multiPageInvoice);
  console.log("3. Multi-page (18 items) PDF generated:", buf3.length, "bytes | Header:", buf3.subarray(0, 5).toString());

  console.log("=== ALL PDF EDGE CASES GENERATED SUCCESSFULLY ===");
}

testPdfEdgeCases().catch(console.error);
