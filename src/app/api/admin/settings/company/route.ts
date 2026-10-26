import { NextResponse } from "next/server";
import { verifyAdminAuthFromRequest } from "@/lib/auth";
import { getCompanySettings, updateCompanySettings, type CompanyQuotationSettings } from "@/lib/mongodb";

export async function GET(request: Request) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getCompanySettings();
    return NextResponse.json({ success: true, settings });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/settings/company] Error:", msg);
    return NextResponse.json({ success: false, message: "Failed to load company settings." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = verifyAdminAuthFromRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updateData: Partial<CompanyQuotationSettings> = {};

    if (typeof body.companyName === "string" && body.companyName.trim()) {
      updateData.companyName = body.companyName.trim();
    }
    if (typeof body.contactPerson === "string" && body.contactPerson.trim()) {
      updateData.contactPerson = body.contactPerson.trim();
    }
    if (typeof body.address === "string" && body.address.trim()) {
      updateData.address = body.address.trim();
    }
    if (typeof body.phone === "string" && body.phone.trim()) {
      updateData.phone = body.phone.trim();
    }
    if (typeof body.email === "string" && body.email.trim()) {
      updateData.email = body.email.trim();
    }
    if (typeof body.gstNumber === "string") {
      updateData.gstNumber = body.gstNumber.trim();
    }
    if (typeof body.website === "string") {
      updateData.website = body.website.trim();
    }
    if (Array.isArray(body.defaultTerms)) {
      updateData.defaultTerms = body.defaultTerms
        .map((t: unknown) => String(t || "").trim())
        .filter(Boolean);
    }
    if (typeof body.defaultValidityDays === "number" && body.defaultValidityDays > 0) {
      updateData.defaultValidityDays = body.defaultValidityDays;
    }
    if (typeof body.state === "string") {
      updateData.state = body.state.trim();
    }
    if (typeof body.stateCode === "string") {
      updateData.stateCode = body.stateCode.trim();
    }
    const currentSettings = await getCompanySettings();

    if (typeof body.bankName === "string") {
      updateData.bankName = body.bankName.trim();
    }
    if (typeof body.accountNumber === "string") {
      updateData.accountNumber = body.accountNumber.trim();
    }
    if (typeof body.accountHolderName === "string") {
      updateData.accountHolderName = body.accountHolderName.trim();
    }
    if (typeof body.accountType === "string") {
      updateData.accountType = body.accountType.trim();
    }
    if (typeof body.ifscCode === "string") {
      const ifsc = body.ifscCode.trim().toUpperCase();
      if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid Indian IFSC code format (e.g. CBIN0280710). Must be 4 letters, '0', followed by 6 alphanumeric characters.",
          },
          { status: 400 }
        );
      }
      updateData.ifscCode = ifsc;
    }
    if (typeof body.branchName === "string") {
      updateData.branchName = body.branchName.trim();
    }
    if (typeof body.branchAddress === "string") {
      updateData.branchAddress = body.branchAddress.trim();
    }
    if (typeof body.branchAndIfsc === "string") {
      updateData.branchAndIfsc = body.branchAndIfsc.trim();
    } else if (updateData.branchName || updateData.ifscCode) {
      const br = updateData.branchName || currentSettings.branchName || "";
      const ifsc = updateData.ifscCode || currentSettings.ifscCode || "";
      updateData.branchAndIfsc = [br, ifsc].filter(Boolean).join(" - ");
    }

    // Bank verification workflow
    const effectiveBankName = updateData.bankName !== undefined ? updateData.bankName : currentSettings.bankName;
    const effectiveAccNum = updateData.accountNumber !== undefined ? updateData.accountNumber : currentSettings.accountNumber;
    const effectiveHolder = updateData.accountHolderName !== undefined ? updateData.accountHolderName : currentSettings.accountHolderName;
    const effectiveIfsc = updateData.ifscCode !== undefined ? updateData.ifscCode : currentSettings.ifscCode;
    const effectiveBranch = updateData.branchName !== undefined ? updateData.branchName : currentSettings.branchName;

    const isExplicitVerify = body.action === "VERIFY_BANK" || body.verifyBank === true;
    const isExplicitUnverify = body.action === "UNVERIFY_BANK";

    if (isExplicitVerify) {
      if (!effectiveBankName) {
        return NextResponse.json(
          { success: false, message: "Bank name is required to verify banking details." },
          { status: 400 }
        );
      }
      if (!effectiveHolder) {
        return NextResponse.json(
          { success: false, message: "Account holder / beneficiary name is required to verify banking details." },
          { status: 400 }
        );
      }
      if (!effectiveAccNum || effectiveAccNum.length < 6) {
        return NextResponse.json(
          { success: false, message: "A valid bank account number is required to verify banking details." },
          { status: 400 }
        );
      }
      if (!effectiveIfsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(effectiveIfsc)) {
        return NextResponse.json(
          { success: false, message: "A valid 11-character IFSC code (e.g. CBIN0280710) is required to verify banking details." },
          { status: 400 }
        );
      }
      if (!effectiveBranch) {
        return NextResponse.json(
          { success: false, message: "Branch name is required to verify banking details." },
          { status: 400 }
        );
      }
      updateData.isBankVerified = true;
      updateData.bankVerifiedAt = new Date();
      updateData.bankVerifiedBy = auth.username || "admin";
    } else if (isExplicitUnverify) {
      updateData.isBankVerified = false;
      updateData.bankVerifiedAt = null;
      updateData.bankVerifiedBy = "";
    } else if (
      (updateData.accountNumber !== undefined && updateData.accountNumber !== currentSettings.accountNumber) ||
      (updateData.ifscCode !== undefined && updateData.ifscCode !== currentSettings.ifscCode) ||
      (updateData.bankName !== undefined && updateData.bankName !== currentSettings.bankName)
    ) {
      // Unverify automatically if core details changed without explicit verification
      updateData.isBankVerified = false;
      updateData.bankVerifiedAt = null;
      updateData.bankVerifiedBy = "";
    }

    if (typeof body.invoicePrefix === "string" && body.invoicePrefix.trim()) {
      updateData.invoicePrefix = body.invoicePrefix.trim();
    }
    if (typeof body.invoiceNumberFormat === "string") {
      updateData.invoiceNumberFormat = body.invoiceNumberFormat.trim();
    }
    if (typeof body.defaultDeclaration === "string") {
      updateData.defaultDeclaration = body.defaultDeclaration.trim();
    }
    if (typeof body.signatoryTitle === "string") {
      updateData.signatoryTitle = body.signatoryTitle.trim();
    }
    if (typeof body.signatureImageUrl === "string") {
      updateData.signatureImageUrl = body.signatureImageUrl.trim();
    }

    const updated = await updateCompanySettings(updateData);
    return NextResponse.json({
      success: true,
      message: "Company quotation settings updated successfully.",
      settings: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[PUT /api/admin/settings/company] Error:", msg);
    return NextResponse.json({ success: false, message: "Failed to update company settings." }, { status: 500 });
  }
}
