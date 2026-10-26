import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import {
  getSuppliersCollection,
  getSupplierProductsCollection,
  type SupplierDoc,
  type SupplierAddressInfo,
  type SupplierBankingDetails,
  type SupplierDocumentReference,
} from "@/lib/mongodb";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+0-9\s\-()]{7,20}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

function buildSupplierFilter(id: string) {
  if (ObjectId.isValid(id)) {
    return {
      $or: [{ _id: new ObjectId(id) }, { supplierCode: id }],
    };
  }
  return { supplierCode: id };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const suppliersCol = await getSuppliersCollection();
    const supplier = await suppliersCol.findOne(buildSupplierFilter(id));

    if (!supplier) {
      return NextResponse.json({ success: false, message: `Supplier '${id}' not found` }, { status: 404 });
    }

    const mappingCol = await getSupplierProductsCollection();
    const products = await mappingCol
      .find({
        $or: [
          { supplierCode: supplier.supplierCode },
          ...(supplier._id ? [{ supplierId: supplier._id }] : []),
        ],
      })
      .toArray();

    return NextResponse.json({ success: true, supplier, productsSupplied: products });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

async function handleUpdateSupplier(
  request: Request,
  id: string
) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const suppliersCol = await getSuppliersCollection();
    const existing = await suppliersCol.findOne(buildSupplierFilter(id));

    if (!existing) {
      return NextResponse.json({ success: false, message: `Supplier '${id}' not found` }, { status: 404 });
    }

    const updateFields: Partial<SupplierDoc> = {
      updatedAt: new Date(),
    };

    // Section A — Company & Business Information
    if (typeof body.companyName === "string" && body.companyName.trim()) {
      updateFields.companyName = body.companyName.trim();
    }
    if (typeof body.supplierType === "string") updateFields.supplierType = body.supplierType.trim();
    if (typeof body.businessRegistrationType === "string") updateFields.businessRegistrationType = body.businessRegistrationType.trim();
    if (body.yearEstablished !== undefined) updateFields.yearEstablished = String(body.yearEstablished).trim();
    if (typeof body.website === "string") updateFields.website = body.website.trim();
    if (typeof body.companyDescription === "string") updateFields.companyDescription = body.companyDescription.trim();
    if (typeof body.employeeCount === "string") updateFields.employeeCount = body.employeeCount.trim();
    if (typeof body.panNumber === "string") {
      const pan = body.panNumber.trim().toUpperCase();
      if (pan && !PAN_REGEX.test(pan)) {
        return NextResponse.json({ success: false, message: "Invalid Company PAN format (e.g. ABCDE1234F)." }, { status: 400 });
      }
      updateFields.panNumber = pan;
    }
    if (typeof body.gstRegistrationStatus === "string") updateFields.gstRegistrationStatus = body.gstRegistrationStatus.trim();
    if (typeof body.gstNumber === "string") {
      const gstin = body.gstNumber.trim().toUpperCase();
      if (gstin && updateFields.gstRegistrationStatus === "Registered" && !GSTIN_REGEX.test(gstin)) {
        return NextResponse.json({ success: false, message: "Invalid GSTIN format. Must be 15 characters." }, { status: 400 });
      }
      updateFields.gstNumber = gstin;
    }
    if (typeof body.cinNumber === "string") updateFields.cinNumber = body.cinNumber.trim().toUpperCase();
    if (typeof body.msmeNumber === "string") updateFields.msmeNumber = body.msmeNumber.trim();
    if (typeof body.iecCode === "string") updateFields.iecCode = body.iecCode.trim();

    // Section B — Contact Information
    if (typeof body.contactPerson === "string" && body.contactPerson.trim()) {
      updateFields.contactPerson = body.contactPerson.trim();
    }
    if (typeof body.designation === "string") updateFields.designation = body.designation.trim();
    if (typeof body.email === "string" && body.email.trim()) {
      const em = body.email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(em)) {
        return NextResponse.json({ success: false, message: "Invalid business email address." }, { status: 400 });
      }
      updateFields.email = em;
    }
    if (typeof body.alternateEmail === "string") {
      const altEm = body.alternateEmail.trim().toLowerCase();
      if (altEm && !EMAIL_REGEX.test(altEm)) {
        return NextResponse.json({ success: false, message: "Invalid alternate email address." }, { status: 400 });
      }
      updateFields.alternateEmail = altEm;
    }
    if (typeof body.phone === "string" && body.phone.trim()) {
      const ph = body.phone.trim();
      if (!PHONE_REGEX.test(ph)) {
        return NextResponse.json({ success: false, message: "Invalid primary phone number." }, { status: 400 });
      }
      updateFields.phone = ph;
    }
    if (typeof body.alternatePhone === "string") updateFields.alternatePhone = body.alternatePhone.trim();
    if (typeof body.accountsBillingEmail === "string") {
      const accEm = body.accountsBillingEmail.trim().toLowerCase();
      if (accEm && !EMAIL_REGEX.test(accEm)) {
        return NextResponse.json({ success: false, message: "Invalid accounts billing email address." }, { status: 400 });
      }
      updateFields.accountsBillingEmail = accEm;
    }

    // Section C — Registered Address & Location
    if (typeof body.streetAddress === "string" || typeof body.address === "string") {
      const st = typeof body.streetAddress === "string" ? body.streetAddress.trim() : (body.address || "").trim();
      updateFields.address = st;
      updateFields.streetAddress = st;
    }
    if (typeof body.addressLine2 === "string") updateFields.addressLine2 = body.addressLine2.trim();
    if (typeof body.city === "string") updateFields.city = body.city.trim();
    if (typeof body.state === "string") updateFields.state = body.state.trim();
    if (typeof body.pinCode === "string") updateFields.pinCode = body.pinCode.trim();
    if (typeof body.country === "string") updateFields.country = body.country.trim();

    if (body.registeredOfficeAddress && typeof body.registeredOfficeAddress === "object") {
      updateFields.registeredOfficeAddress = {
        streetAddress: String(body.registeredOfficeAddress.streetAddress || updateFields.streetAddress || "").trim(),
        addressLine2: String(body.registeredOfficeAddress.addressLine2 || updateFields.addressLine2 || "").trim(),
        city: String(body.registeredOfficeAddress.city || updateFields.city || "").trim(),
        state: String(body.registeredOfficeAddress.state || updateFields.state || "").trim(),
        pinCode: String(body.registeredOfficeAddress.pinCode || updateFields.pinCode || "").trim(),
        country: String(body.registeredOfficeAddress.country || updateFields.country || "India").trim(),
      };
    }

    if (body.billingSameAsRegistered !== undefined) {
      updateFields.billingSameAsRegistered = Boolean(body.billingSameAsRegistered);
    }
    if (body.shippingSameAsRegistered !== undefined) {
      updateFields.shippingSameAsRegistered = Boolean(body.shippingSameAsRegistered);
    }

    if (body.billingAddress && typeof body.billingAddress === "object") {
      updateFields.billingAddress = {
        streetAddress: String(body.billingAddress.streetAddress || "").trim(),
        addressLine2: String(body.billingAddress.addressLine2 || "").trim(),
        city: String(body.billingAddress.city || "").trim(),
        state: String(body.billingAddress.state || "").trim(),
        pinCode: String(body.billingAddress.pinCode || "").trim(),
        country: String(body.billingAddress.country || "India").trim(),
      };
    } else if (updateFields.billingSameAsRegistered && updateFields.registeredOfficeAddress) {
      updateFields.billingAddress = updateFields.registeredOfficeAddress;
    }

    if (body.shippingAddress && typeof body.shippingAddress === "object") {
      updateFields.shippingAddress = {
        streetAddress: String(body.shippingAddress.streetAddress || "").trim(),
        addressLine2: String(body.shippingAddress.addressLine2 || "").trim(),
        city: String(body.shippingAddress.city || "").trim(),
        state: String(body.shippingAddress.state || "").trim(),
        pinCode: String(body.shippingAddress.pinCode || "").trim(),
        country: String(body.shippingAddress.country || "India").trim(),
      };
    } else if (updateFields.shippingSameAsRegistered && updateFields.registeredOfficeAddress) {
      updateFields.shippingAddress = updateFields.registeredOfficeAddress;
    }

    // Section D — Banking & Payment Details
    if (body.bankingDetails && typeof body.bankingDetails === "object") {
      const b = body.bankingDetails;
      const bankName = typeof b.bankName === "string" ? b.bankName.trim() : (existing.bankingDetails?.bankName || "");
      const accountHolderName = typeof b.accountHolderName === "string" ? b.accountHolderName.trim() : (existing.bankingDetails?.accountHolderName || "");
      const accountNumber = typeof b.accountNumber === "string" ? b.accountNumber.trim().replace(/\s+/g, "") : (existing.bankingDetails?.accountNumber || "");
      const ifscCode = typeof b.ifscCode === "string" ? b.ifscCode.trim().toUpperCase() : (existing.bankingDetails?.ifscCode || "");
      const branchName = typeof b.branchName === "string" ? b.branchName.trim() : (existing.bankingDetails?.branchName || "");
      const accountType = typeof b.accountType === "string" ? b.accountType.trim() : (existing.bankingDetails?.accountType || "Current");
      const paymentTerms = typeof b.paymentTerms === "string" ? b.paymentTerms.trim() : (existing.bankingDetails?.paymentTerms || "Net 30");
      const customPaymentTerms = typeof b.customPaymentTerms === "string" ? b.customPaymentTerms.trim() : (existing.bankingDetails?.customPaymentTerms || "");
      const currency = typeof b.currency === "string" ? b.currency.trim() : (existing.bankingDetails?.currency || "INR");
      const upiId = typeof b.upiId === "string" ? b.upiId.trim() : (existing.bankingDetails?.upiId || "");
      const creditLimit = Number(b.creditLimit) >= 0 ? Number(b.creditLimit) : existing.bankingDetails?.creditLimit;

      if (ifscCode && !IFSC_REGEX.test(ifscCode)) {
        return NextResponse.json({ success: false, message: "Invalid IFSC format in banking details." }, { status: 400 });
      }

      if (accountNumber && !/^\d{6,24}$/.test(accountNumber)) {
        return NextResponse.json({ success: false, message: "Bank account number must be between 6 and 24 digits." }, { status: 400 });
      }

      updateFields.bankingDetails = {
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
        verificationStatus: b.verificationStatus || existing.bankingDetails?.verificationStatus || "Pending Verification",
        verifiedAt: b.verificationStatus === "Verified" ? new Date() : existing.bankingDetails?.verifiedAt,
        verifiedBy: b.verificationStatus === "Verified" ? (auth.username || "admin") : existing.bankingDetails?.verifiedBy,
      };
    }

    // Section E — Biomedical Specialization
    if (Array.isArray(body.productCategories)) {
      updateFields.productCategories = body.productCategories.map((c: unknown) => String(c || "").trim()).filter(Boolean);
    }
    if (Array.isArray(body.brandsRepresented)) {
      updateFields.brandsRepresented = body.brandsRepresented.map((b: unknown) => String(b || "").trim()).filter(Boolean);
    } else if (typeof body.brandsRepresented === "string") {
      updateFields.brandsRepresented = body.brandsRepresented.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean);
    }
    if (typeof body.equipmentModels === "string") updateFields.equipmentModels = body.equipmentModels.trim();
    if (body.isAuthorizedDistributor !== undefined) updateFields.isAuthorizedDistributor = Boolean(body.isAuthorizedDistributor);
    if (typeof body.manufacturerAuthorizationDetails === "string") {
      updateFields.manufacturerAuthorizationDetails = body.manufacturerAuthorizationDetails.trim();
    }
    if (typeof body.geographicServiceCoverage === "string") updateFields.geographicServiceCoverage = body.geographicServiceCoverage.trim();
    if (Array.isArray(body.statesServed)) {
      updateFields.statesServed = body.statesServed.map((s: unknown) => String(s || "").trim()).filter(Boolean);
    }
    if (body.hasInstallationSupport !== undefined) updateFields.hasInstallationSupport = Boolean(body.hasInstallationSupport);
    if (body.hasWarrantySupport !== undefined) updateFields.hasWarrantySupport = Boolean(body.hasWarrantySupport);
    if (body.hasAfterSalesService !== undefined) updateFields.hasAfterSalesService = Boolean(body.hasAfterSalesService);
    if (body.typicalLeadTimeDays !== undefined) updateFields.typicalLeadTimeDays = String(body.typicalLeadTimeDays).trim();
    if (body.minimumOrderValue !== undefined) updateFields.minimumOrderValue = Number(body.minimumOrderValue) >= 0 ? Number(body.minimumOrderValue) : undefined;

    // Section F — Compliance & Documents
    if (Array.isArray(body.documents)) {
      updateFields.documents = body.documents
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
        }));
    }

    // Section G — Procurement & Internal Notes
    if (typeof body.notes === "string") updateFields.notes = body.notes.trim();
    if (typeof body.agreedCommercialTerms === "string") updateFields.agreedCommercialTerms = body.agreedCommercialTerms.trim();
    if (typeof body.warrantyReturnPolicy === "string") updateFields.warrantyReturnPolicy = body.warrantyReturnPolicy.trim();
    if (typeof body.deliveryInstallationTerms === "string") updateFields.deliveryInstallationTerms = body.deliveryInstallationTerms.trim();
    if (body.isPreferredSupplier !== undefined) updateFields.isPreferredSupplier = Boolean(body.isPreferredSupplier);
    if (body.supplierRating !== undefined && Number(body.supplierRating) >= 1 && Number(body.supplierRating) <= 5) {
      updateFields.supplierRating = Number(body.supplierRating);
    }
    if (typeof body.internalRiskReviewNotes === "string") updateFields.internalRiskReviewNotes = body.internalRiskReviewNotes.trim();

    // Sync supplierStatus & isActive
    if (typeof body.supplierStatus === "string") {
      updateFields.supplierStatus = body.supplierStatus.trim();
      updateFields.isActive = updateFields.supplierStatus === "Active";
    } else if (body.isActive !== undefined) {
      updateFields.isActive = Boolean(body.isActive);
      updateFields.supplierStatus = updateFields.isActive ? "Active" : "Inactive";
    }

    const updated = await suppliersCol.findOneAndUpdate(
      buildSupplierFilter(id),
      { $set: updateFields },
      { returnDocument: "after" }
    );

    return NextResponse.json({
      success: true,
      message: `Supplier '${updated?.companyName || existing.companyName}' profile updated successfully.`,
      supplier: updated,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[PUT/PATCH /api/admin/suppliers/[id]] Error:", errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleUpdateSupplier(request, id);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleUpdateSupplier(request, id);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const suppliersCol = await getSuppliersCollection();

    const result = await suppliersCol.findOneAndUpdate(
      buildSupplierFilter(id),
      {
        $set: {
          isActive: false,
          supplierStatus: "Inactive",
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ success: false, message: `Supplier '${id}' not found` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Supplier ${result.companyName} deactivated.`,
      supplier: result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
