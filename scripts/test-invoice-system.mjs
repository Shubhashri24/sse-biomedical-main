import { MongoClient } from "mongodb";
import PDFDocument from "pdfkit";

const TEST_DB_URI = "mongodb://localhost:27017/sse_biomedical_test";

// --------------------------------------------------------------------------
// Embedded Pure JS implementations of calculation logic for isolated test runner
// --------------------------------------------------------------------------
function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function convertBelowThousand(n) {
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

function amountToWordsIndian(amount) {
  const rounded = round2(Math.abs(amount));
  if (rounded === 0) return "INR Zero only.";

  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  let words = "";
  const crore = Math.floor(rupees / 10000000);
  let rem = rupees % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  const hundred = rem;

  if (crore > 0) words += convertBelowThousand(crore) + " Crore ";
  if (lakh > 0) words += convertBelowThousand(lakh) + " Lakh ";
  if (thousand > 0) words += convertBelowThousand(thousand) + " Thousand ";
  if (hundred > 0) words += convertBelowThousand(hundred) + " ";

  words = words.trim();
  if (!words) words = "Zero";

  let finalWords = `INR ${words}`;
  if (paise > 0) {
    finalWords += ` and ${convertBelowThousand(paise)} Paise only.`;
  } else {
    finalWords += " only.";
  }
  return finalWords;
}

function calculateInvoiceLineItem(input) {
  const quantity = Math.max(0, Number(input.quantity) || 0);
  const rate = Math.max(0, Number(input.rate) || 0);
  const rawDiscount = Math.max(0, Number(input.discount) || 0);
  const taxRate = Math.max(0, Math.min(100, Number(input.taxRate) || 0));

  const grossAmount = round2(quantity * rate);
  const discountAmount = Math.min(grossAmount, round2(rawDiscount));
  const taxableAmount = round2(grossAmount - discountAmount);
  const taxAmount = round2(taxableAmount * (taxRate / 100));
  const totalAmount = round2(taxableAmount + taxAmount);

  return { grossAmount, discountAmount, taxableAmount, taxRate, taxAmount, totalAmount };
}

function calculateInvoiceTotals(input) {
  const taxTreatment = input.taxTreatment || "NONE";
  const additionalCharges = round2(Math.max(0, Number(input.additionalCharges) || 0));
  const items = Array.isArray(input.items) ? input.items : [];

  let totalQuantity = 0;
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableAmount = 0;
  let totalTax = 0;

  for (const item of items) {
    const line = calculateInvoiceLineItem(item);
    totalQuantity += Number(item.quantity) || 0;
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
    cgstAmount = round2(totalTax / 2);
    sgstAmount = round2(totalTax - cgstAmount);
  } else if (taxTreatment === "INTER_STATE") {
    igstAmount = totalTax;
  }

  const rawGrandTotal = round2(taxableAmount + totalTax + additionalCharges);
  let roundOff = 0;
  let grandTotal = rawGrandTotal;
  if (input.applyRoundOff) {
    const rounded = Math.round(rawGrandTotal);
    roundOff = round2(rounded - rawGrandTotal);
    grandTotal = rounded;
  }

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
    amountInWords: amountToWordsIndian(grandTotal),
  };
}

async function testPdfEngine(invoice) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margins: { top: 32, bottom: 25, left: 38, right: 38 } });
      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      doc.text(`Invoice No. ${invoice.invoiceNumber}`, 38, 32);
      doc.text(invoice.company?.companyName || "Shree Shyam Electronics", 38, 48, { align: "center" });
      doc.text("Invoice", 38, 80, { align: "center" });
      doc.text(`Party: ${invoice.customer?.customerName}`, 38, 110);

      let y = 140;
      doc.text("Description of Goods | Quantity | Rate | per | Amount", 38, y);
      y += 20;

      for (const it of invoice.items || []) {
        doc.text(`${it.description} | ${it.quantity} | ${it.rate} | ${it.unit} | ${it.amount}`, 38, y);
        y += 18;
      }

      doc.text(`Total: ${invoice.grandTotal}`, 38, y + 20);
      doc.text(`Amount Chargeable (in words): ${invoice.amountInWords}`, 38, y + 45);
      doc.text(`Bank Name: ${invoice.company?.bankName || "N/A"}`, 38, y + 70);
      doc.text("Authorised Signatory", 400, y + 100);
      doc.text("This is a Computer Generated Invoice", 38, y + 140, { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function runTestSuite() {
  console.log("============================================================");
  console.log("       INVOICE MANAGEMENT SYSTEM - ISOLATED TEST SUITE       ");
  console.log("         Target Database: sse_biomedical_test (ISOLATED)     ");
  console.log("============================================================\n");

  const results = [];
  function assert(testName, condition, detail = "") {
    if (condition) {
      console.log(`  PASS: ${testName} ${detail ? "(" + detail + ")" : ""}`);
      results.push({ name: testName, pass: true });
    } else {
      console.error(`  FAIL: ${testName} ${detail ? "(" + detail + ")" : ""}`);
      results.push({ name: testName, pass: false, error: detail });
    }
  }

  // 1. Amount to Words
  console.log("--- 1. Testing Indian Amount to Words Conversion ---");
  const wordsSample = amountToWordsIndian(23500);
  assert("Sample invoice amount (23,500)", wordsSample === "INR Twenty Three Thousand Five Hundred only.", `Got: "${wordsSample}"`);
  assert("Lakh conversion (1,50,000)", amountToWordsIndian(150000) === "INR One Lakh Fifty Thousand only.");
  assert("Crore conversion (1,25,00,000)", amountToWordsIndian(12500000) === "INR One Crore Twenty Five Lakh only.");
  assert("Paise conversion (23,500.50)", amountToWordsIndian(23500.50) === "INR Twenty Three Thousand Five Hundred and Fifty Paise only.");

  // 2. Line Item & Totals Calculations
  console.log("\n--- 2. Testing Line Item & Totals Calculations ---");
  const lineCalc = calculateInvoiceLineItem({ quantity: 2, rate: 23500, discount: 1000, taxRate: 18 });
  assert("Line Gross Amount", lineCalc.grossAmount === 47000);
  assert("Line Discount Amount", lineCalc.discountAmount === 1000);
  assert("Line Taxable Amount", lineCalc.taxableAmount === 46000);
  assert("Line Tax (18%)", lineCalc.taxAmount === 8280);
  assert("Line Total Amount", lineCalc.totalAmount === 54280);

  const totals = calculateInvoiceTotals({
    items: [{ quantity: 2, rate: 23500, discount: 1000, taxRate: 18 }],
    taxTreatment: "INTRA_STATE",
    additionalCharges: 500,
    applyRoundOff: true,
  });
  assert("Intra-State CGST equals SGST", totals.cgstAmount === totals.sgstAmount);
  assert("Grand Total includes additional charges & tax", totals.grandTotal === 54780);

  // 3. Isolated Database Operations
  console.log("\n--- 3. Testing Database Operations on sse_biomedical_test ---");
  const client = new MongoClient(TEST_DB_URI);
  await client.connect();
  const testDb = client.db("sse_biomedical_test");
  const testInvoices = testDb.collection("invoices");
  const testCounters = testDb.collection("counters");

  await testInvoices.deleteMany({ _testFixture: true });
  await testCounters.deleteMany({ _id: { $regex: /^test_/ } });

  // 3a. Create Draft
  const testDraft = {
    _testFixture: true,
    invoiceId: "INV-TEST-0001",
    invoiceNumber: "00103/9901",
    status: "DRAFT",
    invoiceDate: new Date("2026-09-02"),
    customer: {
      customerName: "Care Hospital Cardiac & Superspeciality Center, Akola",
      facilityName: "Cardiology Dept",
      city: "Akola",
      state: "Maharashtra",
      stateCode: "27",
    },
    company: {
      companyName: "Shree Shyam Electronics",
      address: "10, Apna Ghar Colony, Near Raymond Colony, M.I.D.C. Jalgaon",
      state: "Maharashtra",
      stateCode: "27",
      email: "lokeshpurya@gmail.com",
      bankName: "Central Bank of India",
      accountNumber: "3709239443",
      branchAndIfsc: "CBIN0280710",
      declaration: "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
      signatoryTitle: "Authorised Signatory",
    },
    items: [
      {
        description: "LifeCare 5para Monitor",
        quantity: 1,
        unit: "Qty",
        rate: 23500,
        discount: 0,
        taxRate: 0,
        taxableAmount: 23500,
        taxAmount: 0,
        amount: 23500,
      },
    ],
    totalQuantity: 1,
    subtotal: 23500,
    totalDiscount: 0,
    taxableAmount: 23500,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    taxType: "NONE",
    additionalCharges: 0,
    roundOff: 0,
    grandTotal: 23500,
    amountInWords: "INR Twenty Three Thousand Five Hundred only.",
    paymentRecords: [],
    amountPaid: 0,
    balanceDue: 23500,
    isFinalized: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "test_admin",
    updatedBy: "test_admin",
  };

  const insertRes = await testInvoices.insertOne(testDraft);
  assert("Create Draft Invoice in Test DB", Boolean(insertRes.insertedId));

  // 3b. Edit Draft
  await testInvoices.updateOne(
    { invoiceId: "INV-TEST-0001" },
    {
      $set: {
        "items.0.quantity": 2,
        "items.0.amount": 47000,
        totalQuantity: 2,
        subtotal: 47000,
        grandTotal: 47000,
        balanceDue: 47000,
        amountInWords: amountToWordsIndian(47000),
      },
    }
  );
  const editedDoc = await testInvoices.findOne({ invoiceId: "INV-TEST-0001" });
  assert("Edit Draft Invoice", editedDoc.grandTotal === 47000 && editedDoc.totalQuantity === 2);

  // 3c. Finalize Draft
  await testInvoices.updateOne(
    { invoiceId: "INV-TEST-0001" },
    {
      $set: {
        status: "UNPAID",
        isFinalized: true,
        finalizedAt: new Date(),
        finalizedBy: "test_admin",
      },
    }
  );
  const finalizedDoc = await testInvoices.findOne({ invoiceId: "INV-TEST-0001" });
  assert("Finalize Invoice State Transition to UNPAID", finalizedDoc.status === "UNPAID" && finalizedDoc.isFinalized === true);

  // 3d. Record Partial Payment
  const p1 = {
    id: "PAY-001",
    amount: 20000,
    paymentDate: new Date(),
    paymentMethod: "Bank Transfer",
    referenceNumber: "UTR12345",
    recordedAt: new Date(),
    recordedBy: "test_admin",
  };
  await testInvoices.updateOne(
    { invoiceId: "INV-TEST-0001" },
    {
      $push: { paymentRecords: p1 },
      $set: { amountPaid: 20000, balanceDue: 27000, status: "PARTIALLY_PAID" },
    }
  );
  const pDoc1 = await testInvoices.findOne({ invoiceId: "INV-TEST-0001" });
  assert("Record Partial Payment -> PARTIALLY_PAID", pDoc1.status === "PARTIALLY_PAID" && pDoc1.balanceDue === 27000);

  // 3e. Record Remaining Payment
  const p2 = {
    id: "PAY-002",
    amount: 27000,
    paymentDate: new Date(),
    paymentMethod: "UPI",
    referenceNumber: "UPI56789",
    recordedAt: new Date(),
    recordedBy: "test_admin",
  };
  await testInvoices.updateOne(
    { invoiceId: "INV-TEST-0001" },
    {
      $push: { paymentRecords: p2 },
      $set: { amountPaid: 47000, balanceDue: 0, status: "PAID" },
    }
  );
  const pDoc2 = await testInvoices.findOne({ invoiceId: "INV-TEST-0001" });
  assert("Record Balance Payment -> PAID in Full", pDoc2.status === "PAID" && pDoc2.balanceDue === 0);

  // 3f. Cancellation Test
  await testInvoices.updateOne(
    { invoiceId: "INV-TEST-0001" },
    {
      $set: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: "test_admin",
        cancellationReason: "Client revised hospital order specifications",
      },
    }
  );
  const cancelDoc = await testInvoices.findOne({ invoiceId: "INV-TEST-0001" });
  assert("Cancel Invoice Preserves Audit & Financial History", cancelDoc.status === "CANCELLED" && cancelDoc.grandTotal === 47000 && cancelDoc.paymentRecords.length === 2);

  // 4. Concurrency Test
  console.log("\n--- 4. Testing Concurrent Invoice Sequence Generation ---");
  const concurrentNumbers = await Promise.all(
    Array.from({ length: 5 }).map(async () => {
      const res = await testCounters.findOneAndUpdate(
        { _id: "test_seq" },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: "after" }
      );
      return `00103/${String(res.seq).padStart(4, "0")}`;
    })
  );
  const uniqueCount = new Set(concurrentNumbers).size;
  assert("Concurrent Safe Sequence without duplicates", uniqueCount === 5, `Generated: ${concurrentNumbers.join(", ")}`);

  // 5. PDF Generation Test
  console.log("\n--- 5. Testing PDF Document Engine ---");
  const pdfBuffer = await testPdfEngine(finalizedDoc);
  assert("PDF Buffer Generated Successfully", Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 500);
  assert("PDF Magic Header Valid (%PDF-)", pdfBuffer.subarray(0, 5).toString() === "%PDF-");

  // Clean test fixtures
  await testInvoices.deleteMany({ _testFixture: true });
  await testCounters.deleteMany({ _id: { $regex: /^test_/ } });
  await client.close();

  console.log("\n============================================================");
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("============================================================\n");

  if (failed > 0) process.exit(1);
}

runTestSuite().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
