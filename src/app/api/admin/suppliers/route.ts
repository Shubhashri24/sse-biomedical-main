import { NextResponse } from "next/server";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import {
  getSuppliersCollection,
  generateNextSupplierCode,
  type SupplierDoc,
  type SupplierAddressInfo,
  type SupplierBankingDetails,
  type SupplierDocumentReference,
} from "@/lib/mongodb";
import type { Filter } from "mongodb";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+0-9\s\-()]{7,20}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export async function GET(request: Request) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "all";
    const supplierType = searchParams.get("supplierType")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";

    const collection = await getSuppliersCollection();
    const filter: Filter<SupplierDoc> = {};

    // Status filtering
    if (status === "active") {
      filter.isActive = true;
    } else if (status === "inactive") {
      filter.isActive = false;
    } else if (status === "suspended") {
      filter.supplierStatus = "Suspended";
    } else if (status === "pending" || status === "pending_approval") {
      filter.supplierStatus = "Pending Approval";
    } else if (status !== "all" && status) {
      filter.supplierStatus = status;
    }

    // Supplier Type filtering
    if (supplierType && supplierType !== "all") {
      filter.supplierType = supplierType;
    }

    // Biomedical Category filtering
    if (category && category !== "all") {
      filter.productCategories = category;
    }

    // Search query
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escaped, "i");
      filter.$or = [
        { supplierCode: searchRegex },
        { companyName: searchRegex },
        { contactPerson: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { city: searchRegex },
        { state: searchRegex },
        { gstNumber: searchRegex },
        { panNumber: searchRegex },
        { brandsRepresented: searchRegex },
        { productCategories: searchRegex },
        { equipmentModels: searchRegex },
      ];
    }

    const suppliers = await collection.find(filter).sort({ supplierCode: 1 }).toArray();

    const [total, activeCount, inactiveCount, suspendedCount, pendingCount] = await Promise.all([
      collection.countDocuments({}),
      collection.countDocuments({ isActive: true }),
      collection.countDocuments({ isActive: false }),
      collection.countDocuments({ supplierStatus: "Suspended" }),
      collection.countDocuments({ supplierStatus: "Pending Approval" }),
    ]);

    return NextResponse.json({
      success: true,
      suppliers,
      counts: {
        total,
        active: activeCount,
        inactive: inactiveCount,
        suspended: suspendedCount,
        pending: pendingCount,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/suppliers] Error:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Required Fields Validation
    const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
    const contactPerson = typeof body.contactPerson === "string" ? body.contactPerson.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!companyName) {
      return NextResponse.json({ success: false, message: "Company / OEM name is required." }, { status: 400 });
    }
    if (!contactPerson) {
      return NextResponse.json({ success: false, message: "Primary contact person is required." }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ success: false, message: "Business email is required." }, { status: 400 });
    }
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ success: false, message: "Please provide a valid business email address." }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ success: false, message: "Primary phone number is required." }, { status: 400 });
    }
    if (!PHONE_REGEX.test(phone)) {
      return NextResponse.json({ success: false, message: "Please provide a valid primary phone number (7-20 digits)." }, { status: 400 });
    }

    // Optional email/phone validation
    if (body.alternateEmail && typeof body.alternateEmail === "string" && body.alternateEmail.trim()) {
      if (!EMAIL_REGEX.test(body.alternateEmail.trim())) {
        return NextResponse.json({ success: false, message: "Invalid alternate email address format." }, { status: 400 });
      }
    }
    if (body.accountsBillingEmail && typeof body.accountsBillingEmail === "string" && body.accountsBillingEmail.trim()) {
      if (!EMAIL_REGEX.test(body.accountsBillingEmail.trim())) {
        return NextResponse.json({ success: false, message: "Invalid accounts billing email format." }, { status: 400 });
      }
    }

    // PAN & GSTIN validation if provided
    let panNumber = typeof body.panNumber === "string" ? body.panNumber.trim().toUpperCase() : "";
    if (panNumber && !PAN_REGEX.test(panNumber)) {
      return NextResponse.json(
        { success: false, message: "Invalid Company PAN format (e.g. ABCDE1234F - 5 letters, 4 digits, 1 letter)." },
        { status: 400 }
      );
    }

    let gstNumber = typeof body.gstNumber === "string" ? body.gstNumber.trim().toUpperCase() : "";
    const gstRegistrationStatus = typeof body.gstRegistrationStatus === "string" ? body.gstRegistrationStatus.trim() : "Registered";
    if (gstRegistrationStatus === "Registered" && gstNumber) {
      if (!GSTIN_REGEX.test(gstNumber)) {
        return NextResponse.json(
          { success: false, message: "Invalid GSTIN format (e.g. 27ABCDE1234F1Z5). Must be 15 characters." },
          { status: 400 }
        );
      }
    }

    // Banking Details Validation (if provided)
    let bankingDetails: SupplierBankingDetails | undefined = undefined;
    if (body.bankingDetails && typeof body.bankingDetails === "object") {
      const b = body.bankingDetails;
      const bankName = typeof b.bankName === "string" ? b.bankName.trim() : "";
      const accountHolderName = typeof b.accountHolderName === "string" ? b.accountHolderName.trim() : "";
      const accountNumber = typeof b.accountNumber === "string" ? b.accountNumber.trim().replace(/\s+/g, "") : "";
      const ifscCode = typeof b.ifscCode === "string" ? b.ifscCode.trim().toUpperCase() : "";
      const branchName = typeof b.branchName === "string" ? b.branchName.trim() : "";
      const accountType = typeof b.accountType === "string" ? b.accountType.trim() : "Current";
      const paymentTerms = typeof b.paymentTerms === "string" ? b.paymentTerms.trim() : "Net 30";
      const customPaymentTerms = typeof b.customPaymentTerms === "string" ? b.customPaymentTerms.trim() : "";
      const currency = typeof b.currency === "string" ? b.currency.trim() : "INR";
      const upiId = typeof b.upiId === "string" ? b.upiId.trim() : "";
      const creditLimit = Number(b.creditLimit) >= 0 ? Number(b.creditLimit) : undefined;

      if (ifscCode && !IFSC_REGEX.test(ifscCode)) {
        return NextResponse.json(
          { success: false, message: "Invalid IFSC format in banking details. Example: CBIN0280710." },
          { status: 400 }
        );
      }

      if (accountNumber && !/^\d{6,24}$/.test(accountNumber)) {
        return NextResponse.json(
          { success: false, message: "Bank account number must be between 6 and 24 digits." },
          { status: 400 }
        );
      }

      if (bankName || accountHolderName || accountNumber || ifscCode) {
        bankingDetails = {
          bankName,
          accountHolderName,
          accountNumber,
          ifscCode,
          branchName,
          accountType,
          paymentTerms,
          customPaymentTerms: paymentTerms === "Custom" ? customPaymentTerms : undefined,
          creditLimit,
          currency,
          upiId,
          verificationStatus: b.verificationStatus || "Pending Verification",
          verifiedAt: b.verificationStatus === "Verified" ? new Date() : null,
          verifiedBy: b.verificationStatus === "Verified" ? (auth.username || "admin") : undefined,
        };
      }
    }

    // Check duplicate supplier (idempotency check against rapid repeated submissions)
    const collection = await getSuppliersCollection();
    const existing = await collection.findOne({
      companyName: { $regex: `^${companyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      email: email,
    });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: `A supplier named '${companyName}' with email '${email}' is already registered (${existing.supplierCode}).`,
          existingSupplierCode: existing.supplierCode,
        },
        { status: 409 }
      );
    }

    // Address extraction & synchronization
    const streetAddress = typeof body.streetAddress === "string" ? body.streetAddress.trim() : (typeof body.address === "string" ? body.address.trim() : "");
    const addressLine2 = typeof body.addressLine2 === "string" ? body.addressLine2.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const state = typeof body.state === "string" ? body.state.trim() : "";
    const pinCode = typeof body.pinCode === "string" ? body.pinCode.trim() : "";
    const country = typeof body.country === "string" ? body.country.trim() : "India";

    const registeredOfficeAddress: SupplierAddressInfo = {
      streetAddress,
      addressLine2,
      city,
      state,
      pinCode,
      country,
    };

    const billingSameAsRegistered = body.billingSameAsRegistered !== false;
    const billingAddress: SupplierAddressInfo = billingSameAsRegistered
      ? registeredOfficeAddress
      : {
          streetAddress: String(body.billingAddress?.streetAddress || "").trim(),
          addressLine2: String(body.billingAddress?.addressLine2 || "").trim(),
          city: String(body.billingAddress?.city || "").trim(),
          state: String(body.billingAddress?.state || "").trim(),
          pinCode: String(body.billingAddress?.pinCode || "").trim(),
          country: String(body.billingAddress?.country || "India").trim(),
        };

    const shippingSameAsRegistered = body.shippingSameAsRegistered !== false;
    const shippingAddress: SupplierAddressInfo = shippingSameAsRegistered
      ? registeredOfficeAddress
      : {
          streetAddress: String(body.shippingAddress?.streetAddress || "").trim(),
          addressLine2: String(body.shippingAddress?.addressLine2 || "").trim(),
          city: String(body.shippingAddress?.city || "").trim(),
          state: String(body.shippingAddress?.state || "").trim(),
          pinCode: String(body.shippingAddress?.pinCode || "").trim(),
          country: String(body.shippingAddress?.country || "India").trim(),
        };

    // Arrays sanitization
    const productCategories: string[] = Array.isArray(body.productCategories)
      ? body.productCategories.map((c: unknown) => String(c || "").trim()).filter(Boolean)
      : [];

    const brandsRepresented: string[] = Array.isArray(body.brandsRepresented)
      ? body.brandsRepresented.map((b: unknown) => String(b || "").trim()).filter(Boolean)
      : typeof body.brandsRepresented === "string"
      ? body.brandsRepresented.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean)
      : [];

    const statesServed: string[] = Array.isArray(body.statesServed)
      ? body.statesServed.map((s: unknown) => String(s || "").trim()).filter(Boolean)
      : [];

    // Documents metadata array sanitization
    const documents: SupplierDocumentReference[] = Array.isArray(body.documents)
      ? body.documents
          .filter((d: { documentType?: string; documentReferenceNumber?: string }) => d && (d.documentType || d.documentReferenceNumber))
          .map((d: {
            id?: string;
            documentType?: string;
            documentReferenceNumber?: string;
            documentName?: string;
            issueDate?: string | Date;
            expiryDate?: string | Date;
            verificationStatus?: string;
            reviewNotes?: string;
          }, idx: number) => ({
            id: d.id || `DOC-${Date.now().toString(36).toUpperCase()}-${idx + 1}`,
            documentType: String(d.documentType || "Other Document").trim(),
            documentReferenceNumber: String(d.documentReferenceNumber || "").trim(),
            documentName: typeof d.documentName === "string" ? d.documentName.trim() : undefined,
            issueDate: d.issueDate ? new Date(d.issueDate) : null,
            expiryDate: d.expiryDate ? new Date(d.expiryDate) : null,
            verificationStatus: (d.verificationStatus as "Pending" | "Verified" | "Expired" | "Rejected") || "Pending",
            reviewNotes: typeof d.reviewNotes === "string" ? d.reviewNotes.trim() : undefined,
            submittedAt: new Date(),
          }))
      : [];

    // Status sync
    const supplierStatus = typeof body.supplierStatus === "string" ? body.supplierStatus.trim() : "Active";
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : supplierStatus === "Active";

    const supplierCode = await generateNextSupplierCode();
    const now = new Date();

    const newSupplier: SupplierDoc = {
      supplierCode,
      // Section A
      companyName,
      supplierType: typeof body.supplierType === "string" ? body.supplierType.trim() : "Authorized Distributor",
      businessRegistrationType: typeof body.businessRegistrationType === "string" ? body.businessRegistrationType.trim() : "Private Limited",
      yearEstablished: body.yearEstablished ? String(body.yearEstablished).trim() : undefined,
      website: typeof body.website === "string" ? body.website.trim() : undefined,
      companyDescription: typeof body.companyDescription === "string" ? body.companyDescription.trim() : undefined,
      employeeCount: typeof body.employeeCount === "string" ? body.employeeCount.trim() : undefined,
      panNumber: panNumber || undefined,
      gstRegistrationStatus,
      gstNumber: gstNumber || undefined,
      cinNumber: typeof body.cinNumber === "string" ? body.cinNumber.trim().toUpperCase() : undefined,
      msmeNumber: typeof body.msmeNumber === "string" ? body.msmeNumber.trim() : undefined,
      iecCode: typeof body.iecCode === "string" ? body.iecCode.trim() : undefined,

      // Section B
      contactPerson,
      designation: typeof body.designation === "string" ? body.designation.trim() : undefined,
      email,
      alternateEmail: typeof body.alternateEmail === "string" ? body.alternateEmail.trim().toLowerCase() : undefined,
      phone,
      alternatePhone: typeof body.alternatePhone === "string" ? body.alternatePhone.trim() : undefined,
      accountsBillingEmail: typeof body.accountsBillingEmail === "string" ? body.accountsBillingEmail.trim().toLowerCase() : undefined,

      // Section C
      address: streetAddress,
      streetAddress,
      addressLine2: addressLine2 || undefined,
      city,
      state,
      pinCode,
      country,
      registeredOfficeAddress,
      billingAddress,
      shippingAddress,
      billingSameAsRegistered,
      shippingSameAsRegistered,

      // Section D
      bankingDetails,

      // Section E
      productCategories,
      brandsRepresented,
      equipmentModels: typeof body.equipmentModels === "string" ? body.equipmentModels.trim() : undefined,
      isAuthorizedDistributor: Boolean(body.isAuthorizedDistributor),
      manufacturerAuthorizationDetails: typeof body.manufacturerAuthorizationDetails === "string" ? body.manufacturerAuthorizationDetails.trim() : undefined,
      geographicServiceCoverage: typeof body.geographicServiceCoverage === "string" ? body.geographicServiceCoverage.trim() : "Pan-India",
      statesServed,
      hasInstallationSupport: body.hasInstallationSupport !== false,
      hasWarrantySupport: body.hasWarrantySupport !== false,
      hasAfterSalesService: body.hasAfterSalesService !== false,
      typicalLeadTimeDays: body.typicalLeadTimeDays ? String(body.typicalLeadTimeDays).trim() : "7-14 Days",
      minimumOrderValue: Number(body.minimumOrderValue) >= 0 ? Number(body.minimumOrderValue) : undefined,

      // Section F
      documents,

      // Section G
      notes: typeof body.notes === "string" ? body.notes.trim() : undefined,
      agreedCommercialTerms: typeof body.agreedCommercialTerms === "string" ? body.agreedCommercialTerms.trim() : undefined,
      warrantyReturnPolicy: typeof body.warrantyReturnPolicy === "string" ? body.warrantyReturnPolicy.trim() : undefined,
      deliveryInstallationTerms: typeof body.deliveryInstallationTerms === "string" ? body.deliveryInstallationTerms.trim() : undefined,
      isPreferredSupplier: Boolean(body.isPreferredSupplier),
      supplierRating: Number(body.supplierRating) >= 1 && Number(body.supplierRating) <= 5 ? Number(body.supplierRating) : 5,
      internalRiskReviewNotes: typeof body.internalRiskReviewNotes === "string" ? body.internalRiskReviewNotes.trim() : undefined,
      supplierStatus,
      isActive,

      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newSupplier);

    return NextResponse.json({
      success: true,
      message: `Supplier '${companyName}' registered successfully with code ${supplierCode}.`,
      supplierId: result.insertedId,
      supplier: newSupplier,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/suppliers] Error:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
