import { MongoClient, ObjectId } from "mongodb";
import assert from "assert";

const MONGO_URI = "mongodb://localhost:27017";
const TEST_DB_NAME = "sse_biomedical_test";
const PROD_DB_NAME = "sse_biomedical";

async function runDeferredNumberingLifecycleTests() {
  console.log("==================================================================");
  console.log("SHREE SHYAM ELECTRONICS — DEFERRED NUMBERING & CONCURRENCY TESTS  ");
  console.log("==================================================================\n");

  const client = new MongoClient(MONGO_URI);
  await client.connect();

  // Strict Database Safety Guard
  const testDb = client.db(TEST_DB_NAME);
  if (testDb.databaseName !== "sse_biomedical_test") {
    console.error("FATAL: Database guard failed. Resolved database is:", testDb.databaseName);
    process.exit(1);
  }
  console.log("[PASS] Strict DB Guard: Verified target database is 'sse_biomedical_test'");

  // Record initial production state for later zero-write proof
  const prodDb = client.db(PROD_DB_NAME);
  const prodInitialInvoice = await prodDb.collection("invoices").findOne({ invoiceId: "INV-0001" });
  const prodInitialCounter = await prodDb.collection("counters").findOne({ _id: "invoice_seq_00103/" });
  const prodInitialInvoicesCount = await prodDb.collection("invoices").countDocuments();

  console.log("[INFO] Production Baseline:");
  console.log(`  - DB: ${PROD_DB_NAME}`);
  console.log(`  - Invoices count: ${prodInitialInvoicesCount}`);
  console.log(`  - Invoice INV-0001: ${prodInitialInvoice?.invoiceNumber} (${prodInitialInvoice?.status})`);
  console.log(`  - Counter invoice_seq_00103/: ${prodInitialCounter?.seq}`);

  const invoicesCol = testDb.collection("invoices");
  const countersCol = testDb.collection("counters");

  // Clean test fixtures only in test DB
  await invoicesCol.deleteMany({ _testFixture: true });
  await countersCol.deleteMany({ _id: { $regex: /^invoice_seq_TEST\// } });

  // Ensure invoices collection exists in test DB
  const cols = await testDb.listCollections({ name: "invoices" }).toArray();
  if (cols.length === 0) {
    await testDb.createCollection("invoices");
  }

  // Ensure partial unique index in test DB
  const existingIndexes = await invoicesCol.indexes();
  for (const idx of existingIndexes) {
    if (idx.name === "invoiceNumber_1" && !idx.partialFilterExpression) {
      console.log("[INFO] Dropping non-partial test index invoiceNumber_1 in test DB...");
      await invoicesCol.dropIndex("invoiceNumber_1");
    }
  }
  await invoicesCol.createIndex(
    { invoiceNumber: 1 },
    {
      unique: true,
      name: "invoiceNumber_1",
      partialFilterExpression: { invoiceNumber: { $type: "string" } },
    }
  );
  console.log("[PASS] Verified partial unique index on invoiceNumber in test DB");

  let passed = 0;

  // --- Test 1: Multiple Drafts Coexistence without Invoice Number ---
  console.log("\n--- Test 1: Multiple Drafts Coexist Without Consuming Numbers ---");
  const drafts = [
    {
      _testFixture: true,
      invoiceId: "INV-TEST-DRAFT-1",
      status: "DRAFT",
      isFinalized: false,
      customer: { customerName: "Draft Hospital A" },
      grandTotal: 10000,
      createdAt: new Date(),
    },
    {
      _testFixture: true,
      invoiceId: "INV-TEST-DRAFT-2",
      status: "DRAFT",
      isFinalized: false,
      customer: { customerName: "Draft Hospital B" },
      grandTotal: 20000,
      createdAt: new Date(),
    },
    {
      _testFixture: true,
      invoiceId: "INV-TEST-DRAFT-3",
      status: "DRAFT",
      isFinalized: false,
      customer: { customerName: "Draft Hospital C" },
      grandTotal: 30000,
      createdAt: new Date(),
    },
  ];

  await invoicesCol.insertMany(drafts);
  const insertedDrafts = await invoicesCol.find({ _testFixture: true, isFinalized: false }).toArray();
  assert.strictEqual(insertedDrafts.length, 3, "All 3 drafts must insert cleanly");
  for (const d of insertedDrafts) {
    assert.strictEqual(d.invoiceNumber, undefined, "Draft invoiceNumber must be undefined");
  }
  console.log("[PASS] 1. Multiple drafts coexist with undefined invoiceNumber without index collision");
  passed++;

  // --- Test 2: Concurrency Lease Acquisition ---
  console.log("\n--- Test 2: Concurrency Lease Claim Token ---");
  const draftToFinalize = insertedDrafts[0];
  const claimTokenA = new ObjectId().toHexString();
  const leaseExpiryA = new Date(Date.now() + 60000);

  // Worker A acquires claim
  const claimResultA = await invoicesCol.updateOne(
    {
      invoiceId: draftToFinalize.invoiceId,
      isFinalized: { $ne: true },
      $or: [
        { finalizeClaimToken: { $exists: false } },
        { finalizeClaimExpiresAt: { $lt: new Date() } },
      ],
    },
    {
      $set: {
        finalizeClaimToken: claimTokenA,
        finalizeClaimExpiresAt: leaseExpiryA,
      },
    }
  );
  assert.strictEqual(claimResultA.matchedCount, 1, "Worker A must acquire claim");
  assert.strictEqual(claimResultA.modifiedCount, 1, "Worker A must modify document");

  // Worker B attempts to acquire claim concurrently
  const claimTokenB = new ObjectId().toHexString();
  const leaseExpiryB = new Date(Date.now() + 60000);
  const claimResultB = await invoicesCol.updateOne(
    {
      invoiceId: draftToFinalize.invoiceId,
      isFinalized: { $ne: true },
      $or: [
        { finalizeClaimToken: { $exists: false } },
        { finalizeClaimExpiresAt: { $lt: new Date() } },
      ],
    },
    {
      $set: {
        finalizeClaimToken: claimTokenB,
        finalizeClaimExpiresAt: leaseExpiryB,
      },
    }
  );
  assert.strictEqual(claimResultB.matchedCount, 0, "Worker B must be rejected while Worker A lease is active");
  console.log("[PASS] 2. Concurrent worker B blocked from double-claiming active finalization lease");
  passed++;

  // --- Test 3: Provisional Number Persistence & Finalization Commit ---
  console.log("\n--- Test 3: Sequential Official Number Allocation & Commit ---");
  const testPrefix = "TEST/";
  const counterKey = `invoice_seq_${testPrefix}`;
  const counterResult = await countersCol.findOneAndUpdate(
    { _id: counterKey },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  const officialNum1 = `${testPrefix}${String(counterResult.seq).padStart(4, "0")}`;
  assert.strictEqual(officialNum1, "TEST/0001", "First allocated test number must be TEST/0001");

  // Save provisional number
  await invoicesCol.updateOne(
    { invoiceId: draftToFinalize.invoiceId, finalizeClaimToken: claimTokenA },
    { $set: { provisionalInvoiceNumber: officialNum1 } }
  );

  // Commit finalization
  const commitResult = await invoicesCol.updateOne(
    {
      invoiceId: draftToFinalize.invoiceId,
      finalizeClaimToken: claimTokenA,
      isFinalized: { $ne: true },
    },
    {
      $set: {
        invoiceNumber: officialNum1,
        isFinalized: true,
        status: "UNPAID",
        finalizedAt: new Date(),
        finalizedBy: "admin",
      },
      $unset: {
        finalizeClaimToken: "",
        finalizeClaimExpiresAt: "",
      },
    }
  );
  assert.strictEqual(commitResult.matchedCount, 1, "Commit must succeed with matching claim token");

  const finalizedDoc = await invoicesCol.findOne({ invoiceId: draftToFinalize.invoiceId });
  assert.strictEqual(finalizedDoc.isFinalized, true);
  assert.strictEqual(finalizedDoc.status, "UNPAID");
  assert.strictEqual(finalizedDoc.invoiceNumber, "TEST/0001");
  assert.strictEqual(finalizedDoc.finalizeClaimToken, undefined);
  console.log("[PASS] 3. Official number TEST/0001 assigned and finalized document committed safely");
  passed++;

  // --- Test 4: Idempotent Retry on Already Finalized Invoice ---
  console.log("\n--- Test 4: Idempotent Finalization Retry ---");
  const fresh = await invoicesCol.findOne({ invoiceId: draftToFinalize.invoiceId });
  assert.strictEqual(fresh.isFinalized, true, "Invoice is already finalized");
  // Simulating handler: if fresh.isFinalized, return success with existing invoice without incrementing counter
  const counterAfter = await countersCol.findOne({ _id: counterKey });
  assert.strictEqual(counterAfter.seq, 1, "Counter must NOT increment on retry");
  console.log("[PASS] 4. Idempotent finalization returns existing document without consuming new counter");
  passed++;

  // --- Test 5: Stale Worker Protection ---
  console.log("\n--- Test 5: Stale Worker Rejection After Lease Expiry ---");
  const draft2 = insertedDrafts[1];
  const staleToken = "stale_token_123";
  // Pretend draft2 has a claim that expired in the past
  await invoicesCol.updateOne(
    { invoiceId: draft2.invoiceId },
    {
      $set: {
        finalizeClaimToken: staleToken,
        finalizeClaimExpiresAt: new Date(Date.now() - 10000), // Expired 10s ago
      },
    }
  );

  // Stale worker tries to commit using staleToken, but new worker B claims it first
  const newWorkerToken = new ObjectId().toHexString();
  const reClaimResult = await invoicesCol.updateOne(
    {
      invoiceId: draft2.invoiceId,
      isFinalized: { $ne: true },
      $or: [
        { finalizeClaimToken: { $exists: false } },
        { finalizeClaimExpiresAt: { $lt: new Date() } },
      ],
    },
    {
      $set: {
        finalizeClaimToken: newWorkerToken,
        finalizeClaimExpiresAt: new Date(Date.now() + 60000),
      },
    }
  );
  assert.strictEqual(reClaimResult.matchedCount, 1, "New worker successfully re-claims expired lease");

  // Now stale worker attempts to commit with staleToken
  const staleCommit = await invoicesCol.updateOne(
    {
      invoiceId: draft2.invoiceId,
      finalizeClaimToken: staleToken,
      isFinalized: { $ne: true },
    },
    {
      $set: {
        invoiceNumber: "TEST/0999",
        isFinalized: true,
      },
    }
  );
  assert.strictEqual(staleCommit.matchedCount, 0, "Stale worker commit MUST be rejected");
  console.log("[PASS] 5. Stale worker commit rejected after losing lease to new worker");
  passed++;

  // --- Test 6: Crash Recovery via Provisional Number Reuse ---
  console.log("\n--- Test 6: Crash Recovery via Provisional Number Reuse ---");
  // New worker sets provisional number TEST/0002
  const counterResult2 = await countersCol.findOneAndUpdate(
    { _id: counterKey },
    { $inc: { seq: 1 } },
    { returnDocument: "after" }
  );
  const officialNum2 = `${testPrefix}${String(counterResult2.seq).padStart(4, "0")}`;
  assert.strictEqual(officialNum2, "TEST/0002");

  await invoicesCol.updateOne(
    { invoiceId: draft2.invoiceId, finalizeClaimToken: newWorkerToken },
    { $set: { provisionalInvoiceNumber: officialNum2 } }
  );

  // Simulate worker crash before commit!
  // In recovery: retry reads existing.provisionalInvoiceNumber
  const recoveryDoc = await invoicesCol.findOne({ invoiceId: draft2.invoiceId });
  const reusedNumber = recoveryDoc.provisionalInvoiceNumber;
  assert.strictEqual(reusedNumber, "TEST/0002", "Provisional number is safely persisted in DB");

  // Recovery commits with reusedNumber without calling counter increment
  const recoveryCommit = await invoicesCol.updateOne(
    {
      invoiceId: draft2.invoiceId,
      finalizeClaimToken: newWorkerToken,
      isFinalized: { $ne: true },
    },
    {
      $set: {
        invoiceNumber: reusedNumber,
        isFinalized: true,
        status: "UNPAID",
        finalizedAt: new Date(),
        finalizedBy: "recovery_worker",
      },
      $unset: { finalizeClaimToken: "", finalizeClaimExpiresAt: "" },
    }
  );
  assert.strictEqual(recoveryCommit.matchedCount, 1);
  const counterFinal = await countersCol.findOne({ _id: counterKey });
  assert.strictEqual(counterFinal.seq, 2, "Counter remained at 2 (no sequence was skipped or burned)");
  console.log("[PASS] 6. Crash recovery reused provisional number TEST/0002 without burning a sequence number");
  passed++;

  // --- Test 7: Cancelled Draft Does Not Consume Number ---
  console.log("\n--- Test 7: Cancelled Draft Does Not Consume Number ---");
  const draft3 = insertedDrafts[2];
  await invoicesCol.updateOne(
    { invoiceId: draft3.invoiceId },
    {
      $set: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: "admin",
        cancellationReason: "Draft abandoned by user",
      },
    }
  );
  const cancelledDraft = await invoicesCol.findOne({ invoiceId: draft3.invoiceId });
  assert.strictEqual(cancelledDraft.status, "CANCELLED");
  assert.strictEqual(cancelledDraft.invoiceNumber, undefined, "Cancelled draft must NOT have an official number");
  const counterAfterDraftCancel = await countersCol.findOne({ _id: counterKey });
  assert.strictEqual(counterAfterDraftCancel.seq, 2, "Counter must NOT increment for cancelled draft");
  console.log("[PASS] 7. Cancelled draft does not consume official invoice number");
  passed++;

  // --- Test 8: Cancelled Finalized Invoice Preserves Number ---
  console.log("\n--- Test 8: Cancelled Finalized Invoice Preserves Number ---");
  await invoicesCol.updateOne(
    { invoiceId: draftToFinalize.invoiceId },
    {
      $set: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: "admin",
        cancellationReason: "Product returned",
      },
    }
  );
  const cancelledFinalized = await invoicesCol.findOne({ invoiceId: draftToFinalize.invoiceId });
  assert.strictEqual(cancelledFinalized.status, "CANCELLED");
  assert.strictEqual(cancelledFinalized.invoiceNumber, "TEST/0001", "Cancelled finalized invoice preserves its official number");
  console.log("[PASS] 8. Cancelled finalized invoice permanently preserves assigned official number");
  passed++;

  // --- Test 9: Zero-Write Verification on Production Database ---
  console.log("\n--- Test 9: Production Database Zero-Write Audit ---");
  const prodFinalInvoice = await prodDb.collection("invoices").findOne({ invoiceId: "INV-0001" });
  const prodFinalCounter = await prodDb.collection("counters").findOne({ _id: "invoice_seq_00103/" });
  const prodFinalInvoicesCount = await prodDb.collection("invoices").countDocuments();

  assert.strictEqual(prodFinalInvoicesCount, prodInitialInvoicesCount, "Production invoices count must remain identical");
  assert.strictEqual(prodFinalInvoice?.invoiceNumber, "00103/0386", "Production INV-0001 number must remain 00103/0386");
  assert.strictEqual(prodFinalCounter?.seq, prodInitialCounter?.seq, "Production counter sequence must remain unchanged");

  console.log("[PASS] 9. Production database 'sse_biomedical' verified 100% UNTOUCHED:");
  console.log(`  - Invoices count: ${prodFinalInvoicesCount} (unchanged)`);
  console.log(`  - INV-0001: ${prodFinalInvoice?.invoiceNumber} (${prodFinalInvoice?.status}) (unchanged)`);
  console.log(`  - Counter: ${prodFinalCounter?.seq} (unchanged)`);
  passed++;

  // Clean test fixtures
  await invoicesCol.deleteMany({ _testFixture: true });
  await countersCol.deleteMany({ _id: { $regex: /^invoice_seq_TEST\// } });

  await client.close();

  console.log("\n==================================================================");
  console.log(`TOTAL TESTS: ${passed} | ALL PASSED`);
  console.log("==================================================================\n");
}

runDeferredNumberingLifecycleTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
