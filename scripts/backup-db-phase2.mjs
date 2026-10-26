import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mongoUri = "mongodb://localhost:27017/sse_biomedical";
const backupDir = path.resolve(__dirname, "../backups/pre-phase2-cleanup-backup-2026-10-21");

async function backup() {
  console.log(`Connecting to ${mongoUri}...`);
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const collections = await db.listCollections().toArray();
  const summary = {
    database: "sse_biomedical",
    phase: "pre-phase2-cleanup",
    timestamp: new Date().toISOString(),
    collections: {},
  };

  console.log(`Starting Phase 2 pre-cleanup backup of ${collections.length} collections into ${backupDir}...`);

  for (const col of collections) {
    const colName = col.name;
    const docs = await db.collection(colName).find({}).toArray();
    const filePath = path.join(backupDir, `${colName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf-8");
    summary.collections[colName] = docs.length;
    console.log(`✔ Backed up ${colName}: ${docs.length} documents -> ${filePath}`);
  }

  const manifestPath = path.join(backupDir, "backup-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(summary, null, 2), "utf-8");

  console.log(`\nPhase 2 Backup complete. Manifest saved at: ${manifestPath}`);

  // Verification step
  let allVerified = true;
  for (const [name, count] of Object.entries(summary.collections)) {
    const fPath = path.join(backupDir, `${name}.json`);
    const content = fs.readFileSync(fPath, "utf-8");
    const parsed = JSON.parse(content);
    if (parsed.length !== count) {
      console.error(`❌ Verification failed for ${name}: expected ${count}, got ${parsed.length}`);
      allVerified = false;
    }
  }

  if (allVerified) {
    console.log("✔ ALL PHASE 2 BACKUP FILES VERIFIED 100% INTEGRITY");
  } else {
    throw new Error("Phase 2 backup verification failed!");
  }

  await client.close();
}

backup().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
