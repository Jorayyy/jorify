import Link from "next/link";
import { cn } from "@/lib/utils";

export function Pagination({
  href,
  page,
  total,
  pageSize,
}: {
  href: (page: number) => string;
  page: number;
  total: number;
  pageSize: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1 && total === 0) return null;

  const linkClass =
    "rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:text-zinc-400";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-zinc-500">
        {total === 0 ? "No results" : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
        {pages > 1 ? ` · page ${page} of ${pages}` : ""}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={linkClass}>
            Previous
          </Link>
        ) : (
          <span className={cn(linkClass, "pointer-events-none opacity-50")}>Previous</span>
        )}
        {page < pages ? (
          <Link href={href(page + 1)} className={linkClass}>
            Next
          </Link>
        ) : (
          <span className={cn(linkClass, "pointer-events-none opacity-50")}>Next</span>
        )}
      </div>
    </div>
  );
}
