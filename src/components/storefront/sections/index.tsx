import { Clock, Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ProductCard } from "@/components/storefront/product-card";
import type { SectionProps } from "@/lib/storefront/sections";
import { listStorefrontCategories, listStorefrontProducts } from "@/lib/services/storefront";
import { sfButtonStyle } from "@/lib/storefront/themes";
import { storeHref } from "@/lib/utils";

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeUrl(value: unknown): string {
  const url = str(value).trim();
  if (/^https?:\/\//i.test(url) || url.startsWith("/")) return url;
  return "";
}

function jsonParse(value: string): unknown[] | null {
  if (!value.startsWith("[")) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function lineList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => str(item).trim()).filter(Boolean);
  const text = str(value).trim();
  if (!text) return [];
  const json = jsonParse(text);
  if (json) return json.map((item) => str(item).trim()).filter(Boolean);
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function faqList(value: unknown): { q: string; a: string }[] {
  if (Array.isArray(value)) {
    return value
      .filter(isRecord)
      .map((item) => ({ q: str(item.q ?? item.question).trim(), a: str(item.a ?? item.answer).trim() }))
      .filter((item) => item.q !== "");
  }
  const text = str(value).trim();
  if (!text) return [];
  const json = jsonParse(text);
  if (json) return faqList(json);
  return text
    .split("\n")
    .map((line) => {
      const index = line.indexOf("|");
      if (index < 0) return null;
      return { q: line.slice(0, index).trim(), a: line.slice(index + 1).trim() };
    })
    .filter((item): item is { q: string; a: string } => item !== null && item.q !== "");
}

function testimonialList(value: unknown): { name: string; role: string; quote: string }[] {
  const fromRecord = (item: Record<string, unknown>) => ({
    name: str(item.name ?? item.author).trim(),
    role: str(item.role ?? item.title).trim(),
    quote: str(item.quote ?? item.text ?? item.body).trim(),
  });
  if (Array.isArray(value)) {
    return value.filter(isRecord).map(fromRecord).filter((item) => item.quote !== "");
  }
  const text = str(value).trim();
  if (!text) return [];
  const json = jsonParse(text);
  if (json) return testimonialList(json);
  return text
    .split("\n")
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts.length > 1 && parts.some(Boolean))
    .map((parts) => ({
      name: parts[0] ?? "",
      role: parts[1] ?? "",
      quote: parts.slice(2).join(" ").trim() || parts[parts.length - 1] || "",
    }))
    .filter((item) => item.quote !== "");
}

function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className ? `mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}` : "mx-auto w-full max-w-6xl px-4 sm:px-6"}>{children}</div>;
}

function Heading({ children, size = "h3" }: { children: ReactNode; size?: "h1" | "h2" | "h3" }) {
  const sizes = { h1: "var(--sf-h1)", h2: "var(--sf-h2)", h3: "var(--sf-h3)" };
  return (
    <h2
      className="font-semibold leading-tight tracking-tight"
      style={{ fontFamily: "var(--sf-font-heading)", fontSize: sizes[size], color: "var(--sf-color-text)" }}
    >
      {children}
    </h2>
  );
}

function Muted({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={className ? `text-[length:var(--sf-body)] leading-relaxed ${className}` : "text-[length:var(--sf-body)] leading-relaxed"}
      style={{ color: "var(--sf-color-muted)" }}
    >
      {children}
    </p>
  );
}

function ProductGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[var(--sf-radius)] border border-dashed px-4 py-6 text-center text-sm" style={{ borderColor: "var(--sf-color-border)", color: "var(--sf-color-muted)" }}>
      {children}
    </p>
  );
}

function SectionFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={className ? `py-10 sm:py-12 ${className}` : "py-10 sm:py-12"}>{children}</section>
  );
}

export function AnnouncementSection({ store, settings }: SectionProps) {
  const text = str(settings.text).trim();
  if (!text) return null;
  const linkLabel = str(settings.linkLabel).trim();
  return (
    <div
      className="px-4 py-2 text-center text-xs sm:text-sm"
      style={{ background: "var(--sf-color-primary)", color: "var(--sf-color-on-primary)" }}
    >
      <span>{text}</span>
      {linkLabel ? (
        <Link href={storeHref(store.slug, str(settings.linkHref))} className="ml-2 font-medium underline underline-offset-2">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function HeroSection({ store, settings }: SectionProps) {
  const heading = str(settings.heading).trim();
  const subheading = str(settings.subheading).trim();
  const buttonLabel = str(settings.buttonLabel).trim();
  const image = safeUrl(settings.image);
  if (!heading && !subheading && !buttonLabel && !image) return null;
  return (
    <section className="border-b" style={{ borderColor: "var(--sf-color-border)" }}>
      <Container className="grid gap-8 py-12 md:grid-cols-2 md:items-center md:py-16">
        <div className="min-w-0">
          {heading ? <Heading size="h1">{heading}</Heading> : null}
          {subheading ? (
            <Muted className="mt-4 max-w-xl">{subheading}</Muted>
          ) : null}
          {buttonLabel ? (
            <Link
              href={storeHref(store.slug, str(settings.buttonHref))}
              className="mt-6 inline-flex h-11 items-center px-6 text-sm font-medium"
              style={sfButtonStyle()}
            >
              {buttonLabel}
            </Link>
          ) : null}
        </div>
        {image ? (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--sf-radius)] border" style={{ borderColor: "var(--sf-color-border)" }}>
            <Image src={image} alt={heading || store.name} fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
          </div>
        ) : null}
      </Container>
    </section>
  );
}

export async function FeaturedProductsSection({ store, settings }: SectionProps) {
  const title = str(settings.title).trim() || "Featured products";
  const products = await listStorefrontProducts(store.id, { featured: true, limit: num(settings.limit, 8) });
  return (
    <SectionFrame>
      <Container>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <Heading>{title}</Heading>
          <Link href={`/${store.slug}/products`} className="text-sm font-medium" style={{ color: "var(--sf-color-primary)" }}>
            View all
          </Link>
        </div>
        {products.length === 0 ? (
          <EmptyNote>No featured products yet.</EmptyNote>
        ) : (
          <ProductGrid>
            {products.map((product) => (
              <ProductCard key={product.id} storeSlug={store.slug} currency={store.currency} product={product} />
            ))}
          </ProductGrid>
        )}
      </Container>
    </SectionFrame>
  );
}

export async function ProductGridSection({ store, settings }: SectionProps) {
  const title = str(settings.title).trim() || "All products";
  const products = await listStorefrontProducts(store.id, { limit: num(settings.limit, 24) });
  return (
    <SectionFrame>
      <Container>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <Heading>{title}</Heading>
          <Link href={`/${store.slug}/products`} className="text-sm font-medium" style={{ color: "var(--sf-color-primary)" }}>
            Browse the catalog
          </Link>
        </div>
        {products.length === 0 ? (
          <EmptyNote>No products are available yet.</EmptyNote>
        ) : (
          <ProductGrid>
            {products.map((product) => (
              <ProductCard key={product.id} storeSlug={store.slug} currency={store.currency} product={product} />
            ))}
          </ProductGrid>
        )}
      </Container>
    </SectionFrame>
  );
}

export async function CategoriesSection({ store, settings }: SectionProps) {
  const title = str(settings.title).trim() || "Shop by category";
  const categories = await listStorefrontCategories(store.id);
  return (
    <SectionFrame className="border-t" >
      <Container>
        <div className="mb-6">
          <Heading>{title}</Heading>
        </div>
        {categories.length === 0 ? (
          <EmptyNote>No categories yet.</EmptyNote>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/${store.slug}/categories/${category.slug}`}
                className="group flex min-w-0 flex-col overflow-hidden rounded-[var(--sf-radius)] border transition-colors"
                style={{ borderColor: "var(--sf-color-border)" }}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ background: "var(--sf-color-border)" }}>
                  {category.imageUrl ? (
                    <Image src={category.imageUrl} alt={category.name} fill unoptimized sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-3xl opacity-50" style={{ fontFamily: "var(--sf-font-heading)", color: "var(--sf-color-muted)" }}>
                      {category.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="truncate px-3 py-2.5 text-sm font-medium" style={{ color: "var(--sf-color-text)" }}>
                  {category.name}
                </p>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </SectionFrame>
  );
}

export function AboutSection({ store, settings }: SectionProps) {
  const title = str(settings.title).trim();
  const body = str(settings.body).trim();
  const image = safeUrl(settings.image);
  if (!title && !body && !image) return null;
  return (
    <section className="border-t py-12 sm:py-16" style={{ borderColor: "var(--sf-color-border)" }}>
      <Container className="grid gap-8 md:grid-cols-2 md:items-center">
        <div className="min-w-0">
          {title ? <Heading size="h2">{title}</Heading> : null}
          {body ? <Muted className="mt-4 whitespace-pre-line">{body}</Muted> : null}
        </div>
        {image ? (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--sf-radius)] border" style={{ borderColor: "var(--sf-color-border)" }}>
            <Image src={image} alt={title || store.name} fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
          </div>
        ) : null}
      </Container>
    </section>
  );
}

export function GallerySection({ settings }: SectionProps) {
  const title = str(settings.title).trim() || "Gallery";
  const images = lineList(settings.images)
    .map((entry) => safeUrl(entry))
    .filter(Boolean);
  return (
    <SectionFrame className="border-t" >
      <Container>
        <div className="mb-6">
          <Heading>{title}</Heading>
        </div>
        {images.length === 0 ? (
          <EmptyNote>No gallery images yet.</EmptyNote>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((url, index) => (
              <div key={`${url}-${index}`} className="relative aspect-square w-full overflow-hidden rounded-[var(--sf-radius)] border" style={{ borderColor: "var(--sf-color-border)" }}>
                <Image src={url} alt={`Gallery image ${index + 1}`} fill unoptimized sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </Container>
    </SectionFrame>
  );
}

export function TestimonialsSection({ settings }: SectionProps) {
  const title = str(settings.title).trim() || "What customers say";
  const items = testimonialList(settings.items);
  return (
    <SectionFrame className="border-t" >
      <Container>
        <div className="mb-6">
          <Heading>{title}</Heading>
        </div>
        {items.length === 0 ? (
          <EmptyNote>No testimonials yet.</EmptyNote>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {items.map((item, index) => (
              <figure key={`${item.name}-${index}`} className="flex flex-col rounded-[var(--sf-radius)] border p-5" style={{ borderColor: "var(--sf-color-border)" }}>
                <blockquote className="text-[length:var(--sf-body)] italic leading-relaxed" style={{ color: "var(--sf-color-text)" }}>
                  {item.quote}
                </blockquote>
                <figcaption className="mt-4 text-sm" style={{ color: "var(--sf-color-muted)" }}>
                  <span className="font-medium" style={{ color: "var(--sf-color-text)" }}>
                    {item.name || "Customer"}
                  </span>
                  {item.role ? ` · ${item.role}` : ""}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </Container>
    </SectionFrame>
  );
}

export function FaqSection({ settings }: SectionProps) {
  const title = str(settings.title).trim() || "Frequently asked questions";
  const items = faqList(settings.items);
  return (
    <SectionFrame className="border-t" >
      <Container className="max-w-3xl">
        <div className="mb-6">
          <Heading>{title}</Heading>
        </div>
        {items.length === 0 ? (
          <EmptyNote>No questions added yet.</EmptyNote>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <details key={`${item.q}-${index}`} className="group rounded-[var(--sf-radius)] border px-4 py-3" style={{ borderColor: "var(--sf-color-border)" }}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden" style={{ color: "var(--sf-color-text)" }}>
                  {item.q}
                  <span aria-hidden className="transition-transform group-open:rotate-45" style={{ color: "var(--sf-color-muted)" }}>
                    +
                  </span>
                </summary>
                <p className="mt-2 text-[length:var(--sf-body)] leading-relaxed" style={{ color: "var(--sf-color-muted)" }}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        )}
      </Container>
    </SectionFrame>
  );
}

export function ContactSection({ settings }: SectionProps) {
  const title = str(settings.title).trim() || "Contact us";
  const rows = [
    { icon: Mail, label: "Email", value: str(settings.email).trim(), href: `mailto:${str(settings.email).trim()}` },
    { icon: Phone, label: "Phone", value: str(settings.phone).trim(), href: `tel:${str(settings.phone).trim()}` },
    { icon: MapPin, label: "Address", value: str(settings.address).trim(), href: "" },
    { icon: Clock, label: "Hours", value: str(settings.hours).trim(), href: "" },
  ].filter((row) => row.value !== "");
  return (
    <SectionFrame className="border-t" >
      <Container className="max-w-3xl">
        <div className="mb-6">
          <Heading>{title}</Heading>
        </div>
        {rows.length === 0 ? (
          <EmptyNote>Contact details not available.</EmptyNote>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label} className="flex items-start gap-3 rounded-[var(--sf-radius)] border p-4" style={{ borderColor: "var(--sf-color-border)" }}>
                <row.icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--sf-color-primary)" }} />
                <div className="min-w-0">
                  <dt className="text-xs uppercase tracking-wide" style={{ color: "var(--sf-color-muted)" }}>
                    {row.label}
                  </dt>
                  <dd className="mt-0.5 break-words text-sm" style={{ color: "var(--sf-color-text)" }}>
                    {row.href ? (
                      <a href={row.href} className="font-medium underline-offset-4 hover:underline" style={{ color: "var(--sf-color-primary)" }}>
                        {row.value}
                      </a>
                    ) : (
                      row.value
                    )}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        )}
      </Container>
    </SectionFrame>
  );
}

export function MapSection({ settings }: SectionProps) {
  const title = str(settings.title).trim() || "Find us";
  const query = str(settings.query).trim();
  return (
    <SectionFrame className="border-t" >
      <Container>
        <div className="mb-6">
          <Heading>{title}</Heading>
        </div>
        {query ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[var(--sf-radius)] border" style={{ borderColor: "var(--sf-color-border)" }}>
            <iframe
              title={`Map showing ${query}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        ) : (
          <EmptyNote>Map location not set.</EmptyNote>
        )}
      </Container>
    </SectionFrame>
  );
}

export function NewsletterSection({ settings }: SectionProps) {
  const title = str(settings.title).trim() || "Stay in the loop";
  const body = str(settings.body).trim();
  return (
    <section className="border-t py-12" style={{ borderColor: "var(--sf-color-border)" }}>
      <Container className="max-w-2xl text-center">
        <Heading>{title}</Heading>
        {body ? <Muted className="mt-3">{body}</Muted> : null}
        <div className="mx-auto mt-6 flex w-full max-w-md flex-col gap-2 sm:flex-row">
          <input
            type="email"
            placeholder="you@example.com"
            disabled
            aria-label="Email address"
            className="h-11 w-full rounded-[var(--sf-radius)] border bg-white px-3 text-sm opacity-60"
            style={{ borderColor: "var(--sf-color-border)" }}
          />
          <button
            type="button"
            disabled
            className="h-11 shrink-0 px-6 text-sm font-medium opacity-60"
            style={{ background: "var(--sf-button-bg)", color: "var(--sf-button-fg)", border: "1px solid var(--sf-button-border)", borderRadius: "var(--sf-radius-button)" }}
          >
            Subscribe
          </button>
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--sf-color-muted)" }}>
          Newsletter signup is not connected yet.
        </p>
      </Container>
    </section>
  );
}

export function CustomContentSection({ settings }: SectionProps) {
  const heading = str(settings.heading).trim();
  const body = str(settings.body).trim();
  if (!heading && !body) return null;
  return (
    <SectionFrame className="border-t" >
      <Container className="max-w-3xl">
        {heading ? <Heading size="h2">{heading}</Heading> : null}
        {body ? <Muted className={heading ? "mt-4 whitespace-pre-line" : "whitespace-pre-line"}>{body}</Muted> : null}
      </Container>
    </SectionFrame>
  );
}

export function FooterSection({ settings }: SectionProps) {
  const text = str(settings.text).trim();
  if (!text) return null;
  return (
    <div className="border-t py-6" style={{ borderColor: "var(--sf-color-border)", background: "var(--sf-color-background)" }}>
      <Container>
        <p className="text-center text-xs" style={{ color: "var(--sf-color-muted)" }}>
          {text}
        </p>
      </Container>
    </div>
  );
}
