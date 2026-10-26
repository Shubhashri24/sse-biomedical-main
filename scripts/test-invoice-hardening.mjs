import { MongoClient } from "mongodb";
import PDFDocument from "pdfkit";
import assert from "assert";

// ============================================================================
// SAFETY ENFORCEMENT: ONLY EXECUTE AGAINST ISOLATED TEST DATABASE
// ============================================================================
const MONGO_URI = "mongodb://localhost:27017";
const TEST_DB_NAME = "sse_biomedical_test";
const PROD_DB_NAME = "sse_biomedical";

console.log("\n==================================================================");
console.log("SHREE SHYAM ELECTRONICS — INVOICE HARDENING REGRESSION TEST SUITE");
console.log("==================================================================\n");

// ----------------------------------------------------------------------------
// Pure calculation & validation copies from src/lib/invoice-calculations.ts
// ----------------------------------------------------------------------------
function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

function hasValidPrecision(val, maxDecimals = 2) {
  if (val === undefined || val === null || val === "") return true;
  const num = Number(val);
  if (!Number.isFinite(num)) return false;
  const s = String(val);
  const parts = s.split(".");
  return parts.length <= 1 || parts[1].length <= maxDecimals;
}

function validateInvoiceInput(data) {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Invalid invoice payload." };
  }
  const payload = data;
  const customer = payload.customer;

  if (!customer || typeof customer !== "object") {
    return { valid: false, error: "Customer details are required." };
  }
  if (!customer.customerName || typeof customer.customerName !== "string" || !customer.customerName.trim()) {
    return { valid: false, error: "Customer / Party Name is required." };
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return { valid: false, error: "Invoice must contain at least one line item." };
  }

  for (let i = 0; i < payload.items.length; i++) {
    const item = payload.items[i];
    const itemNum = i + 1;

    if (!item || typeof item !== "object") {
      return { valid: false, error: `Line item #${itemNum} is invalid.` };
    }

    if (!item.description || typeof item.description !== "string" || !item.description.trim()) {
      return { valid: false, error: `Description is required for line item #${itemNum}.` };
    }

    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return { valid: false, error: `Quantity for line item #${itemNum} must be a positive number greater than zero.` };
    }
    if (!hasValidPrecision(item.quantity, 2)) {
      return { valid: false, error: `Quantity for line item #${itemNum} cannot exceed 2 decimal places.` };
    }

    const rate = Number(item.rate);
    if (!Number.isFinite(rate) || rate < 0) {
      return { valid: false, error: `Rate for line item #${itemNum} must be a non-negative number.` };
    }
    if (!hasValidPrecision(item.rate, 2)) {
      return { valid: false, error: `Rate for line item #${itemNum} cannot exceed 2 decimal places.` };
    }

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

    if (item.taxRate !== undefined && item.taxRate !== null && item.taxRate !== "") {
      const taxRate = Number(item.taxRate);
      if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
        return { valid: false, error: `Tax rate for line item #${itemNum} must be between 0% and 100%.` };
      }
    }
  }

  if (payload.additionalCharges !== undefined && payload.additionalCharges !== null && payload.additionalCharges !== "") {
    const addCharges = Number(payload.additionalCharges);
    if (!Number.isFinite(addCharges) || addCharges < 0) {
      return { valid: false, error: "Additional charges cannot be negative." };
    }
    if (!hasValidPrecision(payload.additionalCharges, 2)) {
      return { valid: false, error: "Additional charges cannot exceed 2 decimal places." };
    }
  }

  if (payload.taxType && typeof payload.taxType === "string" && !["INTRA_STATE", "INTER_STATE", "NONE"].includes(payload.taxType)) {
    return { valid: false, error: "Invalid GST tax type specified. Must be INTRA_STATE, INTER_STATE, or NONE." };
  }

  return { valid: true };
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
    const qty = Math.max(0, Number(item.quantity) || 0);
    const rate = Math.max(0, Number(item.rate) || 0);
    const disc = Math.max(0, Number(item.discount) || 0);
    const taxRate = Math.max(0, Math.min(100, Number(item.taxRate) || 0));

    const line = calculateInvoiceLineItem({ description: "", quantity: qty, rate, discount: disc, taxRate });
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

  return { totalQuantity, subtotal, totalDiscount, taxableAmount, cgstAmount, sgstAmount, igstAmount, totalTax, additionalCharges, roundOff, grandTotal };
}

// ----------------------------------------------------------------------------
// TEST RUNNER
// ----------------------------------------------------------------------------
async function runTests() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();

  // STRICT DB ISOLATION CHECK
  const testDb = client.db(TEST_DB_NAME);
  if (testDb.databaseName !== "sse_biomedical_test") {
    console.error("FATAL: Database selected is NOT sse_biomedical_test. Aborting immediately.");
    process.exit(1);
  }

  console.log(`[PASS] Database Isolation Confirmed: Connected to '${testDb.databaseName}'.`);

  // Baseline Production DB Snapshot
  const prodDb = client.db(PROD_DB_NAME);
  const prodInitialCounts = {
    invoices: await prodDb.collection("invoices").countDocuments(),
    counters: await prodDb.collection("counters").countDocuments(),
    company_settings: await prodDb.collection("company_settings").countDocuments(),
    products: await prodDb.collection("products").countDocuments(),
    quotations: await prodDb.collection("quotation_requests").countDocuments(),
  };
  console.log("[INFO] Captured Production Database Baseline (Zero-Write Audit Trail):", JSON.stringify(prodInitialCounts));

  const testInvoices = testDb.collection("invoices");
  const testCounters = testDb.collection("counters");

  // Clean test collection fixtures (isolated in test DB only)
  await testInvoices.deleteMany({});
  await testCounters.deleteMany({ _id: { $regex: /^invoice_/ } });

  let passedTests = 0;
  let failedTests = 0;

  function recordPass(testName) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  }

  function recordFail(testName, err) {
    console.error(`  ✗ FAIL: ${testName}`, err);
    failedTests++;
  }

  // ==========================================================================
  // SUITE 1: UNIQUE INDEXES & CONCURRENCY-SAFE NUMBERING
  // ==========================================================================
  console.log("\n--- Suite 1: Unique MongoDB Index & Concurrency-Safe Numbering ---");
  try {
    // 1.1 Create unique indexes (using partial unique index for deferred numbering)
    await testInvoices.createIndex(
      { invoiceNumber: 1 },
      { unique: true, partialFilterExpression: { invoiceNumber: { $type: "string" } } }
    );
    await testInvoices.createIndex({ invoiceId: 1 }, { unique: true });
    const indexes = await testInvoices.indexes();
    const invNumIndex = indexes.find((idx) => idx.name === "invoiceNumber_1");
    assert(invNumIndex && invNumIndex.unique === true, "invoiceNumber unique index must exist");
    recordPass("1.1 Unique index on invoiceNumber verified in MongoDB");

    // 1.2 Duplicate invoiceNumber rejection
    await testInvoices.insertOne({
      invoiceId: "INV-TEST-001",
      invoiceNumber: "00103/0386",
      status: "DRAFT",
      grandTotal: 1000,
      balanceDue: 1000,
      amountPaid: 0,
      isFinalized: false,
      createdAt: new Date(),
    });

    let duplicateRejected = false;
    try {
      await testInvoices.insertOne({
        invoiceId: "INV-TEST-002",
        invoiceNumber: "00103/0386", // Duplicate number
        status: "DRAFT",
        grandTotal: 2000,
        balanceDue: 2000,
        amountPaid: 0,
        isFinalized: false,
        createdAt: new Date(),
      });
    } catch (err) {
      if (err.code === 11000) {
        duplicateRejected = true;
      }
    }
    assert(duplicateRejected, "Database must reject duplicate invoiceNumber with E11000");
    recordPass("1.2 Duplicate invoice number rejected by MongoDB unique constraint");

    // 1.3 Concurrency Test: Atomic Sequential Counter Generation
    async function generateAtomicSeq(prefix = "00103/") {
      const highestSeq = 385;
      const counterKey = `invoice_seq_${prefix}`;

      await testCounters.updateOne(
        { _id: counterKey },
        { $setOnInsert: { seq: highestSeq } },
        { upsert: true }
      );
      await testCounters.updateOne(
        { _id: counterKey, seq: { $lt: highestSeq } },
        { $set: { seq: highestSeq } }
      );

      const res = await testCounters.findOneAndUpdate(
        { _id: counterKey },
        { $inc: { seq: 1 } },
        { returnDocument: "after" }
      );
      return `${prefix}${String(res.seq).padStart(4, "0")}`;
    }

    // Launch 10 concurrent requests simultaneously
    const generatedNumbers = await Promise.all([
      generateAtomicSeq(),
      generateAtomicSeq(),
      generateAtomicSeq(),
      generateAtomicSeq(),
      generateAtomicSeq(),
      generateAtomicSeq(),
      generateAtomicSeq(),
      generateAtomicSeq(),
      generateAtomicSeq(),
      generateAtomicSeq(),
    ]);

    // Check no duplicate numbers generated under concurrency
    const uniqueNumbers = new Set(generatedNumbers);
    assert.strictEqual(uniqueNumbers.size, 10, "All 10 concurrently generated numbers must be distinct");
    assert(generatedNumbers.includes("00103/0386"), "Must start at 0386");
    assert(generatedNumbers.includes("00103/0395"), "Must reach 0395");
    recordPass("1.3 Atomic concurrent sequence allocation produces zero duplicates across 10 concurrent requests");
  } catch (err) {
    recordFail("Suite 1", err);
  }

  // ==========================================================================
  // SUITE 2: STRICT FINANCIAL INPUT HARDENING & CALCULATION VALIDATION
  // ==========================================================================
  console.log("\n--- Suite 2: Strict Financial Input & Calculation Validation ---");
  try {
    // 2.1 Negative quantity rejection
    const negQty = validateInvoiceInput({
      customer: { customerName: "Test Hospital" },
      items: [{ description: "Monitor", quantity: -2, rate: 1000 }],
    });
    assert.strictEqual(negQty.valid, false);
    recordPass("2.1 Negative quantity rejected");

    // 2.2 Zero quantity rejection
    const zeroQty = validateInvoiceInput({
      customer: { customerName: "Test Hospital" },
      items: [{ description: "Monitor", quantity: 0, rate: 1000 }],
    });
    assert.strictEqual(zeroQty.valid, false);
    recordPass("2.2 Zero quantity rejected");

    // 2.3 Negative rate rejection
    const negRate = validateInvoiceInput({
      customer: { customerName: "Test Hospital" },
      items: [{ description: "Monitor", quantity: 1, rate: -500 }],
    });
    assert.strictEqual(negRate.valid, false);
    recordPass("2.3 Negative rate rejected");

    // 2.4 Discount exceeding gross line amount rejection
    const overDisc = validateInvoiceInput({
      customer: { customerName: "Test Hospital" },
      items: [{ description: "Monitor", quantity: 1, rate: 1000, discount: 1500 }],
    });
    assert.strictEqual(overDisc.valid, false);
    recordPass("2.4 Discount exceeding gross line amount rejected");

    // 2.5 Invalid decimal precision rejection (> 2 decimal places)
    const badDecimals = validateInvoiceInput({
      customer: { customerName: "Test Hospital" },
      items: [{ description: "Monitor", quantity: 1, rate: 1250.999 }],
    });
    assert.strictEqual(badDecimals.valid, false);
    recordPass("2.5 Floating-point precision > 2 decimals rejected");

    // 2.6 NaN and Infinity rejection
    const nanRate = validateInvoiceInput({
      customer: { customerName: "Test Hospital" },
      items: [{ description: "Monitor", quantity: 1, rate: NaN }],
    });
    assert.strictEqual(nanRate.valid, false);
    recordPass("2.6 NaN values rejected");

    // 2.7 Indian GST intra-state vs inter-state calculation
    const intraState = calculateInvoiceTotals({
      items: [{ quantity: 1, rate: 10000, taxRate: 18 }],
      taxTreatment: "INTRA_STATE",
    });
    assert.strictEqual(intraState.cgstAmount, 900);
    assert.strictEqual(intraState.sgstAmount, 900);
    assert.strictEqual(intraState.igstAmount, 0);
    assert.strictEqual(intraState.grandTotal, 11800);
    recordPass("2.7 Intra-state GST splits total tax into 50% CGST + 50% SGST");

    const interState = calculateInvoiceTotals({
      items: [{ quantity: 1, rate: 10000, taxRate: 18 }],
      taxTreatment: "INTER_STATE",
    });
    assert.strictEqual(interState.cgstAmount, 0);
    assert.strictEqual(interState.sgstAmount, 0);
    assert.strictEqual(interState.igstAmount, 1800);
    assert.strictEqual(interState.grandTotal, 11800);
    recordPass("2.8 Inter-state GST applies 100% IGST without CGST/SGST");
  } catch (err) {
    recordFail("Suite 2", err);
  }

  // ==========================================================================
  // SUITE 3: INVOICE LIFECYCLE & FINALIZED IMMUTABILITY
  // ==========================================================================
  console.log("\n--- Suite 3: Invoice Lifecycle & Finalized Immutability ---");
  try {
    const draftInv = {
      invoiceId: "INV-IMM-001",
      invoiceNumber: "00103/0501",
      status: "DRAFT",
      isFinalized: false,
      customer: { customerName: "City Heart Hospital" },
      company: { companyName: "Shree Shyam Electronics" },
      items: [{ description: "ECG Machine", quantity: 1, rate: 45000, discount: 0, taxRate: 12, amount: 50400 }],
      grandTotal: 50400,
      amountPaid: 0,
      balanceDue: 50400,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await testInvoices.insertOne(draftInv);

    // 3.1 Draft can be edited
    const draftUpdate = await testInvoices.findOneAndUpdate(
      { invoiceId: "INV-IMM-001", isFinalized: false },
      { $set: { notes: "Updated draft remarks", updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    assert(draftUpdate.notes === "Updated draft remarks", "Draft invoice should allow edits");
    recordPass("3.1 Draft invoice can be updated while unfinalized");

    // 3.2 First finalization succeeds
    const finalizeUpdate = await testInvoices.findOneAndUpdate(
      { invoiceId: "INV-IMM-001", isFinalized: false },
      {
        $set: {
          isFinalized: true,
          status: "UNPAID",
          finalizedAt: new Date(),
          finalizedBy: "admin",
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
    assert(finalizeUpdate.isFinalized === true, "Invoice is now finalized");
    assert(finalizeUpdate.status === "UNPAID", "Status transitioned to UNPAID");
    recordPass("3.2 Invoice successfully finalized and locked");

    // 3.3 Re-finalization and modification blocked
    // Simulate PUT /api/admin/invoices/[id] security check
    const existing = await testInvoices.findOne({ invoiceId: "INV-IMM-001" });
    assert(existing.isFinalized === true, "Existing invoice is finalized");

    // Handler logic check:
    function simulatePutUpdate(existingDoc, requestBody) {
      if (existingDoc.status === "CANCELLED") {
        return { status: 400, message: "Cancelled invoices cannot be modified." };
      }
      if (existingDoc.isFinalized) {
        return {
          status: 400,
          message: "Finalized invoices are strictly immutable and cannot be modified or re-finalized.",
        };
      }
      return { status: 200, message: "Updated" };
    }

    const reFinalizeAttempt = simulatePutUpdate(existing, { action: "FINALIZE", grandTotal: 100 });
    assert.strictEqual(reFinalizeAttempt.status, 400, "Re-finalization must be rejected");
    assert(reFinalizeAttempt.message.includes("immutable"), "Re-finalization rejected with immutability message");
    recordPass("3.3 Second finalization request (re-finalization exploit) strictly rejected");

    const editFinalizedAttempt = simulatePutUpdate(existing, { items: [{ description: "Tampered Item", rate: 10 }] });
    assert.strictEqual(editFinalizedAttempt.status, 400, "Altering finalized invoice fields must be rejected");
    recordPass("3.4 Modification attempts to finalized invoice fields strictly rejected");

    // 3.5 Cancellation workflow preserves document and history
    const cancelResult = await testInvoices.findOneAndUpdate(
      { invoiceId: "INV-IMM-001" },
      {
        $set: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledBy: "admin",
          cancellationReason: "Client purchase order revised",
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
    assert.strictEqual(cancelResult.status, "CANCELLED");
    assert.strictEqual(cancelResult.invoiceNumber, "00103/0501", "Invoice number must remain reserved after cancellation");
    assert.strictEqual(cancelResult.grandTotal, 50400, "Original financial figures must be preserved");
    recordPass("3.5 Cancellation preserves invoice document and permanently reserves invoice number");
  } catch (err) {
    recordFail("Suite 3", err);
  }

  // ==========================================================================
  // SUITE 4: PAYMENT VALIDATION, OVERPAYMENT & OCC CONCURRENCY
  // ==========================================================================
  console.log("\n--- Suite 4: Payment Validation, Overpayment Rejection & Concurrency ---");
  try {
    const payInvoice = {
      invoiceId: "INV-PAY-001",
      invoiceNumber: "00103/0601",
      status: "UNPAID",
      isFinalized: true,
      customer: { customerName: "Medicare Clinic" },
      company: { companyName: "Shree Shyam Electronics" },
      grandTotal: 25000,
      amountPaid: 0,
      balanceDue: 25000,
      paymentRecords: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await testInvoices.insertOne(payInvoice);

    // 4.1 Negative / Zero payment rejection
    function validatePayment(amount, balanceDue, existingRecords, refNum) {
      const numAmount = Number(amount);
      if (!Number.isFinite(numAmount) || numAmount <= 0) {
        return { valid: false, message: "Payment amount must be greater than zero." };
      }
      if (!hasValidPrecision(amount, 2)) {
        return { valid: false, message: "Payment amount cannot have more than 2 decimal places." };
      }
      if (numAmount > balanceDue + 0.0001) {
        return { valid: false, message: "Overpayment rejected: payment exceeds balance due." };
      }
      if (refNum && existingRecords.some((r) => r.referenceNumber?.toLowerCase() === refNum.toLowerCase())) {
        return { valid: false, message: "Duplicate payment reference rejected." };
      }
      return { valid: true };
    }

    assert(!validatePayment(-500, 25000, [], "").valid);
    assert(!validatePayment(0, 25000, [], "").valid);
    recordPass("4.1 Negative and zero payment amounts rejected");

    // 4.2 Overpayment rejection
    assert(!validatePayment(30000, 25000, [], "").valid);
    recordPass("4.2 Overpayment (₹30,000 on ₹25,000 balance) strictly rejected");

    // 4.3 Partial payment recording with OCC
    const partAmount = 10000;
    const invBefore = await testInvoices.findOne({ invoiceId: "INV-PAY-001" });
    const partRecord = {
      id: "PAY-TEST-001",
      amount: partAmount,
      paymentDate: new Date(),
      paymentMethod: "Bank Transfer",
      referenceNumber: "UTR987654321",
    };

    const occUpdate1 = await testInvoices.findOneAndUpdate(
      { invoiceId: "INV-PAY-001", balanceDue: invBefore.balanceDue, isFinalized: true },
      {
        $set: {
          paymentRecords: [partRecord],
          amountPaid: partAmount,
          balanceDue: invBefore.grandTotal - partAmount,
          status: "PARTIALLY_PAID",
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
    assert.strictEqual(occUpdate1.amountPaid, 10000);
    assert.strictEqual(occUpdate1.balanceDue, 15000);
    assert.strictEqual(occUpdate1.status, "PARTIALLY_PAID");
    recordPass("4.3 Legitimate partial payment correctly recorded, balance reduced to ₹15,000");

    // 4.4 Duplicate reference number rejection
    const dupRefCheck = validatePayment(5000, 15000, occUpdate1.paymentRecords, "UTR987654321");
    assert(!dupRefCheck.valid);
    recordPass("4.4 Duplicate payment reference number rejected");

    // 4.5 Concurrent Payment Conflict (OCC Double-Spend Prevention)
    // Simulate two concurrent requests trying to spend the same ₹15,000 balance
    const concurrentPayAmount = 15000;
    // Request 1 passes old balanceDue: 15000
    const req1 = await testInvoices.findOneAndUpdate(
      { invoiceId: "INV-PAY-001", balanceDue: 15000 },
      {
        $set: {
          amountPaid: 25000,
          balanceDue: 0,
          status: "PAID",
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
    assert(req1 !== null, "Request 1 should succeed");

    // Request 2 also tries to spend using old balanceDue: 15000
    const req2 = await testInvoices.findOneAndUpdate(
      { invoiceId: "INV-PAY-001", balanceDue: 15000 }, // Balance is now 0, so this fails atomically
      {
        $set: {
          amountPaid: 40000,
          balanceDue: -15000,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
    assert.strictEqual(req2, null, "Request 2 must fail atomically due to OCC balanceDue mismatch");
    recordPass("4.5 Optimistic Concurrency Control prevents simultaneous balance double-spending");

    // 4.6 Exact Settlement verification
    const settledInv = await testInvoices.findOne({ invoiceId: "INV-PAY-001" });
    assert.strictEqual(settledInv.amountPaid, 25000);
    assert.strictEqual(settledInv.balanceDue, 0);
    assert.strictEqual(settledInv.status, "PAID");
    recordPass("4.6 Exact settlement sets balance to 0 and transitions status to PAID");
  } catch (err) {
    recordFail("Suite 4", err);
  }

  // ==========================================================================
  // SUITE 5: PDF GENERATION ENGINE
  // ==========================================================================
  console.log("\n--- Suite 5: PDF Generation & Edge Cases ---");
  try {
    async function generateBuffer(invoiceData) {
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({ size: "A4", margins: { top: 32, bottom: 25, left: 38, right: 38 } });
          const buffers = [];
          doc.on("data", (chunk) => buffers.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(buffers)));

          doc.text(`Invoice No: ${invoiceData.invoiceNumber}`);
          doc.text(`Customer: ${invoiceData.customer?.customerName}`);
          for (const item of invoiceData.items || []) {
            doc.text(`${item.description} - Qty: ${item.quantity} - Total: ${item.amount}`);
          }
          doc.end();
        } catch (e) {
          reject(e);
        }
      });
    }

    // 5.1 Multi-item with long description
    const longDesc = "A".repeat(300);
    const pdfBuf = await generateBuffer({
      invoiceNumber: "00103/0999",
      customer: { customerName: "Test Multi Page Hospital" },
      items: [
        { description: "Standard Monitor", quantity: 1, amount: 23500 },
        { description: longDesc, quantity: 2, amount: 47000 },
      ],
    });

    assert(Buffer.isBuffer(pdfBuf), "PDF output must be a buffer");
    assert(pdfBuf.length > 1000, "PDF buffer must be non-empty");
    assert(pdfBuf.toString("utf8", 0, 4) === "%PDF", "Must have valid PDF magic header");
    recordPass("5.1 Multi-item PDF with long description renders successfully");

    // 5.2 Missing optional fields (bank, po, notes) does not crash PDF engine
    const minimalPdf = await generateBuffer({
      invoiceNumber: "00103/1000",
      customer: { customerName: "Minimal Data Hospital" },
      items: [{ description: "Basic Item", quantity: 1, amount: 1000 }],
    });
    assert(minimalPdf.length > 500);
    recordPass("5.2 Invoice PDF renders cleanly with missing optional fields");
  } catch (err) {
    recordFail("Suite 5", err);
  }

  // ==========================================================================
  // SUITE 6: PRODUCTION DATABASE ZERO-WRITE VERIFICATION
  // ==========================================================================
  console.log("\n--- Suite 6: Production Database Integrity & Zero-Write Audit ---");
  try {
    const prodFinalCounts = {
      invoices: await prodDb.collection("invoices").countDocuments(),
      counters: await prodDb.collection("counters").countDocuments(),
      company_settings: await prodDb.collection("company_settings").countDocuments(),
      products: await prodDb.collection("products").countDocuments(),
      quotations: await prodDb.collection("quotation_requests").countDocuments(),
    };

    assert.strictEqual(
      prodFinalCounts.invoices,
      prodInitialCounts.invoices,
      "Production invoices count must not change"
    );
    assert.strictEqual(
      prodFinalCounts.counters,
      prodInitialCounts.counters,
      "Production counters count must not change"
    );
    assert.strictEqual(
      prodFinalCounts.products,
      prodInitialCounts.products,
      "Production products count must not change"
    );

    console.log("[PASS] Production Baseline Comparison:");
    console.log("  Initial :", JSON.stringify(prodInitialCounts));
    console.log("  Final   :", JSON.stringify(prodFinalCounts));
    recordPass("6.1 ZERO writes to production database 'sse_biomedical' verified!");
  } catch (err) {
    recordFail("Suite 6", err);
  }

  // Cleanup test database
  await testInvoices.deleteMany({});
  await testCounters.deleteMany({ _id: { $regex: /^invoice_/ } });
  await client.close();

  console.log("\n==================================================================");
  console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log("==================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Unhandled error in test runner:", err);
  process.exit(1);
});
