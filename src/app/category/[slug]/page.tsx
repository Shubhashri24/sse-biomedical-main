import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ItemCard from "@/components/ItemCard";
import { categories, getCategory } from "@/lib/data";

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};
  return {
    title: `${category.name} | Shree Shyam Electronics`,
    description: category.tagline,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const currentIndex = categories.findIndex((c) => c.slug === slug);
  const next = categories[(currentIndex + 1) % categories.length];

  return (
    <div className="bg-[#F5F7FA] min-h-screen">
      {/* Category Header */}
      <section className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <nav className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
            <Link href="/" className="hover:text-[#0F9F95] transition-colors">
              Equipment Catalog
            </Link>
            <span>/</span>
            <span className="font-mono text-[#0F9F95] font-bold">{category.code}</span>
          </nav>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className="rounded-lg border px-3 py-1 font-mono text-xs font-bold shadow-2xs"
              style={{
                borderColor: `${category.accent || "#0F9F95"}40`,
                backgroundColor: `${category.accent || "#0F9F95"}15`,
                color: category.accent || "#0F9F95",
              }}
            >
              Department {category.code}
            </span>
            <span className="text-xs font-semibold text-[#64748B]">
              {category.items.length} verified equipment profiles
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#172033] sm:text-3xl lg:text-4xl">
            {category.name}
          </h1>
          <p className="mt-2.5 max-w-2xl text-sm text-[#64748B] leading-relaxed">
            {category.tagline}
          </p>
        </div>
      </section>

      {/* Equipment List Grid */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {category.items.map((item) => (
            <ItemCard
              key={item.code}
              item={item}
              accent={category.accent}
              categoryName={category.name}
            />
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-[#E2E8F0] bg-white p-5 text-xs text-[#64748B] leading-relaxed shadow-xs">
          The <strong className="text-[#172033] font-bold">{category.name}</strong> department inventory includes{" "}
          <strong className="text-[#172033] font-bold">{category.items.length} standardized equipment profiles</strong>. Submit clinical requirements and quantities to receive an official formal technical quotation.
        </div>
      </section>

      {/* Cross-navigation */}
      <section className="border-t border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Next Department</div>
            <div className="mt-0.5 text-base font-bold text-[#172033]">{next.name}</div>
          </div>
          <Link
            href={`/category/${next.slug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-semibold text-[#172033] hover:border-[#0F9F95] hover:text-[#0F9F95] transition-all shadow-2xs"
          >
            Explore {next.code} — {next.name} →
          </Link>
        </div>
      </section>
    </div>
  );
}
