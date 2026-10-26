import { MongoClient, Db, Collection, ObjectId } from "mongodb";

export type QuotationStatus =
  | "NEW"
  | "REVIEWING"
  | "CONTACTED"
  | "QUOTATION_PREPARATION"
  | "QUOTATION_SENT"
  | "NEGOTIATION"
  | "APPROVED"
  | "REJECTED"
  | "CLOSED";

export interface QuotationReply {
  message: string;
  sentAt: Date;
  sentBy: string;
}

export interface QuotationTimelineEntry {
  action: string;
  status?: QuotationStatus;
  note?: string;
  timestamp: Date;
  performedBy: string;
}

export interface QuotationInternalNote {
  id: string;
  note: string;
  createdAt: Date;
  createdBy: string;
}

export interface QuotationItem {
  productId?: string;
  productCode: string;
  equipmentName: string;
  quantity: number;
  category?: string;
}

export type DiscountType = "PERCENT" | "FIXED";

export interface QuotationCommercialItem {
  productId?: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountType: DiscountType; // "PERCENT" or "FIXED"
  discountValue: number;      // percentage (e.g. 12) or fixed amount in INR (e.g. 21600)
  discountAmount: number;     // calculated total discount in INR
  taxableAmount: number;      // (quantity * unitPrice) - discountAmount
  gstRate: number;            // e.g. 0, 5, 12, 18, 28
  gstAmount: number;          // taxableAmount * gstRate / 100
  totalAmount: number;        // taxableAmount + gstAmount
}

export interface CustomerBillingDetails {
  customerName: string;
  organizationName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  email: string;
  phone: string;
}

export interface QuotationEmailRecord {
  sentAt: Date;
  sentBy: string;
  recipientEmail: string;
  pdfFilename: string;
  messageId?: string;
  status: "SENT" | "FAILED";
  error?: string;
}

export interface InvoiceEmailRecord {
  sentAt: Date;
  sentBy: string;
  recipientEmail: string;
  pdfFilename: string;
  messageId?: string;
  status: "SENT" | "FAILED";
  error?: string;
}

export interface CommercialQuotation {
  quotationNumber: string; // e.g. "QT-0007"
  version: number;
  status: "DRAFT" | "FINALIZED";
  date: Date;
  validUntil: Date;
  billingDetails: CustomerBillingDetails;
  items: QuotationCommercialItem[];
  currency: string; // "INR"
  subtotal: number; // Gross total before discounts
  totalDiscount: number; // Total discount across all items
  taxableAmount: number; // Total taxable value
  totalTax: number; // Total GST
  grandTotal: number; // Final payable amount
  terms: string[];
  notes?: string; // customer-facing remarks/payment details
  finalizedAt?: Date | null;
  finalizedBy?: string;
  pdfGeneratedAt?: Date | null;
  pdfFilename?: string;
  emailHistory?: QuotationEmailRecord[];
  lastEmailStatus?: "SENT" | "FAILED" | "NOT_SENT";
}

export interface QuotationRequestDoc {
  _id?: ObjectId;
  requestId: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  facility?: string;
  category: string;
  equipment: string;
  equipmentCode?: string;
  quantity: number;
  items?: QuotationItem[];
  message?: string;
  status: QuotationStatus;
  adminReply?: string;
  replyHistory?: QuotationReply[];
  notes?: QuotationInternalNote[];
  timeline?: QuotationTimelineEntry[];
  commercialQuote?: CommercialQuotation;
  createdAt: Date;
  updatedAt: Date;
  repliedAt?: Date | null;
}

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface ProductDoc {
  _id?: ObjectId;
  productCode: string; // e.g. MON-01
  name: string;
  slug: string;
  categoryId: string; // category slug, e.g. "patient-monitoring"
  categoryName: string;
  shortDescription: string;
  description: string;
  specifications: string;
  manufacturer: string;
  model: string;
  availability: "In Stock" | "Available on Order" | "Procurement on Request";
  image: string;
  featured: boolean;
  isActive: boolean;
  application?: string;
  selectionNote?: string;
  // Inventory fields
  stockQuantity?: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  reorderLevel?: number;
  stockStatus?: StockStatus;
  lastStockUpdate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type InventoryTransactionType =
  | "STOCK_IN"
  | "STOCK_OUT"
  | "ADJUSTMENT"
  | "RESERVED"
  | "RELEASED";

export interface InventoryTransactionDoc {
  _id?: ObjectId;
  transactionId: string; // e.g. TXN-0001
  productId?: ObjectId | string;
  productCode: string;
  equipmentName: string;
  type: InventoryTransactionType;
  quantity: number;
  previousStock: number;
  newStock: number;
  previousReserved?: number;
  newReserved?: number;
  reason: string;
  createdBy: string;
  createdAt: Date;
}

export type SupplierType =
  | "Manufacturer"
  | "Authorized Distributor"
  | "Dealer"
  | "Importer"
  | "Service Provider"
  | "Other";

export type BusinessRegistrationType =
  | "Proprietorship"
  | "Partnership"
  | "LLP"
  | "Private Limited"
  | "Public Limited"
  | "Other";

export type GstRegistrationStatus =
  | "Registered"
  | "Unregistered"
  | "Composition Scheme"
  | "Not Applicable";

export type SupplierPaymentTerms =
  | "Advance"
  | "Immediate"
  | "Net 15"
  | "Net 30"
  | "Net 45"
  | "Net 60"
  | "Custom";

export type SupplierStatus =
  | "Active"
  | "Inactive"
  | "Suspended"
  | "Pending Approval";

export type SupplierBankVerificationStatus =
  | "Unverified"
  | "Pending Verification"
  | "Verified"
  | "Rejected";

export interface SupplierAddressInfo {
  streetAddress?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  country?: string;
}

export interface SupplierBankingDetails {
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  accountType?: "Current" | "Savings" | "Other" | string;
  paymentTerms?: SupplierPaymentTerms | string;
  customPaymentTerms?: string;
  creditLimit?: number;
  currency?: string; // default "INR"
  upiId?: string;
  verificationStatus?: SupplierBankVerificationStatus;
  verifiedAt?: Date | null;
  verifiedBy?: string;
}

export interface SupplierDocumentReference {
  id: string; // e.g. DOC-1
  documentType: string;
  documentReferenceNumber: string;
  documentName?: string;
  issueDate?: Date | null;
  expiryDate?: Date | null;
  verificationStatus: "Pending" | "Verified" | "Expired" | "Rejected";
  reviewNotes?: string;
  submittedAt: Date;
}

export interface SupplierDoc {
  _id?: ObjectId;
  supplierCode: string; // e.g. SUP-001
  
  // Section A — Company & Business Information
  companyName: string;
  supplierType?: SupplierType | string;
  businessRegistrationType?: BusinessRegistrationType | string;
  yearEstablished?: number | string;
  website?: string;
  companyDescription?: string;
  employeeCount?: string;
  panNumber?: string;
  gstRegistrationStatus?: GstRegistrationStatus | string;
  gstNumber?: string;
  cinNumber?: string;
  msmeNumber?: string;
  iecCode?: string;

  // Section B — Contact Information
  contactPerson: string;
  designation?: string;
  email: string;
  alternateEmail?: string;
  phone: string;
  alternatePhone?: string;
  accountsBillingEmail?: string;

  // Section C — Registered Address & Location
  address?: string; // legacy primary
  streetAddress?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  country?: string;
  registeredOfficeAddress?: SupplierAddressInfo;
  billingAddress?: SupplierAddressInfo;
  shippingAddress?: SupplierAddressInfo;
  billingSameAsRegistered?: boolean;
  shippingSameAsRegistered?: boolean;

  // Section D — Banking & Payment Details
  bankingDetails?: SupplierBankingDetails;

  // Section E — Biomedical Product & Service Specialization
  productCategories?: string[];
  brandsRepresented?: string[];
  equipmentModels?: string;
  isAuthorizedDistributor?: boolean;
  manufacturerAuthorizationDetails?: string;
  geographicServiceCoverage?: string;
  statesServed?: string[];
  hasInstallationSupport?: boolean;
  hasWarrantySupport?: boolean;
  hasAfterSalesService?: boolean;
  typicalLeadTimeDays?: number | string;
  minimumOrderValue?: number;

  // Section F — Compliance & Documents
  documents?: SupplierDocumentReference[];

  // Section G — Procurement & Internal Notes
  notes?: string;
  agreedCommercialTerms?: string;
  warrantyReturnPolicy?: string;
  deliveryInstallationTerms?: string;
  isPreferredSupplier?: boolean;
  supplierRating?: number; // 1 to 5
  internalRiskReviewNotes?: string;
  supplierStatus?: SupplierStatus | string;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierProductMappingDoc {
  _id?: ObjectId;
  supplierId: string | ObjectId;
  supplierCode: string;
  supplierName: string;
  productId: string | ObjectId;
  productCode: string;
  productName: string;
  supplierProductCode?: string;
  leadTimeDays?: number;
  lastPurchasePrice?: number;
  minimumOrderQuantity?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TechnicianDoc {
  _id?: ObjectId;
  technicianId: string; // e.g. TECH-001
  name: string;
  email: string;
  phone: string;
  specialization: string;
  availability: "AVAILABLE" | "ON_CALL" | "ON_LEAVE" | "BUSY";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ServiceTicketPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ServiceTicketStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING_FOR_PARTS"
  | "RESOLVED"
  | "CLOSED";

export type InstallationStatus =
  | "PENDING"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED";

export interface ServiceTicketDoc {
  _id?: ObjectId;
  ticketId: string; // e.g. SR-0001
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  facility?: string;

  productId?: string | ObjectId;
  productCode: string;
  equipmentName: string;
  serialNumber: string;

  issueTitle: string;
  issueDescription: string;

  priority: ServiceTicketPriority;
  status: ServiceTicketStatus;

  assignedTechnicianId?: string;
  assignedTechnicianName?: string;

  scheduledDate?: Date | string | null;
  completedDate?: Date | string | null;

  diagnosis?: string;
  resolution?: string;
  partsUsed?: string;

  // Installation support
  installationRequired?: boolean;
  installationDate?: Date | string | null;
  installationTechnician?: string;
  installationNotes?: string;
  installationStatus?: InstallationStatus;

  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryDoc {
  _id?: ObjectId;
  name: string;
  slug: string;
  description: string; // tagline
  image?: string;
  accent?: string;
  code: string; // e.g. "MON"
  number: string; // e.g. "01"
  totalCount?: number;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ContactMessageStatus = "NEW" | "READ" | "RESPONDED" | "CLOSED";

export interface ContactMessageDoc {
  _id?: ObjectId;
  name: string;
  email: string;
  phone: string;
  subject?: string;
  message: string;
  status: ContactMessageStatus;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const QUOTATION_COLLECTION = "quotation_requests";
export const PRODUCTS_COLLECTION = "products";
export const CATEGORIES_COLLECTION = "categories";
export const CONTACT_MESSAGES_COLLECTION = "contact_messages";
export const INVENTORY_TRANSACTIONS_COLLECTION = "inventory_transactions";
export const SUPPLIERS_COLLECTION = "suppliers";
export const SUPPLIER_PRODUCTS_COLLECTION = "supplier_products";
export const TECHNICIANS_COLLECTION = "technicians";
export const SERVICE_TICKETS_COLLECTION = "service_tickets";
export const INVOICES_COLLECTION = "invoices";
export const COUNTERS_COLLECTION = "counters";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | null = null;

export function getMongoClientPromise(): Promise<MongoClient> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI environment variable is not defined. Please set it in .env.local"
    );
  }

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so the client is preserved across module reloads
    if (!global._mongoClientPromise) {
      const client = new MongoClient(mongoUri);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    // In production mode, avoid global variables
    if (!clientPromise) {
      const client = new MongoClient(mongoUri);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export async function getDatabase(targetDbName?: string): Promise<Db> {
  const client = await getMongoClientPromise();

  // 1. If explicit dbName provided, use it
  if (targetDbName && targetDbName.trim()) {
    return client.db(targetDbName.trim());
  }

  // 2. If environment specifies dedicated test or override db name
  if (process.env.MONGODB_DB_NAME && process.env.MONGODB_DB_NAME.trim()) {
    return client.db(process.env.MONGODB_DB_NAME.trim());
  }

  // 3. If NODE_ENV is "test", default to dedicated test database
  if (process.env.NODE_ENV === "test") {
    return client.db("sse_biomedical_test");
  }

  // 4. In Next.js request context, check for test isolation header
  try {
    const { headers } = await import("next/headers");
    const headerList = await headers();
    const testHeader = headerList.get("x-sse-test-database");
    if (testHeader && testHeader.trim()) {
      return client.db(testHeader.trim());
    }
  } catch {
    // Outside Next.js request context (e.g. background job, CLI scripts)
  }

  return client.db();
}

export async function getQuotationsCollection(): Promise<Collection<QuotationRequestDoc>> {
  const db = await getDatabase();
  return db.collection<QuotationRequestDoc>(QUOTATION_COLLECTION);
}

export async function getProductsCollection(): Promise<Collection<ProductDoc>> {
  const db = await getDatabase();
  return db.collection<ProductDoc>(PRODUCTS_COLLECTION);
}

export async function getCategoriesCollection(): Promise<Collection<CategoryDoc>> {
  const db = await getDatabase();
  return db.collection<CategoryDoc>(CATEGORIES_COLLECTION);
}

export async function getContactMessagesCollection(): Promise<Collection<ContactMessageDoc>> {
  const db = await getDatabase();
  return db.collection<ContactMessageDoc>(CONTACT_MESSAGES_COLLECTION);
}

export async function getInventoryTransactionsCollection(): Promise<Collection<InventoryTransactionDoc>> {
  const db = await getDatabase();
  return db.collection<InventoryTransactionDoc>(INVENTORY_TRANSACTIONS_COLLECTION);
}

export async function getSuppliersCollection(): Promise<Collection<SupplierDoc>> {
  const db = await getDatabase();
  return db.collection<SupplierDoc>(SUPPLIERS_COLLECTION);
}

export async function getSupplierProductsCollection(): Promise<Collection<SupplierProductMappingDoc>> {
  const db = await getDatabase();
  return db.collection<SupplierProductMappingDoc>(SUPPLIER_PRODUCTS_COLLECTION);
}

export async function getTechniciansCollection(): Promise<Collection<TechnicianDoc>> {
  const db = await getDatabase();
  return db.collection<TechnicianDoc>(TECHNICIANS_COLLECTION);
}

export async function getServiceTicketsCollection(): Promise<Collection<ServiceTicketDoc>> {
  const db = await getDatabase();
  return db.collection<ServiceTicketDoc>(SERVICE_TICKETS_COLLECTION);
}

export interface CompanyQuotationSettingsDoc {
  _id: string;
  companyName: string;
  contactPerson: string;
  address: string;
  phone: string;
  email: string;
  gstNumber?: string;
  website?: string;
  defaultTerms: string[];
  defaultValidityDays: number;
  // Invoice & Bank configurations
  state?: string;
  stateCode?: string;
  bankName?: string;
  accountNumber?: string;
  branchAndIfsc?: string;
  accountHolderName?: string;
  accountType?: string;
  ifscCode?: string;
  branchName?: string;
  branchAddress?: string;
  isBankVerified?: boolean;
  bankVerifiedAt?: Date | null;
  bankVerifiedBy?: string;
  invoicePrefix?: string;
  invoiceNumberFormat?: string;
  defaultDeclaration?: string;
  signatoryTitle?: string;
  signatureImageUrl?: string;
  updatedAt: Date;
}

export type CompanyQuotationSettings = Omit<CompanyQuotationSettingsDoc, "_id" | "updatedAt">;

export const DEFAULT_COMPANY_SETTINGS: CompanyQuotationSettings = {
  companyName: "Shree Shyam Electronics",
  contactPerson: "Amol Agrawal",
  address: "10, Apna Ghar Colony, Near Raymond Colony, M.I.D.C. Jalgaon",
  phone: "8275290643",
  email: "lokeshpurya@gmail.com",
  gstNumber: "",
  website: "",
  defaultTerms: [
    "warranty one year",
    "fitting installation extra",
    "payment 50% advance on request",
    "delivery transport charges extra",
  ],
  defaultValidityDays: 30,
  // Regional & numbering configurations (bank details remain unconfigured until confirmed by owner)
  state: "Maharashtra",
  stateCode: "27",
  bankName: "",
  accountNumber: "",
  branchAndIfsc: "",
  accountHolderName: "",
  accountType: "Current Account",
  ifscCode: "",
  branchName: "",
  branchAddress: "",
  isBankVerified: false,
  invoicePrefix: "00103/",
  invoiceNumberFormat: "00103/XXXX",
  defaultDeclaration: "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
  signatoryTitle: "Authorised Signatory",
};

export const COMPANY_SETTINGS_COLLECTION = "company_settings";

export async function getCompanySettingsCollection(): Promise<Collection<CompanyQuotationSettingsDoc>> {
  const db = await getDatabase();
  return db.collection<CompanyQuotationSettingsDoc>(COMPANY_SETTINGS_COLLECTION);
}

export async function getCompanySettings(): Promise<CompanyQuotationSettings> {
  try {
    const col = await getCompanySettingsCollection();
    const doc = await col.findOne({ _id: "company_quotation_settings" });
    if (doc) {
      return {
        companyName: doc.companyName || DEFAULT_COMPANY_SETTINGS.companyName,
        contactPerson: doc.contactPerson || DEFAULT_COMPANY_SETTINGS.contactPerson,
        address: doc.address || DEFAULT_COMPANY_SETTINGS.address,
        phone: doc.phone || DEFAULT_COMPANY_SETTINGS.phone,
        email: doc.email || DEFAULT_COMPANY_SETTINGS.email,
        gstNumber: doc.gstNumber ?? "",
        website: doc.website ?? "",
        defaultTerms: Array.isArray(doc.defaultTerms) && doc.defaultTerms.length > 0 ? doc.defaultTerms : DEFAULT_COMPANY_SETTINGS.defaultTerms,
        defaultValidityDays: doc.defaultValidityDays || DEFAULT_COMPANY_SETTINGS.defaultValidityDays,
        state: doc.state ?? DEFAULT_COMPANY_SETTINGS.state,
        stateCode: doc.stateCode ?? DEFAULT_COMPANY_SETTINGS.stateCode,
        bankName: doc.bankName || "",
        accountNumber: doc.accountNumber || "",
        branchAndIfsc: doc.branchAndIfsc || "",
        accountHolderName: doc.accountHolderName || "",
        accountType: doc.accountType || DEFAULT_COMPANY_SETTINGS.accountType,
        ifscCode: doc.ifscCode || "",
        branchName: doc.branchName || "",
        branchAddress: doc.branchAddress || "",
        isBankVerified: Boolean(doc.isBankVerified),
        bankVerifiedAt: doc.bankVerifiedAt || null,
        bankVerifiedBy: doc.bankVerifiedBy || "",
        invoicePrefix: doc.invoicePrefix ?? DEFAULT_COMPANY_SETTINGS.invoicePrefix,
        invoiceNumberFormat: doc.invoiceNumberFormat ?? DEFAULT_COMPANY_SETTINGS.invoiceNumberFormat,
        defaultDeclaration: doc.defaultDeclaration ?? DEFAULT_COMPANY_SETTINGS.defaultDeclaration,
        signatoryTitle: doc.signatoryTitle ?? DEFAULT_COMPANY_SETTINGS.signatoryTitle,
        signatureImageUrl: doc.signatureImageUrl,
      };
    }
  } catch (err) {
    console.error("Error fetching company settings, using defaults:", err);
  }
  return DEFAULT_COMPANY_SETTINGS;
}

export async function updateCompanySettings(settings: Partial<CompanyQuotationSettings>): Promise<CompanyQuotationSettings> {
  const col = await getCompanySettingsCollection();
  const current = await getCompanySettings();
  const merged: CompanyQuotationSettings = {
    ...current,
    ...settings,
  };
  await col.updateOne(
    { _id: "company_quotation_settings" },
    {
      $set: {
        ...merged,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  return merged;
}

// =========================================================================
// INVOICE TYPES & MODELS
// =========================================================================

export type InvoiceStatus = "DRAFT" | "UNPAID" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";

export interface InvoicePaymentRecord {
  id: string; // e.g. "PAY-20261022-001"
  amount: number;
  paymentDate: Date;
  paymentMethod: "Bank Transfer" | "NEFT/RTGS" | "UPI" | "Cheque" | "Cash" | "Credit Card" | "Other";
  referenceNumber?: string;
  notes?: string;
  recordedAt: Date;
  recordedBy: string;
}

export interface InvoiceItemDoc {
  productId?: string;
  productCode?: string;
  description: string;
  detailedDescription?: string;
  quantity: number;
  unit: string; // e.g. "Qty"
  rate: number;
  discount?: number;
  taxRate?: number;
  taxableAmount: number;
  taxAmount: number;
  amount: number; // line total
}

export interface CustomerInvoiceSnapshot {
  customerName: string;
  facilityName?: string;
  billingAddress?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pinCode?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  customerReference?: string;
}

export interface CompanyInvoiceSnapshot {
  companyName: string;
  address: string;
  state: string;
  stateCode: string;
  phone: string;
  email: string;
  gstin?: string;
  bankName?: string;
  accountNumber?: string;
  branchAndIfsc?: string;
  accountHolderName?: string;
  accountType?: string;
  ifscCode?: string;
  branchName?: string;
  branchAddress?: string;
  isBankVerified?: boolean;
  declaration?: string;
  signatoryTitle?: string;
}

export interface InvoiceDoc {
  _id?: ObjectId;
  invoiceId: string; // internal unique reference e.g. "INV-0001"
  invoiceNumber?: string; // external business number e.g. "00103/0386" (allocated upon finalization)
  provisionalInvoiceNumber?: string;
  finalizeClaimToken?: string;
  finalizeClaimExpiresAt?: Date;
  status: InvoiceStatus;
  invoiceDate: Date;
  dueDate?: Date | null;
  poNumber?: string;
  quotationReference?: string; // e.g. "QT-0001"
  customer: CustomerInvoiceSnapshot;
  company: CompanyInvoiceSnapshot;
  items: InvoiceItemDoc[];
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxType: "INTRA_STATE" | "INTER_STATE" | "NONE";
  additionalCharges: number;
  additionalChargesNote?: string;
  roundOff: number;
  grandTotal: number;
  totalQuantity: number;
  amountInWords: string;
  paymentRecords: InvoicePaymentRecord[];
  amountPaid: number;
  balanceDue: number;
  notes?: string;
  isFinalized: boolean;
  finalizedAt?: Date | null;
  finalizedBy?: string;
  cancelledAt?: Date | null;
  cancelledBy?: string;
  cancellationReason?: string;
  pdfGeneratedAt?: Date | null;
  stockDeducted?: boolean;
  emailHistory?: InvoiceEmailRecord[];
  lastEmailStatus?: "SENT" | "FAILED" | "NOT_SENT";
  lastEmailedAt?: Date | null;
  emailDispatchLock?: string;
  emailDispatchLockExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

let invoiceIndexesPromise: Promise<void> | null = null;

/**
 * Ensure unique MongoDB indexes for invoices collection.
 * Creates unique indexes on `invoiceNumber` and `invoiceId`.
 */
export async function ensureInvoiceIndexes(dbInstance?: Db): Promise<void> {
  try {
    const db = dbInstance || await getDatabase();
    const col = db.collection<InvoiceDoc>(INVOICES_COLLECTION);

    if (db.databaseName === "sse_biomedical_test") {
      const existingIndexes = await col.indexes().catch(() => []);
      if (existingIndexes.some((i) => i.name === "invoiceNumber_1" && !i.partialFilterExpression)) {
        await col.dropIndex("invoiceNumber_1").catch(() => {});
      }
      await col.createIndex(
        { invoiceNumber: 1 },
        {
          unique: true,
          partialFilterExpression: { invoiceNumber: { $type: "string" } },
          name: "invoiceNumber_1_partial",
        }
      ).catch(() => {});
    } else {
      await col.createIndex({ invoiceNumber: 1 }, { unique: true }).catch((err) => {
        console.warn("[MongoDB] Handled invoiceNumber index notice:", err?.message || err);
      });
    }

    await col.createIndex({ invoiceId: 1 }, { unique: true }).catch((err) => {
      console.warn("[MongoDB] Handled invoiceId index notice:", err?.message || err);
    });
  } catch (err) {
    console.warn("[MongoDB] Handled invoice index creation notice:", err);
  }
}

export async function getInvoicesCollection(): Promise<Collection<InvoiceDoc>> {
  const db = await getDatabase();
  if (!invoiceIndexesPromise) {
    invoiceIndexesPromise = ensureInvoiceIndexes(db).catch((err) => {
      console.error("[MongoDB] Failed to ensure invoice indexes:", err);
      invoiceIndexesPromise = null;
    });
  }
  await invoiceIndexesPromise;
  return db.collection<InvoiceDoc>(INVOICES_COLLECTION);
}

/**
 * Generate human-readable sequential Invoice Number (e.g. 00103/0386, 00103/0387)
 * Safe against race conditions and duplicates using atomic MongoDB counters.
 */
export async function generateNextInvoiceNumber(prefixOverride?: string): Promise<string> {
  const db = await getDatabase();
  const settings = await getCompanySettings();
  const prefix = prefixOverride !== undefined ? prefixOverride : (settings.invoicePrefix || "00103/");

  const counters = db.collection(COUNTERS_COLLECTION);
  
  // Find highest existing invoice number matching the prefix
  const invCol = db.collection(INVOICES_COLLECTION);
  const existingInvoices = await invCol.find({
    invoiceNumber: { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` }
  }).sort({ invoiceNumber: -1 }).limit(10).toArray();

  let highestSeq = 385; // Default starts at 386 if none exists yet, matching sample 00103/0386
  for (const inv of existingInvoices) {
    if (inv.invoiceNumber && inv.invoiceNumber.startsWith(prefix)) {
      const numPart = inv.invoiceNumber.substring(prefix.length);
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > highestSeq) {
        highestSeq = parsed;
      }
    }
  }

  const counterKey = `invoice_seq_${prefix}`;

  // Step 1: Ensure counter document exists with at least highestSeq
  await counters.updateOne(
    { _id: counterKey as unknown as ObjectId },
    { $setOnInsert: { seq: highestSeq } },
    { upsert: true }
  );

  // Step 2: Ensure existing counter is not behind highestSeq
  await counters.updateOne(
    { _id: counterKey as unknown as ObjectId, seq: { $lt: highestSeq } },
    { $set: { seq: highestSeq } }
  );

  // Step 3: Atomically increment and return the newly allocated sequence
  const result = await counters.findOneAndUpdate(
    { _id: counterKey as unknown as ObjectId },
    { $inc: { seq: 1 } },
    { returnDocument: "after" }
  );

  if (!result || typeof result.seq !== "number") {
    throw new Error(`Failed to allocate sequential invoice number for counter: ${counterKey}`);
  }

  return `${prefix}${String(result.seq).padStart(4, "0")}`;
}

/**
 * Generate internal sequential invoice ID (e.g. INV-0001, INV-0002)
 */
export async function generateNextInternalInvoiceId(): Promise<string> {
  const db = await getDatabase();
  const counters = db.collection(COUNTERS_COLLECTION);
  const result = await counters.findOneAndUpdate(
    { _id: "invoice_internal_id" as unknown as ObjectId },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  if (!result || typeof result.seq !== "number") {
    throw new Error("Failed to allocate internal invoice ID");
  }
  return `INV-${String(result.seq).padStart(4, "0")}`;
}

/**
 * Generate human-readable sequential Request ID (e.g. QT-0001, QT-0002)
 */
export async function generateNextRequestId(): Promise<string> {
  try {
    const db = await getDatabase();
    const quoteCol = db.collection(QUOTATION_COLLECTION);
    const highestQuote = await quoteCol.find({}).sort({ requestId: -1 }).limit(1).toArray();
    let highestSeq = 0;
    if (highestQuote.length > 0 && highestQuote[0].requestId) {
      const match = highestQuote[0].requestId.match(/QT-(\d+)/);
      if (match) highestSeq = parseInt(match[1], 10);
    }

    const counters = db.collection(COUNTERS_COLLECTION);
    const result = await counters.findOneAndUpdate(
      { _id: "quotation_requestId" as unknown as ObjectId },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );

    let seq = result && typeof result.seq === "number" ? result.seq : 1;
    if (seq <= highestSeq) {
      seq = highestSeq + 1;
      await counters.updateOne(
        { _id: "quotation_requestId" as unknown as ObjectId },
        { $set: { seq } }
      );
    }
    return `QT-${String(seq).padStart(4, "0")}`;
  } catch (err) {
    // Fallback if atomic counter fails (e.g., initial indexing or permissions)
    console.error("Failed to fetch atomic counter, using fallback sequence:", err);
    try {
      const collection = await getQuotationsCollection();
      const count = await collection.countDocuments();
      return `QT-${String(count + 1).padStart(4, "0")}`;
    } catch {
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      return `QT-${randomSeq}`;
    }
  }
}

export async function generateNextTransactionId(): Promise<string> {
  try {
    const db = await getDatabase();
    const txCol = db.collection(INVENTORY_TRANSACTIONS_COLLECTION);
    const highestTx = await txCol.find({}).sort({ transactionId: -1 }).limit(1).toArray();
    let highestSeq = 0;
    if (highestTx.length > 0 && highestTx[0].transactionId) {
      const match = highestTx[0].transactionId.match(/TXN-(\d+)/);
      if (match) highestSeq = parseInt(match[1], 10);
    }

    const counters = db.collection(COUNTERS_COLLECTION);
    const result = await counters.findOneAndUpdate(
      { _id: "inventory_transactionId" as unknown as ObjectId },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );
    let seq = result && typeof result.seq === "number" ? result.seq : 1;
    if (seq <= highestSeq) {
      seq = highestSeq + 1;
      await counters.updateOne(
        { _id: "inventory_transactionId" as unknown as ObjectId },
        { $set: { seq } }
      );
    }
    return `TXN-${String(seq).padStart(4, "0")}`;
  } catch {
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    return `TXN-${randomSeq}`;
  }
}

export async function generateNextSupplierCode(): Promise<string> {
  try {
    const db = await getDatabase();
    const supCol = db.collection(SUPPLIERS_COLLECTION);
    const highestSup = await supCol.find({}).sort({ supplierCode: -1 }).limit(1).toArray();
    let highestSeq = 0;
    if (highestSup.length > 0 && highestSup[0].supplierCode) {
      const match = highestSup[0].supplierCode.match(/SUP-(\d+)/);
      if (match) highestSeq = parseInt(match[1], 10);
    }

    const counters = db.collection(COUNTERS_COLLECTION);
    const result = await counters.findOneAndUpdate(
      { _id: "supplier_code" as unknown as ObjectId },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );
    let seq = result && typeof result.seq === "number" ? result.seq : 1;
    if (seq <= highestSeq) {
      seq = highestSeq + 1;
      await counters.updateOne(
        { _id: "supplier_code" as unknown as ObjectId },
        { $set: { seq } }
      );
    }
    return `SUP-${String(seq).padStart(3, "0")}`;
  } catch {
    const randomSeq = Math.floor(100 + Math.random() * 900);
    return `SUP-${randomSeq}`;
  }
}

export async function generateNextTechnicianId(): Promise<string> {
  try {
    const db = await getDatabase();
    const techCol = db.collection(TECHNICIANS_COLLECTION);
    const highestTech = await techCol.find({}).sort({ technicianId: -1 }).limit(1).toArray();
    let highestSeq = 0;
    if (highestTech.length > 0 && highestTech[0].technicianId) {
      const match = highestTech[0].technicianId.match(/TECH-(\d+)/);
      if (match) highestSeq = parseInt(match[1], 10);
    }

    const counters = db.collection(COUNTERS_COLLECTION);
    const result = await counters.findOneAndUpdate(
      { _id: "technician_id" as unknown as ObjectId },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );
    let seq = result && typeof result.seq === "number" ? result.seq : 1;
    if (seq <= highestSeq) {
      seq = highestSeq + 1;
      await counters.updateOne(
        { _id: "technician_id" as unknown as ObjectId },
        { $set: { seq } }
      );
    }
    return `TECH-${String(seq).padStart(3, "0")}`;
  } catch {
    const randomSeq = Math.floor(100 + Math.random() * 900);
    return `TECH-${randomSeq}`;
  }
}

export async function generateNextServiceTicketId(): Promise<string> {
  try {
    const db = await getDatabase();
    const srvCol = db.collection(SERVICE_TICKETS_COLLECTION);
    const highestTicket = await srvCol.find({}).sort({ ticketId: -1 }).limit(1).toArray();
    let highestSeq = 0;
    if (highestTicket.length > 0 && highestTicket[0].ticketId) {
      const match = highestTicket[0].ticketId.match(/SR-(\d+)/);
      if (match) highestSeq = parseInt(match[1], 10);
    }

    const counters = db.collection(COUNTERS_COLLECTION);
    const result = await counters.findOneAndUpdate(
      { _id: "service_ticketId" as unknown as ObjectId },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );
    let seq = result && typeof result.seq === "number" ? result.seq : 1;
    if (seq <= highestSeq) {
      seq = highestSeq + 1;
      await counters.updateOne(
        { _id: "service_ticketId" as unknown as ObjectId },
        { $set: { seq } }
      );
    }
    return `SR-${String(seq).padStart(4, "0")}`;
  } catch {
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    return `SR-${randomSeq}`;
  }
}

