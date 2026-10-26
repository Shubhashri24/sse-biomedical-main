import Link from "next/link";
import type { Category } from "@/lib/data";

export default function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#E2E8F0] bg-white p-5 transition-all hover:border-[#CBD5E1] hover:shadow-md"
    >
      <div
        className="absolute inset-x-0 top-0 h-[3px] transition-opacity group-hover:opacity-100"
        style={{ background: category.accent || "#0F9F95" }}
      />
      <div>
        <div className="flex items-center justify-between">
          <span
            className="font-mono text-xs font-bold"
            style={{ color: category.accent || "#0F9F95" }}
          >
            {category.number} • {category.code}
          </span>
          <span className="text-[11px] font-semibold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
            {category.totalCount} models
          </span>
        </div>
        <h3 className="mt-3 text-lg font-bold text-[#172033] group-hover:text-[#0F9F95] transition-colors leading-snug">
          {category.name}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-[#64748B]">
          {category.tagline}
        </p>
      </div>
      <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-[#0F9F95] transition-colors">
        <span>Explore Department Systems</span>
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </div>
    </Link>
  );
}
