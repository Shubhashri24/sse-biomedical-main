import Link from "next/link";
import CategoryCard from "@/components/CategoryCard";
import CatalogSearch from "@/components/CatalogSearch";
import { categories, company } from "@/lib/data";
import BrandLogo from "@/components/BrandLogo";

export default function Home() {
  const totalItems = categories.reduce((sum, c) => sum + c.totalCount, 0);

  return (
    <div className="bg-[#F5F7FA] min-h-screen">
      {/* Corporate Medical Hero */}
      <section className="relative border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#99E2DC] bg-[#E6F7F5] px-3.5 py-1 text-xs font-semibold text-[#0F9F95] shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-[#0F9F95] animate-pulse" />
                <span>Biomedical Equipment Distributor & Engineering Services</span>
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#172033] sm:text-4xl lg:text-[42px] leading-[1.15]">
                Biomedical Equipment & Clinical Systems
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#64748B] sm:text-base">
                Shree Shyam Electronics provides clinical technology and engineering support across patient monitoring,
                critical care, surgical suites, and diagnostic departments for healthcare institutions, hospitals, and specialized clinics.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  href="#catalog"
                  className="rounded-lg bg-[#0F9F95] hover:bg-[#0B827B] px-5 py-2.5 text-xs font-semibold text-white transition-all shadow-sm hover:shadow"
                >
                  Browse Equipment
                </Link>
                <Link
                  href="/contact"
                  className="rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] hover:border-[#CBD5E1] px-5 py-2.5 text-xs font-semibold text-[#172033] transition-all shadow-2xs"
                >
                  Request a Quote
                </Link>
                <Link
                  href="#search"
                  className="text-xs font-semibold text-[#0F9F95] hover:text-[#0B827B] transition-colors ml-1"
                >
                  Search Catalog →
                </Link>
              </div>
            </div>

            {/* Right: Technical Composition Card */}
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3.5">
                <div>
                  <div className="text-xs font-bold text-[#172033]">Clinical Modalities Portfolio</div>
                  <div className="text-[11px] font-medium text-[#64748B]">Structured procurement & engineering data</div>
                </div>
                <span className="rounded-full bg-[#E6F7F5] border border-[#99E2DC] px-2.5 py-0.5 text-[11px] font-bold text-[#0F9F95]">
                  {totalItems} Profiles Active
                </span>
              </div>

              {/* Modality feature blocks */}
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#172033]">Patient Monitoring & Telemetry</span>
                    <span className="font-mono text-[11px] font-bold text-[#0F9F95]">MON-01 – MON-04</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#64748B] leading-relaxed">
                    Multiparameter ICU monitors, ECG telemetry, pulse oximetry, and central monitoring station integration.
                  </p>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#172033]">ICU & Critical Care Systems</span>
                    <span className="font-mono text-[11px] font-bold text-[#0F9F95]">ICU-01 – ICU-04</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#64748B] leading-relaxed">
                    Microprocessor ventilators, biphasic defibrillators, precision syringe pumps, and enteral nutrition.
                  </p>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#172033]">Surgical & Operation Theatre</span>
                    <span className="font-mono text-[11px] font-bold text-[#0F9F95]">OT-01 – OT-04</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#64748B] leading-relaxed">
                    Electrosurgical generators, dual-dome LED surgical luminaires, hydraulic OT tables, and medical suction.
                  </p>
                </div>
              </div>

              {/* Technical trust strip */}
              <div className="mt-4 flex items-center justify-between border-t border-[#E2E8F0] pt-3.5 text-[11px] font-medium text-[#64748B]">
                <span>Verified OEM Models</span>
                <span>•</span>
                <span>Serial Number Tracking</span>
                <span>•</span>
                <span>Direct Field Engineering</span>
              </div>
            </div>
          </div>
        </div>

        {/* Capability Strip */}
        <div className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-5 sm:grid-cols-4 sm:px-6 lg:px-8">
            <CapabilityItem
              metric={`${totalItems}`}
              title="Equipment Profiles"
              detail="Complete specs, configurations & application notes"
            />
            <CapabilityItem
              metric="09"
              title="Clinical Categories"
              detail="From ICU & OT suites to diagnostics & imaging"
            />
            <CapabilityItem
              metric="B2B"
              title="Commercial Procurement"
              detail="Detailed tenders, transparent terms & fast quotes"
            />
            <CapabilityItem
              metric="Direct"
              title="Engineering Support"
              detail="Installation, calibration & preventive maintenance"
            />
          </div>
        </div>
      </section>

      {/* Catalog Directory */}
      <section id="catalog" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-8 flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[#0F9F95] uppercase tracking-wider">
            Departmental Directory
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-[#172033] sm:text-3xl">
            Biomedical Equipment by Clinical Department
          </h2>
          <p className="max-w-2xl text-xs sm:text-sm text-[#64748B] leading-relaxed">
            Select a clinical department below to review equipment specifications, operational parameters,
            and configuration requirements for your healthcare facility.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard key={category.slug} category={category} />
          ))}
        </div>
      </section>

      {/* Search & Explorer Section */}
      <section id="search" className="border-t border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <CatalogSearch />
        </div>
      </section>

      {/* Engineering Standards & Corporate Capabilities */}
      <section id="about" className="scroll-mt-20 border-t border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <div className="mb-4">
                <BrandLogo variant="full" theme="light" size="md" />
              </div>
              <span className="text-xs font-semibold text-[#0F9F95] uppercase tracking-wider">
                Corporate Standards & Capabilities
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#172033] sm:text-3xl leading-snug">
                Clinical suitability, verified configurations, dependable service.
              </h2>
              <p className="mt-4 text-xs sm:text-sm leading-relaxed text-[#64748B]">
                {company.name} distributes precision biomedical equipment for hospitals, clinics,
                diagnostic laboratories, and medical infrastructure projects. Equipment selection is guided by
                clinical workflows, patient demographics, facility infrastructure, and technical compatibility.
              </p>

              <div className="mt-6 rounded-xl border border-[#E2E8F0] bg-white p-4.5 text-xs text-[#64748B] shadow-2xs">
                <div className="font-bold text-[#172033] mb-1">Direct Engineering Desk:</div>
                <div>Consultation with <strong className="text-[#172033]">{company.contactPerson}</strong> at{" "}
                  <a href={`tel:${company.phoneHref}`} className="font-mono font-bold text-[#0F9F95] hover:underline">
                    {company.phone}
                  </a>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <CorporateCard
                title="Multi-Department Portfolio"
                body="One authoritative source across monitoring, ICU, OT, diagnostics, imaging, laboratory, furniture, and respiratory systems."
              />
              <CorporateCard
                title="Application-First Matching"
                body="Equipment models recommended based on clinical workload, target patient groups, room layouts, and gas/power availability."
              />
              <CorporateCard
                title="Spares & Accessories"
                body="Complete availability of compatible patient sensors, ECG cables, optical probes, transducers, and consumables."
              />
              <CorporateCard
                title="Formal Commercial Quotations"
                body="Every proposal details precise make, technical model, warranty term, installation scope, and service commitments."
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Band */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#172033] sm:text-2xl">
                Ready to plan your biomedical equipment requirement?
              </h2>
              <p className="mt-1.5 max-w-xl text-xs text-[#64748B] leading-relaxed">
                Add equipment profiles to your quotation list or contact our engineering division directly
                for detailed tender specifications and commercial proposals.
              </p>
            </div>
            <Link
              href="/contact"
              className="shrink-0 rounded-lg bg-[#0F9F95] hover:bg-[#0B827B] px-5 py-2.5 text-xs font-semibold text-white transition-all shadow-sm hover:shadow"
            >
              Request Commercial Quote
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function CapabilityItem({
  metric,
  title,
  detail,
}: {
  metric: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="border-l-2 border-[#0F9F95] pl-3.5">
      <div className="font-bold text-lg text-[#172033] sm:text-xl">
        {metric}
      </div>
      <div className="text-xs font-bold text-[#172033] mt-0.5">
        {title}
      </div>
      <div className="text-[11px] text-[#64748B] mt-0.5 line-clamp-1">
        {detail}
      </div>
    </div>
  );
}

function CorporateCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4.5 shadow-2xs">
      <h3 className="text-xs font-bold text-[#172033]">{title}</h3>
      <p className="mt-1.5 text-[11px] leading-relaxed text-[#64748B]">{body}</p>
    </div>
  );
}
