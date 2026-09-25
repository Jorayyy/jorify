import Link from "next/link";
import { Boxes, CreditCard, Palette, ShieldCheck, Store, Users } from "lucide-react";

const features = [
  { icon: Store, title: "Multi-tenant by design", body: "Every business gets isolated data, roles and settings from day one." },
  { icon: Boxes, title: "Flexible catalog", body: "Products, services, custom variant attributes and a real inventory ledger." },
  { icon: Palette, title: "No-code storefront", body: "Compose pages from JSON sections, theme colors and typography." },
  { icon: CreditCard, title: "Pluggable payments", body: "A provider abstraction with Stripe and manual payments today." },
  { icon: Users, title: "Employees & permissions", body: "Owner, admin, manager, staff and viewer with server-side checks." },
  { icon: ShieldCheck, title: "Production foundations", body: "Audit logs, structured errors, entitlements and tenant isolation tests." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-zinc-900 text-xs text-white">J</span>
          Jorify
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Start free
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-14">
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
          Business operating platform with commerce
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Run a retail shop, bakery, salon or restaurant on one configurable platform.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-zinc-600">
          Jorify adapts to the business type you choose: catalog, orders, appointments, delivery, analytics and a
          customizable storefront — enabled per store, not hard-coded.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="inline-flex h-10 items-center rounded-md bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Create your store
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-md border border-zinc-300 px-5 text-sm font-medium hover:bg-zinc-50"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-lg border border-zinc-200 p-5">
              <feature.icon className="mb-3 h-5 w-5 text-zinc-900" />
              <h2 className="text-sm font-semibold">{feature.title}</h2>
              <p className="mt-1 text-sm text-zinc-600">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-100 py-8 text-center text-xs text-zinc-500">
        Jorify — demo platform. Seed data is clearly marked as demo data.
      </footer>
    </main>
  );
}
