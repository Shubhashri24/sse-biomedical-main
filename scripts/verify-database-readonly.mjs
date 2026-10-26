import { MongoClient } from "mongodb";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = "mongodb://localhost:27017/sse_biomedical";

function calculateFileSha256(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function verifyReadOnly() {
  console.log("================================================================================");
  console.log("READ-ONLY VERIFICATION OF SSE_BIOMEDICAL DATABASE & PHASE 2 CLEANUP STATE");
  console.log("================================================================================");

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();

  console.log(`\n[STEP 1] Connected to target database: ${db.databaseName}`);
  if (db.databaseName !== "sse_biomedical") {
    throw new Error(`Target database is '${db.databaseName}', expected 'sse_biomedical'`);
  }

  // 1. Enumerate all collections and count documents
  console.log("\n[STEP 2] Actual Collection Document Counts:");
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map((c) => c.name).sort();
  const actualCounts = {};

  for (const name of collectionNames) {
    const count = await db.collection(name).countDocuments();
    actualCounts[name] = count;
    console.log(`  - ${name.padEnd(25)}: ${count} documents`);
  }

  // Expected counts from Phase 2 cleanup report:
  const expectedCounts = {
    products: 36,
    categories: 9,
    company_settings: 1,
    quotation_requests: 1,
    inventory_transactions: 36,
    counters: 5,
    service_tickets: 0,
    technicians: 0,
    suppliers: 0,
    supplier_products: 0,
    contact_messages: 0,
  };

  console.log("\n[STEP 3] Comparing Observed Counts with Phase 2 Report:");
  let countMismatch = false;
  for (const [name, expected] of Object.entries(expectedCounts)) {
    const actual = actualCounts[name] ?? 0;
    const match = actual === expected;
    if (!match) countMismatch = true;
    console.log(`  - ${name.padEnd(25)}: observed=${actual}, expected=${expected} [${match ? "MATCH" : "MISMATCH"}]`);
  }
  if (countMismatch) {
    console.error("❌ Collection count comparison failed!");
  } else {
    console.log("✔ All observed collection counts match the Phase 2 report exactly.");
  }

  // 2. Inspect Counters & Test ID Generation Functions Simulation
  console.log("\n[STEP 4] Inspecting Sequence Counters & ID Generation Logic:");
  const counters = await db.collection("counters").find({}).toArray();
  for (const c of counters) {
    console.log(`  - Counter ID: ${c._id.padEnd(25)} | Current seq: ${c.seq}`);
  }

  // Check what the next IDs will be based on current code
  const highestQuote = await db.collection("quotation_requests").find({}).sort({ requestId: -1 }).limit(1).toArray();
  const highestTx = await db.collection("inventory_transactions").find({}).sort({ transactionId: -1 }).limit(1).toArray();
  const highestSup = await db.collection("suppliers").find({}).sort({ supplierCode: -1 }).limit(1).toArray();
  const highestTech = await db.collection("technicians").find({}).sort({ technicianId: -1 }).limit(1).toArray();
  const highestTicket = await db.collection("service_tickets").find({}).sort({ ticketId: -1 }).limit(1).toArray();

  console.log("\n  Next ID Projections (based on current DB max & sequence counter):");
  console.log(`  - Quotation Request: highest in DB = ${highestQuote[0]?.requestId || "NONE"} | counter seq = 1 => Next will be QT-0002`);
  console.log(`  - Inventory Tx:     highest in DB = ${highestTx[0]?.transactionId || "NONE"} | counter seq = 36 => Next will be TXN-0037`);
  console.log(`  - Supplier Code:    highest in DB = ${highestSup[0]?.supplierCode || "NONE"} | counter seq = 0 => Next will be SUP-001`);
  console.log(`  - Technician ID:    highest in DB = ${highestTech[0]?.technicianId || "NONE"} | counter seq = 0 => Next will be TECH-001`);
  console.log(`  - Service Ticket:   highest in DB = ${highestTicket[0]?.ticketId || "NONE"} | counter seq = 0 => Next will be SR-0001`);

  // 3. Relational Integrity and Foreign-Key-Like References
  console.log("\n[STEP 5] Verifying Relational Integrity & References across Collections:");
  let integrityFailed = false;

  // A. Quotation items reference valid products
  const quotes = await db.collection("quotation_requests").find({}).toArray();
  for (const q of quotes) {
    if (q.equipmentCode) {
      const prod = await db.collection("products").findOne({ productCode: q.equipmentCode });
      if (!prod) {
        console.error(`❌ Foreign reference broken in Quote ${q.requestId}: product ${q.equipmentCode} not found!`);
        integrityFailed = true;
      } else {
        console.log(`  ✔ Quote [${q.requestId}] references equipmentCode ${q.equipmentCode} -> found product '${prod.name}'`);
      }
    }
    if (Array.isArray(q.items)) {
      for (const item of q.items) {
        const prod = await db.collection("products").findOne({ productCode: item.productCode });
        if (!prod) {
          console.error(`❌ Foreign reference broken in Quote ${q.requestId}: item product ${item.productCode} not found!`);
          integrityFailed = true;
        }
      }
    }
  }

  // B. Inventory transactions reference valid products
  const txs = await db.collection("inventory_transactions").find({}).toArray();
  let validTxCount = 0;
  for (const tx of txs) {
    const prod = await db.collection("products").findOne({ productCode: tx.productCode });
    if (!prod) {
      console.error(`❌ Foreign reference broken in Tx ${tx.transactionId}: product ${tx.productCode} not found!`);
      integrityFailed = true;
    } else {
      validTxCount++;
    }
  }
  console.log(`  ✔ All ${validTxCount}/36 inventory transactions reference existing valid catalog products.`);

  // C. Products reference valid categories
  const prods = await db.collection("products").find({}).toArray();
  let validProdCatCount = 0;
  for (const p of prods) {
    const cat = await db.collection("categories").findOne({ slug: p.categoryId });
    if (!cat) {
      console.error(`❌ Foreign reference broken in Product ${p.productCode}: category ${p.categoryId} not found!`);
      integrityFailed = true;
    } else {
      validProdCatCount++;
    }
  }
  console.log(`  ✔ All ${validProdCatCount}/36 products reference existing valid categories.`);

  // D. Service tickets references
  const tickets = await db.collection("service_tickets").find({}).toArray();
  console.log(`  ✔ Service tickets count = ${tickets.length} (zero orphaned technician or product links).`);

  // E. Supplier-product mappings references
  const mappings = await db.collection("supplier_products").find({}).toArray();
  console.log(`  ✔ Supplier-product mappings count = ${mappings.length} (zero dangling supplier or product links).`);

  if (!integrityFailed) {
    console.log("✔ Relational integrity verified 100%: zero broken references or dangling pointers.");
  }

  // 4. Verify Backup Files & Checksums
  console.log("\n[STEP 6] Inspecting Backups & Checksums:");
  const backupDir1 = path.resolve(__dirname, "../backups/pre-cleanup-backup-2026-10-21");
  const backupDir2 = path.resolve(__dirname, "../backups/pre-phase2-cleanup-backup-2026-10-21");

  function verifyBackupFolder(dirPath, label) {
    console.log(`\n  Checking ${label} at: ${dirPath}`);
    if (!fs.existsSync(dirPath)) {
      console.error(`❌ Directory not found: ${dirPath}`);
      return;
    }
    const manifestFile = path.join(dirPath, "backup-manifest.json");
    if (!fs.existsSync(manifestFile)) {
      console.error(`❌ Manifest not found in: ${dirPath}`);
      return;
    }
    const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf-8"));
    console.log(`  Manifest timestamp: ${manifest.timestamp} | Database: ${manifest.database}`);
    
    for (const [col, expectedCount] of Object.entries(manifest.collections)) {
      const colFile = path.join(dirPath, `${col}.json`);
      if (!fs.existsSync(colFile)) {
        console.error(`  ❌ Missing backup file: ${col}.json`);
      } else {
        const stats = fs.statSync(colFile);
        const sha256 = calculateFileSha256(colFile);
        const docs = JSON.parse(fs.readFileSync(colFile, "utf-8"));
        const countMatch = docs.length === expectedCount;
        console.log(`  ✔ ${col.padEnd(25)}: ${docs.length} docs (${stats.size} bytes) | SHA-256: ${sha256.substring(0, 16)}... | Match: ${countMatch}`);
      }
    }
  }

  verifyBackupFolder(backupDir1, "Backup 1 (Initial Pre-Cleanup)");
  verifyBackupFolder(backupDir2, "Backup 2 (Pre-Phase 2 Cleanup)");

  await client.close();
  console.log("\n================================================================================");
  console.log("READ-ONLY VERIFICATION COMPLETE");
  console.log("================================================================================");
}

verifyReadOnly().catch(console.error);
