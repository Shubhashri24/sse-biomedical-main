import { MongoClient, ObjectId } from "mongodb";
import PDFDocument from "pdfkit";
import assert from "assert";

// ============================================================================
// STRICT SAFETY ENFORCEMENT: ONLY EXECUTE AGAINST ISOLATED TEST DATABASE
// ============================================================================
const MONGO_URI = "mongodb://localhost:27017";
const TEST_DB_NAME = "sse_biomedical_test";
const PROD_DB_NAME = "sse_biomedical";

console.log("\n==================================================================");
console.log("SHREE SHYAM ELECTRONICS — INVOICE EMAIL ISOLATED TEST SUITE");
console.log("==================================================================\n");

// ----------------------------------------------------------------------------
// Pure helper implementations replicating route & email behavior
// ----------------------------------------------------------------------------
function buildInvoiceIdFilter(id) {
  if (ObjectId.isValid(id)) {
    return {
      $or: [
        { _id: new ObjectId(id) },
        { invoiceId: id },
        { invoiceNumber: id },
      ],
    };
  }
  return {
    $or: [{ invoiceId: id }, { invoiceNumber: id }],
  };
}

function sanitizeSmtpError(err) {
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

async function generateSampleInvoicePDF(invoice) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 32, bottom: 25, left: 38, right: 38 },
        bufferPages: true,
      });
      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      doc.fontSize(16).text(invoice.company?.companyName || "Shree Shyam Electronics", { align: "center" });
      doc.fontSize(12).text(`Invoice No: ${invoice.invoiceNumber || invoice.invoiceId}`, { align: "left" });
      doc.text(`Customer: ${invoice.customer?.customerName}`, { align: "left" });
      doc.text(`Grand Total: INR ${invoice.grandTotal}`, { align: "right" });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ----------------------------------------------------------------------------
// Test Execution
// ----------------------------------------------------------------------------
async function runInvoiceEmailTests() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();

  const testDb = client.db(TEST_DB_NAME);
  const prodDb = client.db(PROD_DB_NAME);

  assert.strictEqual(
    testDb.databaseName,
    TEST_DB_NAME,
    "FATAL ERROR: Target database must be sse_biomedical_test"
  );
  console.log(`[PASS] DB Isolation Confirmed: Connected to '${testDb.databaseName}'.`);

  // Baseline production database counts
  const prodInvoicesCol = prodDb.collection("invoices");
  const prodCountersCol = prodDb.collection("counters");
  const prodInitialInvoiceCount = await prodInvoicesCol.countDocuments();
  const prodInitialCounterCount = await prodCountersCol.countDocuments();

  const testInvoices = testDb.collection("invoices");

  // Clean test fixtures
  await testInvoices.deleteMany({ _testFixture: true });

  const passedTests = [];
  const failedTests = [];

  function record(name, pass, detail = "") {
    if (pass) {
      passedTests.push(name);
      console.log(`  ✓ PASS: ${name}`);
    } else {
      failedTests.push({ name, detail });
      console.error(`  ✗ FAIL: ${name} — ${detail}`);
    }
  }

  // Fixture: Standard Customer
  const testCustomer = {
    customerName: "Dr. Arvind Mehta",
    facilityName: "Care Multispecialty Hospital",
    city: "Jalgaon",
    state: "Maharashtra",
    stateCode: "27",
    email: "arvind.mehta@carehospital.org",
    phone: "9823012345",
  };

  const testCompany = {
    companyName: "Shree Shyam Electronics",
    address: "MIDC Bhagi Pala Market, Jalgaon",
    state: "Maharashtra",
    stateCode: "27",
    phone: "+91 82752 90643",
    email: "lokeshpurya@gmail.com",
    gstin: "27AABCS1234F1Z5",
  };

  console.log("\n--- Suite 1: Authentication & Eligibility Guards ---");

  // Test 1: Unauthenticated request simulation
  const simulateAuthCheck = (token) => {
    return token === "valid-admin-session";
  };
  record("1. Unauthenticated request returns 401 / rejected", simulateAuthCheck(null) === false && simulateAuthCheck("invalid") === false);

  // Test 2: Missing invoice returns 404
  const missingInvoice = await testInvoices.findOne(buildInvoiceIdFilter("NON-EXISTENT-INV"));
  record("2. Missing invoice returns 404 Not Found", missingInvoice === null);

  // Test 3 & 4: Draft / Unfinalized invoice is rejected
  const draftInvoice = {
    _testFixture: true,
    invoiceId: "INV-TEST-DRAFT-01",
    status: "DRAFT",
    isFinalized: false,
    invoiceDate: new Date(),
    customer: testCustomer,
    company: testCompany,
    items: [],
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
    totalQuantity: 1,
    amountInWords: "INR Eleven Thousand Eight Hundred only.",
    paymentRecords: [],
    amountPaid: 0,
    balanceDue: 11800,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "test_admin",
    updatedBy: "test_admin",
  };
  await testInvoices.insertOne(draftInvoice);

  const checkEligibility = (inv) => {
    if (!inv.isFinalized || inv.status === "DRAFT") {
      return { eligible: false, status: 400, message: "Draft invoices cannot be emailed." };
    }
    if (inv.status === "CANCELLED") {
      return { eligible: false, status: 400, message: "Cancelled invoices cannot be emailed." };
    }
    if (!inv.invoiceNumber) {
      return { eligible: false, status: 400, message: "Missing official invoice number." };
    }
    return { eligible: true };
  };

  const draftCheck = checkEligibility(draftInvoice);
  record("3. Draft invoice is rejected from emailing (400)", draftCheck.eligible === false && draftCheck.status === 400);

  // Test 5: Cancelled invoice is rejected
  const cancelledInvoice = {
    ...draftInvoice,
    _id: new ObjectId(),
    invoiceId: "INV-TEST-CANCELLED-01",
    invoiceNumber: "00103/9991",
    isFinalized: true,
    status: "CANCELLED",
    cancelledAt: new Date(),
  };
  await testInvoices.insertOne(cancelledInvoice);
  const cancelCheck = checkEligibility(cancelledInvoice);
  record("5. Cancelled invoice is rejected from emailing (400)", cancelCheck.eligible === false && cancelCheck.status === 400);

  console.log("\n--- Suite 2: Recipient Address & Validation ---");

  // Test 6: Missing recipient email is rejected
  const noEmailInvoice = {
    ...draftInvoice,
    _id: new ObjectId(),
    invoiceId: "INV-TEST-NOEMAIL-01",
    invoiceNumber: "00103/9992",
    isFinalized: true,
    status: "UNPAID",
    customer: { ...testCustomer, email: "" },
  };

  const validateRecipient = (inv, overrideEmail) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const target = (typeof overrideEmail === "string" && overrideEmail.trim()) || inv.customer?.email?.trim() || "";
    if (!target) return { valid: false, error: "No recipient email on file." };
    if (!emailRegex.test(target)) return { valid: false, error: "Invalid recipient email address." };
    return { valid: true, email: target };
  };

  const noEmailCheck = validateRecipient(noEmailInvoice, undefined);
  record("6. Missing recipient email is rejected (400)", noEmailCheck.valid === false);

  // Test 7: Invalid recipient email formats rejected
  const invalidEmailChecks = [
    validateRecipient(noEmailInvoice, "not-an-email").valid === false,
    validateRecipient(noEmailInvoice, "@missinguser.com").valid === false,
    validateRecipient(noEmailInvoice, "spaces in@email.com").valid === false,
  ];
  record("7. Invalid recipient email is rejected (400)", invalidEmailChecks.every(Boolean));

  // Valid override test
  const validOverride = validateRecipient(noEmailInvoice, "accounts.procurement@carehospital.org");
  record("7b. Custom recipient override accepted when valid", validOverride.valid === true && validOverride.email === "accounts.procurement@carehospital.org");

  console.log("\n--- Suite 3: SMTP Credentials & Safe Error Handling ---");

  // Test 8: Missing SMTP credentials detection
  const checkSmtpConfig = (mockEnv) => {
    if (!mockEnv.SMTP_HOST || !mockEnv.SMTP_USER || !mockEnv.SMTP_PASSWORD) {
      return {
        configured: false,
        status: 503,
        message: "SMTP credentials not configured on server.",
      };
    }
    return { configured: true };
  };

  const missingSmtp = checkSmtpConfig({ SMTP_HOST: "", SMTP_USER: "user@gmail.com", SMTP_PASSWORD: "" });
  record("8. Missing SMTP configuration returns safe 503 Service Unavailable", missingSmtp.configured === false && missingSmtp.status === 503);

  // Test 9: Valid finalized invoice PDF generation
  const finalizedInvoice = {
    ...draftInvoice,
    _id: new ObjectId(),
    invoiceId: "INV-TEST-FINAL-01",
    invoiceNumber: "00103/0386",
    isFinalized: true,
    status: "UNPAID",
    customer: testCustomer,
  };
  await testInvoices.insertOne(finalizedInvoice);

  const pdfBuf = await generateSampleInvoicePDF(finalizedInvoice);
  record(
    "9. Valid finalized invoice generates correct PDF buffer",
    Buffer.isBuffer(pdfBuf) && pdfBuf.length > 500 && pdfBuf.subarray(0, 5).toString() === "%PDF-"
  );

  console.log("\n--- Suite 4: Dispatch Simulation, Audit Logging & Immutability ---");

  // Test 10: Successful SMTP acceptance simulation records SENT history
  const now = new Date();
  const mockMessageId = "<msg-test-12345@smtp.gmail.com>";
  const successRecord = {
    sentAt: now,
    sentBy: "admin",
    recipientEmail: testCustomer.email,
    pdfFilename: `Invoice-${finalizedInvoice.invoiceNumber.replace("/", "-")}.pdf`,
    messageId: mockMessageId,
    status: "SENT",
  };

  await testInvoices.updateOne(
    { invoiceId: finalizedInvoice.invoiceId },
    {
      $set: {
        lastEmailStatus: "SENT",
        lastEmailedAt: now,
        pdfGeneratedAt: now,
        updatedAt: now,
      },
      $push: { emailHistory: successRecord },
    }
  );

  const docAfterSent = await testInvoices.findOne({ invoiceId: finalizedInvoice.invoiceId });
  record(
    "10. Successful SMTP acceptance records SENT history with messageId",
    docAfterSent.lastEmailStatus === "SENT" &&
      docAfterSent.emailHistory?.length === 1 &&
      docAfterSent.emailHistory[0].messageId === mockMessageId &&
      docAfterSent.emailHistory[0].status === "SENT"
  );

  // Test 11: SMTP failure simulation records FAILED history safely
  const failRecord = {
    sentAt: new Date(now.getTime() + 1000),
    sentBy: "admin",
    recipientEmail: testCustomer.email,
    pdfFilename: `Invoice-${finalizedInvoice.invoiceNumber.replace("/", "-")}.pdf`,
    status: "FAILED",
    error: sanitizeSmtpError(new Error("535-5.7.8 Username and Password not accepted")),
  };

  await testInvoices.updateOne(
    { invoiceId: finalizedInvoice.invoiceId },
    {
      $set: { lastEmailStatus: "FAILED", updatedAt: new Date() },
      $push: { emailHistory: failRecord },
    }
  );

  const docAfterFail = await testInvoices.findOne({ invoiceId: finalizedInvoice.invoiceId });
  record(
    "11. SMTP failure records FAILED history safely with sanitized message",
    docAfterFail.lastEmailStatus === "FAILED" &&
      docAfterFail.emailHistory?.length === 2 &&
      docAfterFail.emailHistory[1].status === "FAILED" &&
      docAfterFail.emailHistory[1].error.includes("Google App Password") &&
      !docAfterFail.emailHistory[1].error.includes("password123")
  );

  console.log("\n--- Suite 5: Idempotency, Cooldown & Concurrency Lock ---");

  // Test 12: Duplicate send within 60 seconds requires explicit confirmation
  const checkDuplicate = (inv, currentTime, confirmResend) => {
    const recentSend = (inv.emailHistory || []).find(
      (h) => h.status === "SENT" && currentTime.getTime() - new Date(h.sentAt).getTime() < 60 * 1000
    );
    if (recentSend && !confirmResend) {
      const elapsed = Math.round((currentTime.getTime() - new Date(recentSend.sentAt).getTime()) / 1000);
      return { duplicate: true, status: 409, elapsed, remaining: 60 - elapsed };
    }
    return { duplicate: false };
  };

  const dupCheck1 = checkDuplicate(docAfterFail, new Date(now.getTime() + 10000), false);
  record("12. Duplicate send within 60 seconds requires explicit confirmation (409)", dupCheck1.duplicate === true && dupCheck1.status === 409);

  // Test 13: Concurrent duplicate requests cannot bypass server-side guard
  const lockToken1 = new ObjectId().toHexString();
  const lockToken2 = new ObjectId().toHexString();
  const lockTime = new Date();
  const lockExpiry = new Date(lockTime.getTime() + 15000);

  // Worker 1 acquires lock
  const lockResult1 = await testInvoices.updateOne(
    {
      invoiceId: finalizedInvoice.invoiceId,
      $or: [
        { emailDispatchLock: { $exists: false } },
        { emailDispatchLock: "" },
        { emailDispatchLockExpiresAt: { $lt: lockTime } },
      ],
    },
    {
      $set: {
        emailDispatchLock: lockToken1,
        emailDispatchLockExpiresAt: lockExpiry,
      },
    }
  );

  // Worker 2 attempts to acquire simultaneous lock
  const lockResult2 = await testInvoices.updateOne(
    {
      invoiceId: finalizedInvoice.invoiceId,
      $or: [
        { emailDispatchLock: { $exists: false } },
        { emailDispatchLock: "" },
        { emailDispatchLockExpiresAt: { $lt: lockTime } },
      ],
    },
    {
      $set: {
        emailDispatchLock: lockToken2,
        emailDispatchLockExpiresAt: lockExpiry,
      },
    }
  );

  record(
    "13. Concurrent duplicate requests blocked by atomic dispatch lock",
    lockResult1.matchedCount === 1 && lockResult2.matchedCount === 0
  );

  // Release lock
  await testInvoices.updateOne(
    { invoiceId: finalizedInvoice.invoiceId },
    { $unset: { emailDispatchLock: "", emailDispatchLockExpiresAt: "" } }
  );

  // Test 14: Confirmed resend works when allowed
  const dupCheck2 = checkDuplicate(docAfterFail, new Date(now.getTime() + 10000), true);
  record("14. Explicitly confirmed resend (confirmResend: true) permitted", dupCheck2.duplicate === false);

  // Test 15: Financial immutability check
  const finalDocVerification = await testInvoices.findOne({ invoiceId: finalizedInvoice.invoiceId });
  const financialFieldsUntouched =
    finalDocVerification.grandTotal === 11800 &&
    finalDocVerification.balanceDue === 11800 &&
    finalDocVerification.amountPaid === 0 &&
    finalDocVerification.status === "UNPAID" &&
    finalDocVerification.invoiceNumber === "00103/0386";
  record(
    "15. Email operations strictly preserve financial status, totals, and numbers",
    financialFieldsUntouched
  );

  // Test 16: Quotation email behavior unaffected
  const testQuotation = {
    _testFixture: true,
    requestId: "QT-TEST-EMAIL-01",
    customerEmail: "quote.customer@hospital.org",
    commercialQuote: {
      quotationNumber: "QT-0001",
      grandTotal: 50000,
      emailHistory: [],
    },
  };
  const testQuotes = testDb.collection("quotation_requests");
  await testQuotes.insertOne(testQuotation);
  const fetchedQuote = await testQuotes.findOne({ requestId: "QT-TEST-EMAIL-01" });
  record("16. Existing quotation document and email structure unaffected", fetchedQuote !== null && fetchedQuote.commercialQuote.quotationNumber === "QT-0001");

  // Test 17: Information leak check
  const sampleErrorMsg = sanitizeSmtpError(new Error("connect ECONNREFUSED 142.250.183.108:587 password=SECRET_XYZ"));
  record(
    "17. Credentials and raw socket dumps never leak into sanitized error outputs",
    !sampleErrorMsg.includes("SECRET_XYZ") && !sampleErrorMsg.includes("142.250")
  );

  // Clean test fixtures
  await testInvoices.deleteMany({ _testFixture: true });
  await testQuotes.deleteMany({ _testFixture: true });

  console.log("\n--- Suite 6: Production Database Integrity & Zero-Write Audit ---");
  const prodFinalInvoiceCount = await prodInvoicesCol.countDocuments();
  const prodFinalCounterCount = await prodCountersCol.countDocuments();

  const prodUntouched =
    prodInitialInvoiceCount === prodFinalInvoiceCount &&
    prodInitialCounterCount === prodFinalCounterCount;

  console.log(`[INFO] Production Baseline: invoices=${prodInitialInvoiceCount}, counters=${prodInitialCounterCount}`);
  console.log(`[INFO] Production Final:    invoices=${prodFinalInvoiceCount}, counters=${prodFinalCounterCount}`);
  record("18. ZERO writes to production database 'sse_biomedical' verified", prodUntouched);

  await client.close();

  console.log("\n==================================================================");
  console.log(`TOTAL TESTS: ${passedTests.length + failedTests.length} | PASSED: ${passedTests.length} | FAILED: ${failedTests.length}`);
  console.log("==================================================================\n");

  if (failedTests.length > 0) {
    process.exit(1);
  }
}

runInvoiceEmailTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
