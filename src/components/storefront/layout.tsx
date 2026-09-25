import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { MobileNav } from "@/components/storefront/mobile-nav";
import type { storeNavigation, storeThemes } from "@/lib/db/schema";
import { getCart, readCartSessionKey } from "@/lib/services/cart";
import { getTheme, themeVariables } from "@/lib/storefront/themes";
import type { StorefrontStore } from "@/lib/storefront/sections";
import { storeHref } from "@/lib/utils";

function safeAssetUrl(value: string | null): string {
  const url = (value ?? "").trim();
  return /^https?:\/\//i.test(url) || url.startsWith("/") ? url : "";
}

function CartLink({ storeSlug, count }: { storeSlug: string; count: number }) {
  return (
    <Link
      href={`/${storeSlug}/cart`}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-[var(--sf-radius)]"
      aria-label={count > 0 ? `Cart with ${count} items` : "Cart"}
    >
      <ShoppingBag className="h-5 w-5" />
      {count > 0 ? (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
          style={{ background: "var(--sf-color-primary)", color: "var(--sf-color-on-primary)" }}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

export async function StoreShell({
  store,
  navigation,
  theme,
  children,
}: {
  store: StorefrontStore;
  navigation: typeof storeNavigation.$inferSelect[];
  theme: typeof storeThemes.$inferSelect | null;
  children: ReactNode;
}) {
  const themeDef = getTheme(theme?.themeKey);
  const variables = themeVariables(themeDef, theme?.settings ?? null);
  const headerItems = navigation.filter((item) => item.location === "header");
  const footerItems = navigation.filter((item) => item.location === "footer");
  const sessionKey = await readCartSessionKey(store.id);
  const cart = sessionKey ? await getCart(store.id, sessionKey) : null;
  const cartCount = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const logoUrl = safeAssetUrl(store.logoUrl);
  const year = new Date().getFullYear();

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ ...variables, fontFamily: "var(--sf-font-body)", background: "var(--sf-color-background)", color: "var(--sf-color-text)" }}
    >
      <header
        className="sticky top-0 z-40 border-b"
        style={{ borderColor: "var(--sf-color-border)", background: "var(--sf-color-background)" }}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Link href={`/${store.slug}`} className="flex min-w-0 items-center gap-2.5">
            {logoUrl ? (
              <Image src={logoUrl} alt={store.name} width={32} height={32} unoptimized className="h-8 w-8 shrink-0 rounded object-contain" />
            ) : (
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-sm font-semibold"
                style={{ background: "var(--sf-color-primary)", color: "var(--sf-color-on-primary)" }}
              >
                {store.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="truncate text-base font-semibold" style={{ fontFamily: "var(--sf-font-heading)" }}>
              {store.name}
            </span>
          </Link>

          <nav className="ml-auto hidden items-center gap-0.5 md:flex">
            {headerItems.map((item) => (
              <Link
                key={item.id}
                href={storeHref(store.slug, item.url)}
                className="rounded-[var(--sf-radius)] px-3 py-2 text-sm font-medium"
                style={{ color: "var(--sf-color-muted)" }}
              >
                {item.label}
              </Link>
            ))}
            <CartLink storeSlug={store.slug} count={cartCount} />
          </nav>

          <div className="ml-auto flex items-center gap-1 md:hidden">
            <CartLink storeSlug={store.slug} count={cartCount} />
            <MobileNav items={headerItems.map((item) => ({ label: item.label, href: storeHref(store.slug, item.url) }))} />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t" style={{ borderColor: "var(--sf-color-border)" }}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ fontFamily: "var(--sf-font-heading)" }}>
              {store.name}
            </p>
            {store.description ? (
              <p className="mt-1 max-w-md text-sm" style={{ color: "var(--sf-color-muted)" }}>
                {store.description}
              </p>
            ) : null}
          </div>
          {footerItems.length > 0 ? (
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {footerItems.map((item) => (
                <Link key={item.id} href={storeHref(store.slug, item.url)} className="font-medium">
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
          <p className="text-xs" style={{ color: "var(--sf-color-muted)" }}>
            © {year} {store.name}
          </p>
        </div>
      </footer>
    </div>
  );
}
