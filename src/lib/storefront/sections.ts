import type { ReactNode } from "react";
import type { PageSection } from "@/lib/db/schema";
import type { resolvePublicStore } from "@/lib/services/storefront";
import {
  AboutSection,
  AnnouncementSection,
  CategoriesSection,
  ContactSection,
  CustomContentSection,
  FaqSection,
  FeaturedProductsSection,
  FooterSection,
  GallerySection,
  HeroSection,
  MapSection,
  NewsletterSection,
  ProductGridSection,
  TestimonialsSection,
} from "@/components/storefront/sections";

type ResolvedStore = Exclude<Awaited<ReturnType<typeof resolvePublicStore>>, null>;

export type StorefrontStore = ResolvedStore["store"];

export type SectionProps = {
  store: StorefrontStore;
  settings: Record<string, unknown>;
  section: PageSection;
};

export type SectionComponent = (props: SectionProps) => ReactNode | Promise<ReactNode>;

export type SectionFieldDefaults = Record<string, string | number>;

export type SectionDef = {
  label: string;
  settingsDefaults: SectionFieldDefaults;
  component: SectionComponent;
};

export const SECTION_REGISTRY: Record<string, SectionDef> = {
  announcement: {
    label: "Announcement bar",
    settingsDefaults: { text: "Welcome to our store", linkLabel: "", linkHref: "" },
    component: AnnouncementSection,
  },
  hero: {
    label: "Hero",
    settingsDefaults: {
      heading: "Shop the latest",
      subheading: "",
      buttonLabel: "Browse products",
      buttonHref: "/products",
      image: "",
    },
    component: HeroSection,
  },
  featured_products: {
    label: "Featured products",
    settingsDefaults: { title: "Featured products", limit: 8 },
    component: FeaturedProductsSection,
  },
  product_grid: {
    label: "Product grid",
    settingsDefaults: { title: "All products", limit: 24 },
    component: ProductGridSection,
  },
  categories: {
    label: "Categories",
    settingsDefaults: { title: "Shop by category" },
    component: CategoriesSection,
  },
  about: {
    label: "About",
    settingsDefaults: { title: "About us", body: "", image: "" },
    component: AboutSection,
  },
  gallery: {
    label: "Gallery",
    settingsDefaults: { title: "Gallery", images: "" },
    component: GallerySection,
  },
  testimonials: {
    label: "Testimonials",
    settingsDefaults: { title: "What customers say", items: "" },
    component: TestimonialsSection,
  },
  faq: {
    label: "FAQ",
    settingsDefaults: {
      title: "Frequently asked questions",
      items: "Do you offer delivery?|Yes. Enter your address at checkout.\nHow do I track my order?|Use the link in your confirmation email.",
    },
    component: FaqSection,
  },
  contact: {
    label: "Contact",
    settingsDefaults: { title: "Contact us", email: "", phone: "", address: "", hours: "" },
    component: ContactSection,
  },
  map: {
    label: "Map",
    settingsDefaults: { title: "Find us", query: "" },
    component: MapSection,
  },
  newsletter: {
    label: "Newsletter",
    settingsDefaults: { title: "Stay in the loop", body: "" },
    component: NewsletterSection,
  },
  custom_content: {
    label: "Custom content",
    settingsDefaults: { heading: "", body: "" },
    component: CustomContentSection,
  },
  footer: {
    label: "Footer band",
    settingsDefaults: { text: "" },
    component: FooterSection,
  },
};

export function getSectionDef(type: string): SectionDef | null {
  return SECTION_REGISTRY[type] ?? null;
}

export function mergeSectionSettings(defaults: SectionFieldDefaults, raw: unknown): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...defaults };
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return merged;
  for (const [key, value] of Object.entries(raw)) {
    if (!(key in defaults)) continue;
    if (value === undefined || value === null) continue;
    merged[key] = typeof defaults[key] === "number" ? (Number.isFinite(Number(value)) ? Number(value) : defaults[key]) : value;
  }
  return merged;
}
