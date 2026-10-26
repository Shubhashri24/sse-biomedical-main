import { Suspense } from "react";
import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import { company } from "@/lib/data";

export const metadata: Metadata = {
  title: "Contact & Quotation Desk | Shree Shyam Electronics",
  description: "Share your clinical equipment requirements to receive formal quotations and technical support.",
};

export default function ContactPage() {
  return (
    <div className="bg-[#F5F7FA] min-h-screen">
      {/* Page Header */}
      <section className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#99E2DC] bg-[#E6F7F5] px-3.5 py-1 text-xs font-semibold text-[#0F9F95]">
            Biomedical Equipment & Systems Procurement Desk
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#172033] sm:text-4xl">
            Equipment Consultation & Quotation Requests
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#64748B] leading-relaxed">
            Submit clinical equipment requirements, facility applications, and desired quantities. Technical specifications, warranty coverage, warranty terms, and delivery schedules will be detailed in your formal quotation.
          </p>
        </div>
      </section>

      {/* Main Form & Business Info */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.3fr]">
          {/* Business card */}
          <div className="h-fit rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-7 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#99E2DC] bg-[#E6F7F5] text-xs font-bold text-[#0F9F95]">
                SSE
              </div>
              <div>
                <h2 className="text-base font-bold text-[#172033]">
                  {company.name}
                </h2>
                <p className="text-xs text-[#64748B]">
                  {company.division}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#F1F5F9] pt-5">
              <div>
                <div className="text-xs font-semibold text-[#64748B]">
                  Contact Representative
                </div>
                <div className="mt-1 font-bold text-[#172033] text-sm">{company.contactPerson}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-[#64748B]">
                  Direct Telephone
                </div>
                <a
                  href={`tel:${company.phoneHref}`}
                  className="mt-1 block font-mono font-bold text-[#0F9F95] hover:text-[#0B827B] transition-colors text-sm"
                >
                  {company.phone}
                </a>
              </div>
            </div>

            <div className="mt-6 border-t border-[#F1F5F9] pt-5 text-xs leading-relaxed text-[#64748B] space-y-2.5">
              <p>
                All product profiles in the catalog represent verified clinical equipment specifications. Technical models, warranty terms, accessories, and calibration certificates are formally issued in the final quotation document.
              </p>
              <div className="rounded-lg bg-[#F8FAFC] p-3 text-[#172033] font-medium border border-[#E2E8F0]">
                <strong>Operating Hours:</strong> Monday – Saturday, 09:30 – 18:30 IST.
              </div>
            </div>
          </div>

          {/* Form */}
          <Suspense
            fallback={
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center text-xs text-[#64748B]">
                Loading requirement inquiry form...
              </div>
            }
          >
            <ContactForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
