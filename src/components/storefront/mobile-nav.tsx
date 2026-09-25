"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export function MobileNav({ items }: { items: { label: string; href: string }[] }) {
  const [open, setOpen] = React.useState(false);
  if (items.length === 0) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--sf-radius)]"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto p-4 shadow-xl"
            style={{ background: "var(--sf-color-background)", color: "var(--sf-color-text)" }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--sf-radius)]"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {items.map((item, index) => (
                <Link
                  key={`${item.href}-${index}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--sf-radius)] px-3 py-2.5 text-sm font-medium"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
