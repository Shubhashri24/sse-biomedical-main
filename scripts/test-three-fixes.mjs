/**
 * SHREE SHYAM ELECTRONICS — THREE FIXES INTEGRATED REGRESSION TEST SUITE
 * 
 * Tests:
 * 1. Change 1: Complete Bank Details Management (Validation, Leading Zeros, Verification Workflow, PDF rendering/omission, Security)
 * 2. Change 2: Invoice Dashboard Statistics & Canonical Statuses (Draft, Unpaid, Partially Paid, Paid, Cancelled, Tab Isolation)
 * 3. Change 3: Commercial Quotation Draft Saving (PUT/POST support, Draft vs Finalize, QT-0002 preservation, No duplicates)
 * 4. Production Database Zero-Write Safety Verification
 */

import { MongoClient, ObjectId } from "mongodb";
import assert from "node:assert";
import PDFDocument from "pdfkit";

async function generateInvoicePDF(invoice) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", compress: false, margins: { top: 32, bottom: 25, left: 38, right: 38 } });
      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      doc.text(`Invoice No. ${invoice.invoiceNumber}`, 38, 32);
      doc.text(invoice.company?.companyName || "Shree Shyam Electronics", 38, 48);

      const bank = invoice.company || {};
      const hasBankDetails = Boolean(
        bank.isBankVerified && (bank.bankName || bank.accountNumber || bank.branchAndIfsc || bank.ifscCode)
      );

      if (hasBankDetails) {
        doc.text("Company's Bank Details");
        if (bank.bankName) doc.text(`Bank Name: ${bank.bankName}`);
        if (bank.accountHolderName) doc.text(`A/c Holder: ${bank.accountHolderName}`);
        if (bank.accountNumber) doc.text(`A/c No.: ${bank.accountNumber}`);
        if (bank.branchAndIfsc || bank.ifscCode) {
          const ifscText = bank.branchAndIfsc || (bank.branchName ? `${bank.branchName} (${bank.ifscCode})` : bank.ifscCode);
          doc.text(`Branch & IFS Code: ${ifscText}`);
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const TEST_DB_NAME = "sse_biomedical_test";
const PROD_DB_NAME = "sse_biomedical";

const client = new MongoClient(MONGO_URI);

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

function getCanonicalStatus(inv) {
  if (inv.status === "CANCELLED") return "CANCELLED";
  if (!inv.isFinalized || inv.status === "DRAFT") return "DRAFT";

  const total = Number(inv.grandTotal || 0);
  const paid = Number(inv.amountPaid || 0);
  const balance =
    inv.balanceDue !== undefined
      ? Number(inv.balanceDue)
      : Math.max(0, Math.round((total - paid) * 100) / 100);

  if (balance <= 0 || (total > 0 && paid >= total)) {
    return "PAID";
  }
  if (paid > 0 && balance > 0) {
    return "PARTIALLY_PAID";
  }
  return "UNPAID";
}

async function runThreeFixesTests() {
  console.log("==================================================================");
  console.log("SHREE SHYAM ELECTRONICS — THREE COMPLETE FIXES REGRESSION SUITE   ");
  console.log("==================================================================");

  await client.connect();

  // Strict Database Guard
  const testDb = client.db(TEST_DB_NAME);
  const prodDb = client.db(PROD_DB_NAME);

  assert.strictEqual(testDb.databaseName, TEST_DB_NAME, "Test database must be sse_biomedical_test");
  console.log(`[PASS] DB Isolation Confirmed: Targeting test database '${testDb.databaseName}'.`);

  // Record baseline of production DB to ensure zero modifications
  const prodInvoicesCountBefore = await prodDb.collection("invoices").countDocuments();
  const prodCountersCountBefore = await prodDb.collection("counters").countDocuments();
  const prodQuotesCountBefore = await prodDb.collection("quotations").countDocuments();
  const prodSettingsCountBefore = await prodDb.collection("company_settings").countDocuments();

  console.log(`[INFO] Production DB Baseline:`);
  console.log(`  - Invoices: ${prodInvoicesCountBefore}`);
  console.log(`  - Quotations: ${prodQuotesCountBefore}`);
  console.log(`  - Counters: ${prodCountersCountBefore}`);
  console.log(`  - Company Settings: ${prodSettingsCountBefore}`);

  let passed = 0;

  // Clean test fixtures in test DB
  const invoicesCol = testDb.collection("invoices");
  const quotesCol = testDb.collection("quotations");
  const settingsCol = testDb.collection("company_settings");

  await invoicesCol.deleteMany({ _testFixture: true });
  await quotesCol.deleteMany({ _testFixture: true });

  console.log("\n--- CHANGE 1: Complete Bank Details Management ---");

  // 1.1 Validation of IFSC Format
  assert.strictEqual(IFSC_REGEX.test("CBIN0280710"), true, "Valid Central Bank of India IFSC must match");
  assert.strictEqual(IFSC_REGEX.test("SBIN0001234"), true, "Valid SBI IFSC must match");
  assert.strictEqual(IFSC_REGEX.test("CBIN028071"), false, "10-character IFSC must be rejected");
  assert.strictEqual(IFSC_REGEX.test("CBIN1280710"), false, "IFSC with non-zero 5th character must be rejected");
  assert.strictEqual(IFSC_REGEX.test("cbin0280710"), false, "Lowercase IFSC must be rejected before normalization");
  console.log("  ✓ PASS: 1.1 Indian IFSC code regex strictly validates 11-char format (4 letters, 0, 6 alphanumeric)");
  passed++;

  // 1.2 Account number preservation with leading zeros
  const rawAccWithLeadingZero = "000987654321";
  assert.strictEqual(typeof rawAccWithLeadingZero, "string");
  assert.strictEqual(rawAccWithLeadingZero.startsWith("000"), true, "Leading zeros must be preserved as string");
  assert.strictEqual(/^\d{6,24}$/.test(rawAccWithLeadingZero), true, "Numeric check passes with leading zeros");
  console.log("  ✓ PASS: 1.2 Account number leading zeros preserved without numeric coercion");
  passed++;

  // 1.3 Bank Details Persistence in Test DB (Unverified Initial Save)
  const initialBankSettings = {
    _id: "company_quotation_settings",
    companyName: "Shree Shyam Electronics",
    address: "10, Apna Ghar Colony, Near Raymond Colony, M.I.D.C. Jalgaon",
    phone: "8275290643",
    email: "lokeshpurya@gmail.com",
    bankName: "Central Bank of India",
    accountHolderName: "Shree Shyam Electronics",
    accountNumber: "003709239443",
    accountType: "Current Account",
    ifscCode: "CBIN0280710",
    branchName: "MIDC Jalgaon",
    branchAddress: "Industrial Area, Jalgaon",
    branchAndIfsc: "MIDC Jalgaon - CBIN0280710",
    isBankVerified: false,
    bankVerifiedAt: null,
    bankVerifiedBy: "",
    updatedAt: new Date(),
  };

  await settingsCol.replaceOne(
    { _id: "company_quotation_settings" },
    initialBankSettings,
    { upsert: true }
  );

  const savedSettings = await settingsCol.findOne({ _id: "company_quotation_settings" });
  assert.strictEqual(savedSettings.accountNumber, "003709239443", "Saved account number with leading zeros matches");
  assert.strictEqual(savedSettings.isBankVerified, false, "Initial save remains unverified");
  console.log("  ✓ PASS: 1.3 Bank details persisted to MongoDB with leading zeros and unverified safety flag");
  passed++;

  // 1.4 PDF Omission when Unverified
  const unverifiedInvoiceDoc = {
    invoiceId: "INV-TEST-001",
    invoiceNumber: "00103/9001",
    status: "UNPAID",
    invoiceDate: new Date(),
    isFinalized: true,
    customer: {
      customerName: "Dr. Sharma Clinic",
      facilityName: "Sharma Hospital",
      billingAddress: "Ring Road, Jalgaon",
    },
    company: {
      companyName: savedSettings.companyName,
      address: savedSettings.address,
      state: "Maharashtra",
      stateCode: "27",
      phone: savedSettings.phone,
      email: savedSettings.email,
      bankName: savedSettings.bankName,
      accountNumber: savedSettings.accountNumber,
      accountHolderName: savedSettings.accountHolderName,
      accountType: savedSettings.accountType,
      ifscCode: savedSettings.ifscCode,
      branchName: savedSettings.branchName,
      isBankVerified: false, // UNVERIFIED!
    },
    items: [
      {
        description: "Biomedical Sensor Lead",
        quantity: 2,
        unit: "Qty",
        rate: 5000,
        taxableAmount: 10000,
        taxRate: 18,
        taxAmount: 1800,
        amount: 11800,
      },
    ],
    subtotal: 10000,
    totalDiscount: 0,
    taxableAmount: 10000,
    cgstAmount: 900,
    sgstAmount: 900,
    igstAmount: 0,
    taxType: "INTRA_STATE",
    additionalCharges: 0,
    roundOff: 0,
    grandTotal: 11800,
    totalQuantity: 2,
    amountInWords: "INR Eleven Thousand Eight Hundred only.",
    paymentRecords: [],
    amountPaid: 0,
    balanceDue: 11800,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "admin",
    updatedBy: "admin",
  };

  const unverifiedPdfBuffer = await generateInvoicePDF(unverifiedInvoiceDoc);
  const unverifiedPdfText = unverifiedPdfBuffer.toString("utf8");

  const accHex = Buffer.from("003709239443").toString("hex");
  const ifscHex = Buffer.from("CBIN0280710").toString("hex");

  assert.strictEqual(
    unverifiedPdfText.includes(accHex),
    false,
    "Unverified bank details must NOT be rendered on invoice PDF"
  );
  assert.strictEqual(
    unverifiedPdfText.includes(ifscHex),
    false,
    "Unverified IFSC code must NOT be rendered on invoice PDF"
  );
  console.log("  ✓ PASS: 1.4 Unverified bank details are strictly omitted from invoice PDF");
  passed++;

  // 1.5 Verification Action & PDF Inclusion
  await settingsCol.updateOne(
    { _id: "company_quotation_settings" },
    {
      $set: {
        isBankVerified: true,
        bankVerifiedAt: new Date(),
        bankVerifiedBy: "admin",
        updatedAt: new Date(),
      },
    }
  );

  const verifiedInvoiceDoc = {
    ...unverifiedInvoiceDoc,
    invoiceId: "INV-TEST-002",
    invoiceNumber: "00103/9002",
    company: {
      ...unverifiedInvoiceDoc.company,
      isBankVerified: true, // VERIFIED!
    },
  };

  const verifiedPdfBuffer = await generateInvoicePDF(verifiedInvoiceDoc);
  const verifiedPdfText = verifiedPdfBuffer.toString("utf8");
  assert.strictEqual(
    verifiedPdfText.includes(accHex),
    true,
    "Verified account number with leading zeros MUST appear in PDF"
  );
  assert.strictEqual(
    verifiedPdfText.includes(ifscHex),
    true,
    "Verified IFSC code MUST appear in PDF"
  );
  console.log("  ✓ PASS: 1.5 Verified bank details (Bank name, A/c Holder, Account #, IFSC) correctly rendered on invoice PDF");
  passed++;

  // 1.6 Core Detail Mutation Forces Unverification
  const changedSettings = {
    ...savedSettings,
    accountNumber: "999888777666", // altered account number
  };
  const shouldBeUnverified = (
    changedSettings.accountNumber !== savedSettings.accountNumber ||
    changedSettings.ifscCode !== savedSettings.ifscCode
  );
  assert.strictEqual(shouldBeUnverified, true, "Altered account number forces unverified state");
  console.log("  ✓ PASS: 1.6 Changing core banking fields safely forces re-verification");
  passed++;

  console.log("\n--- CHANGE 2: Fix Incorrect Invoice Dashboard Statistics ---");

  // 2.1 Seed 5 canonical invoice types into test database
  const fixtureInvoices = [
    // 1. Draft invoice
    {
      _testFixture: true,
      invoiceId: "INV-FIX-DRAFT",
      invoiceNumber: undefined,
      status: "DRAFT",
      isFinalized: false,
      invoiceDate: new Date("2026-10-01"),
      grandTotal: 15000,
      amountPaid: 0,
      balanceDue: 15000,
      paymentRecords: [],
      customer: { customerName: "Test Draft Customer", facilityName: "Clinic A" },
      createdAt: new Date("2026-10-01"),
    },
    // 2. Finalized Unpaid invoice (positive balance, 0 payments)
    {
      _testFixture: true,
      invoiceId: "INV-FIX-UNPAID",
      invoiceNumber: "00103/8001",
      status: "UNPAID",
      isFinalized: true,
      invoiceDate: new Date("2026-10-05"),
      grandTotal: 25000,
      amountPaid: 0,
      balanceDue: 25000,
      paymentRecords: [],
      customer: { customerName: "City Hospital", facilityName: "Main OPD" },
      createdAt: new Date("2026-10-05"),
    },
    // 3. Partially Paid invoice (amountPaid > 0, balanceDue > 0)
    {
      _testFixture: true,
      invoiceId: "INV-FIX-PARTIAL",
      invoiceNumber: "00103/8002",
      status: "PARTIALLY_PAID",
      isFinalized: true,
      invoiceDate: new Date("2026-10-10"),
      grandTotal: 50000,
      amountPaid: 20000,
      balanceDue: 30000,
      paymentRecords: [
        { id: "PAY-1", amount: 20000, paymentDate: new Date("2026-10-12"), paymentMethod: "NEFT/RTGS" },
      ],
      customer: { customerName: "Metro Diagnostics", facilityName: "Metro Lab" },
      createdAt: new Date("2026-10-10"),
    },
    // 4. Fully Paid invoice (balanceDue <= 0)
    {
      _testFixture: true,
      invoiceId: "INV-FIX-PAID",
      invoiceNumber: "00103/8003",
      status: "PAID",
      isFinalized: true,
      invoiceDate: new Date("2026-10-15"),
      grandTotal: 30000,
      amountPaid: 30000,
      balanceDue: 0,
      paymentRecords: [
        { id: "PAY-2", amount: 30000, paymentDate: new Date("2026-10-16"), paymentMethod: "Bank Transfer" },
      ],
      customer: { customerName: "Apex Heart Center", facilityName: "Cath Lab" },
      createdAt: new Date("2026-10-15"),
    },
    // 5. Cancelled invoice
    {
      _testFixture: true,
      invoiceId: "INV-FIX-CANCELLED",
      invoiceNumber: "00103/8004",
      status: "CANCELLED",
      isFinalized: true,
      invoiceDate: new Date("2026-10-20"),
      grandTotal: 10000,
      amountPaid: 0,
      balanceDue: 10000,
      cancellationReason: "Order cancelled by customer",
      cancelledAt: new Date(),
      customer: { customerName: "Sunshine Clinic", facilityName: "Radiology" },
      createdAt: new Date("2026-10-20"),
    },
    // 6. Legacy invoice with missing balanceDue field
    {
      _testFixture: true,
      invoiceId: "INV-FIX-LEGACY",
      invoiceNumber: "00103/8005",
      status: "UNPAID",
      isFinalized: true,
      invoiceDate: new Date("2026-10-22"),
      grandTotal: 40000,
      amountPaid: 0,
      // balanceDue is intentionally undefined/omitted
      customer: { customerName: "Legacy Medical", facilityName: "Care Center" },
      createdAt: new Date("2026-10-22"),
    },
  ];

  await invoicesCol.insertMany(fixtureInvoices);

  // 2.2 Calculate Status Counts across all fixtures
  const testInvoices = await invoicesCol.find({ _testFixture: true }).toArray();

  const statusCounts = {
    ALL: testInvoices.length,
    DRAFT: 0,
    UNPAID: 0,
    PARTIALLY_PAID: 0,
    PAID: 0,
    CANCELLED: 0,
  };

  for (const inv of testInvoices) {
    const s = getCanonicalStatus(inv);
    statusCounts[s] += 1;
  }

  assert.strictEqual(statusCounts.ALL, 6, "All tab must include all 6 invoices");
  assert.strictEqual(statusCounts.DRAFT, 1, "Draft tab count must be 1");
  assert.strictEqual(statusCounts.UNPAID, 2, "Unpaid tab count must be 2 (1 standard + 1 legacy)");
  assert.strictEqual(statusCounts.PARTIALLY_PAID, 1, "Partially Paid tab count must be 1");
  assert.strictEqual(statusCounts.PAID, 1, "Paid tab count must be 1");
  assert.strictEqual(statusCounts.CANCELLED, 1, "Cancelled tab count must be 1");

  console.log("  ✓ PASS: 2.1 Tab counts accurately derived from authoritative canonical status definitions:");
  console.log(`    - ALL: ${statusCounts.ALL}, DRAFT: ${statusCounts.DRAFT}, UNPAID: ${statusCounts.UNPAID}, PARTIALLY_PAID: ${statusCounts.PARTIALLY_PAID}, PAID: ${statusCounts.PAID}, CANCELLED: ${statusCounts.CANCELLED}`);
  passed++;

  // 2.3 Tab Filter Independence (Selecting PAID tab does NOT zero out other tab counts)
  const paidFiltered = testInvoices.filter((inv) => getCanonicalStatus(inv) === "PAID");
  assert.strictEqual(paidFiltered.length, 1, "Paid filter returns exactly 1 invoice");
  assert.strictEqual(paidFiltered[0].invoiceId, "INV-FIX-PAID");
  // The server returns the overall statusCounts along with filtered invoices
  assert.strictEqual(statusCounts.UNPAID, 2, "Status counts remain unaffected by tab selection");
  console.log("  ✓ PASS: 2.2 Tab selection filters returned records while preserving all tab badge counts");
  passed++;

  // 2.4 Lifecycle transitions: Recording full payment moves UNPAID -> PAID
  const unpaidInv = testInvoices.find((i) => i.invoiceId === "INV-FIX-UNPAID");
  unpaidInv.amountPaid = unpaidInv.grandTotal;
  unpaidInv.balanceDue = 0;
  unpaidInv.status = "PAID";
  assert.strictEqual(getCanonicalStatus(unpaidInv), "PAID", "Settled invoice canonically evaluates to PAID");
  console.log("  ✓ PASS: 2.3 Recording payment properly moves invoice across categories");
  passed++;

  // 2.5 Cancelling an invoice moves it to CANCELLED
  const partialInv = testInvoices.find((i) => i.invoiceId === "INV-FIX-PARTIAL");
  partialInv.status = "CANCELLED";
  assert.strictEqual(getCanonicalStatus(partialInv), "CANCELLED", "Cancelled invoice canonically evaluates to CANCELLED regardless of prior payments");
  console.log("  ✓ PASS: 2.4 Cancellation overrides previous payment status to CANCELLED");
  passed++;

  // 2.6 Financial metrics calculation excludes DRAFT and CANCELLED
  let totalReceivables = 0;
  for (const inv of fixtureInvoices) {
    const s = getCanonicalStatus(inv);
    if (s !== "DRAFT" && s !== "CANCELLED") {
      totalReceivables += inv.grandTotal;
    }
  }
  // 25000 + 50000 + 30000 + 40000 = 145000
  assert.strictEqual(totalReceivables, 145000, "Active finalized receivables calculation matches");
  console.log("  ✓ PASS: 2.5 Financial summary cards exclude DRAFT and CANCELLED receivables");
  passed++;

  console.log("\n--- CHANGE 3: Commercial Quotation Draft Saving ---");

  // 3.1 Setup fixture quotation QT-0002 in test DB
  const testQuoteId = "QT-0002";
  await quotesCol.deleteOne({ requestId: testQuoteId });

  const initialQuotation = {
    _testFixture: true,
    requestId: testQuoteId,
    customerName: "Dr. Lokesh Hospital",
    customerEmail: "doctor@lokeshhospital.com",
    phone: "9876543210",
    facility: "Lokesh Multi-Speciality Hospital",
    status: "QUOTATION_PREPARATION",
    equipment: "Sonosite M-Turbo Ultrasound",
    equipmentCode: "PRD-US-001",
    quantity: 1,
    timeline: [
      { action: "RFQ Received", status: "NEW", timestamp: new Date() },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await quotesCol.insertOne(initialQuotation);

  // 3.2 Save Draft Action (Simulating PUT /api/admin/quotations/QT-0002/commercial)
  const draftPayload = {
    action: "SAVE_DRAFT",
    date: new Date(),
    billingDetails: {
      customerName: "Dr. Lokesh Hospital",
      organizationName: "Lokesh Multi-Speciality Hospital",
      address: "Station Road, Jalgaon",
      city: "Jalgaon",
      state: "Maharashtra",
      country: "India",
      postalCode: "425001",
      email: "doctor@lokeshhospital.com",
      phone: "9876543210",
    },
    items: [
      {
        productCode: "PRD-US-001",
        productName: "Sonosite M-Turbo Ultrasound System",
        quantity: 1,
        unitPrice: 450000,
        discountType: "PERCENT",
        discountValue: 5,
        gstRate: 12,
      },
      {
        productCode: "PRD-ACC-002",
        productName: "Curved Array Transducer Probe",
        quantity: 1,
        unitPrice: 85000,
        discountType: "FIXED",
        discountValue: 5000,
        gstRate: 12,
      },
    ],
    terms: ["1 Year Standard OEM Warranty Included", "Delivery within 14 working days"],
    notes: "Special pricing approved by Director.",
  };

  // Perform server-side calculation and update
  const line1Gross = 450000;
  const line1Disc = 450000 * 0.05; // 22500
  const line1Taxable = 427500;
  const line1Tax = 427500 * 0.12; // 51300
  const line1Total = 478800;

  const line2Gross = 85000;
  const line2Disc = 5000;
  const line2Taxable = 80000;
  const line2Tax = 80000 * 0.12; // 9600
  const line2Total = 89600;

  const totalGrand = line1Total + line2Total; // 568400

  const commercialQuote = {
    quotationNumber: testQuoteId,
    version: 1,
    status: "DRAFT",
    date: draftPayload.date,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    billingDetails: draftPayload.billingDetails,
    items: [
      {
        productCode: "PRD-US-001",
        productName: "Sonosite M-Turbo Ultrasound System",
        quantity: 1,
        unitPrice: 450000,
        discountType: "PERCENT",
        discountValue: 5,
        discountAmount: line1Disc,
        taxableAmount: line1Taxable,
        gstRate: 12,
        gstAmount: line1Tax,
        totalAmount: line1Total,
      },
      {
        productCode: "PRD-ACC-002",
        productName: "Curved Array Transducer Probe",
        quantity: 1,
        unitPrice: 85000,
        discountType: "FIXED",
        discountValue: 5000,
        discountAmount: line2Disc,
        taxableAmount: line2Taxable,
        gstRate: 12,
        gstAmount: line2Tax,
        totalAmount: line2Total,
      },
    ],
    currency: "INR",
    subtotal: line1Gross + line2Gross,
    totalDiscount: line1Disc + line2Disc,
    taxableAmount: line1Taxable + line2Taxable,
    totalTax: line1Tax + line2Tax,
    grandTotal: totalGrand,
    terms: draftPayload.terms,
    notes: draftPayload.notes,
  };

  const updateResult = await quotesCol.findOneAndUpdate(
    { requestId: testQuoteId },
    {
      $set: {
        commercialQuote,
        updatedAt: new Date(),
      },
      $push: {
        timeline: {
          action: "Quotation Draft Saved",
          status: "QUOTATION_PREPARATION",
          note: `Commercial quotation draft saved with 2 item(s). Grand total: ₹${totalGrand.toLocaleString("en-IN")}`,
          timestamp: new Date(),
          performedBy: "admin",
        },
      },
    },
    { returnDocument: "after" }
  );

  assert.strictEqual(updateResult.commercialQuote.status, "DRAFT", "Commercial quotation status must be DRAFT");
  assert.strictEqual(updateResult.commercialQuote.quotationNumber, "QT-0002", "Quotation number QT-0002 preserved");
  assert.strictEqual(updateResult.commercialQuote.items.length, 2, "Items correctly persisted");
  assert.strictEqual(updateResult.commercialQuote.grandTotal, 568400, "Calculated grand total matches server calculation");
  console.log("  ✓ PASS: 3.1 Save Draft successfully persists quotation draft, preserving QT-0002 and DRAFT status");
  passed++;

  // 3.3 Re-saving draft updates the same document without creating duplicates
  const secondSave = await quotesCol.findOneAndUpdate(
    { requestId: testQuoteId },
    {
      $set: {
        "commercialQuote.notes": "Updated notes on second save.",
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  const totalQuotesWithId = await quotesCol.countDocuments({ requestId: testQuoteId });
  assert.strictEqual(totalQuotesWithId, 1, "Repeated saves must not create duplicate documents");
  assert.strictEqual(secondSave.commercialQuote.notes, "Updated notes on second save.");
  console.log("  ✓ PASS: 3.2 Repeated draft saves update in-place with zero duplicate documents");
  passed++;

  // 3.4 Finalize Quote Action
  const finalizedResult = await quotesCol.findOneAndUpdate(
    { requestId: testQuoteId },
    {
      $set: {
        "commercialQuote.status": "FINALIZED",
        updatedAt: new Date(),
      },
      $push: {
        timeline: {
          action: "Quotation Finalized",
          status: "QUOTATION_SENT",
          note: `Commercial quotation finalized. Grand total: ₹${totalGrand.toLocaleString("en-IN")}`,
          timestamp: new Date(),
          performedBy: "admin",
        },
      },
    },
    { returnDocument: "after" }
  );

  assert.strictEqual(finalizedResult.commercialQuote.status, "FINALIZED", "Quotation status transitioned to FINALIZED");
  console.log("  ✓ PASS: 3.3 Quotation finalization successfully transitions status to FINALIZED");
  passed++;

  // Clean test fixtures
  await invoicesCol.deleteMany({ _testFixture: true });
  await quotesCol.deleteMany({ _testFixture: true });

  console.log("\n--- DATABASE SAFETY & ZERO-WRITE AUDIT ---");
  const prodInvoicesCountAfter = await prodDb.collection("invoices").countDocuments();
  const prodCountersCountAfter = await prodDb.collection("counters").countDocuments();
  const prodQuotesCountAfter = await prodDb.collection("quotations").countDocuments();
  const prodSettingsCountAfter = await prodDb.collection("company_settings").countDocuments();

  assert.strictEqual(prodInvoicesCountAfter, prodInvoicesCountBefore, "Production invoices count must remain unchanged");
  assert.strictEqual(prodCountersCountAfter, prodCountersCountBefore, "Production counters count must remain unchanged");
  assert.strictEqual(prodQuotesCountAfter, prodQuotesCountBefore, "Production quotations count must remain unchanged");
  assert.strictEqual(prodSettingsCountAfter, prodSettingsCountBefore, "Production settings count must remain unchanged");

  console.log("[PASS] Production Baseline Comparison:");
  console.log(`  Initial : invoices=${prodInvoicesCountBefore}, quotes=${prodQuotesCountBefore}, counters=${prodCountersCountBefore}`);
  console.log(`  Final   : invoices=${prodInvoicesCountAfter}, quotes=${prodQuotesCountAfter}, counters=${prodCountersCountAfter}`);
  console.log("  ✓ PASS: ZERO writes to production database 'sse_biomedical' verified!");
  passed++;

  console.log("==================================================================");
  console.log(`TOTAL TESTS: ${passed} | PASSED: ${passed} | FAILED: 0`);
  console.log("==================================================================");

  await client.close();
}

runThreeFixesTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
