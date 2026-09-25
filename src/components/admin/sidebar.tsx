"use client";

import { Command, LogOut, Menu, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { NAV_ITEMS, type NavItem } from "@/components/admin/nav";
import { logoutAction } from "@/lib/actions/session";
import { cn } from "@/lib/utils";

export function Sidebar({
  storeSlug,
  storeName,
  items,
  userName,
}: {
  storeSlug: string;
  storeName: string;
  items: Omit<NavItem, "icon">[];
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/admin/${storeSlug}`;
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [prevPathname, setPrevPathname] = React.useState(pathname);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
      {items.map((item) => {
        const href = `${base}${item.href}`;
        const active = item.href === "" ? pathname === base : pathname.startsWith(href);
        const Icon = NAV_ITEMS[item.key].icon;
        return (
          <Link
            key={item.key}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <button
        className="fixed bottom-4 left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-zinc-200 bg-white lg:flex">
        <div className="flex items-center justify-between px-4 py-3.5">
          <Link href={`${base}`} className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-900 text-xs text-white">
              {storeName.slice(0, 1).toUpperCase()}
            </span>
            <span className="truncate text-sm font-semibold">{storeName}</span>
          </Link>
          <Link
            href={`/${storeSlug}`}
            target="_blank"
            className="text-zinc-400 hover:text-zinc-700"
            title="View storefront"
          >
            <ShoppingBag className="h-4 w-4" />
          </Link>
        </div>
        {nav}
        <div className="border-t border-zinc-100 p-3">
          <button
            onClick={() => setCommandOpen(true)}
            className="mb-2 flex w-full items-center gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50"
          >
            <Command className="h-3.5 w-3.5" />
            Search
            <span className="ml-auto rounded border border-zinc-200 px-1 text-[10px]">⌘K</span>
          </button>
          <div className="flex items-center justify-between">
            <span className="truncate text-xs text-zinc-500">{userName}</span>
            <form action={logoutAction}>
              <button type="submit" className="text-zinc-400 hover:text-zinc-700" title="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-zinc-950/40" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="truncate text-sm font-semibold">{storeName}</span>
              <button onClick={() => setMobileOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            {nav}
            <div className="border-t border-zinc-100 p-3">
              <form action={logoutAction}>
                <button type="submit" className="flex items-center gap-2 text-sm text-zinc-600">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </form>
            </div>
          </aside>
        </div>
      ) : null}

      {commandOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <button className="absolute inset-0 bg-zinc-950/40" aria-label="Close search" onClick={() => setCommandOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg border border-zinc-200 bg-white shadow-xl">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Jump to…"
              className="w-full border-b border-zinc-100 px-4 py-3 text-sm outline-none"
            />
            <div className="max-h-72 overflow-y-auto p-1.5">
              {filtered.map((item) => {
                const Icon = NAV_ITEMS[item.key].icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setCommandOpen(false);
                      setQuery("");
                      router.push(`${base}${item.href}`);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100"
                  >
                    <Icon className="h-4 w-4 text-zinc-400" />
                    {item.label}
                  </button>
                );
              })}
              {filtered.length === 0 ? <p className="px-3 py-4 text-sm text-zinc-400">No matches</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
