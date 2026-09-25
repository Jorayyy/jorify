# Jorify

Multi-tenant, Shopify-style commerce SaaS. One codebase serves any business type — retail, bakery, cafe, salon, pet shop, and more — with a public storefront and a full back-office admin.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (no config file — `@import "tailwindcss"`)
- **Drizzle ORM** + **PostgreSQL** (Neon serverless, free tier)
- **Auth.js v5** (credentials, JWT sessions) with static role → permission registry
- **Stripe** payments, **Vercel Blob** storage (both optional)
- **Vitest** for tests, **ESLint** for lint

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, AUTH_SECRET
npm run db:migrate           # apply schema to the database
npm run db:seed              # demo stores + data (re-runnable)
npm run dev
```

### Environment (`.env.local`)

| Key | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon/Postgres connection string (`?sslmode=require`) |
| `AUTH_SECRET` | Session signing (`openssl rand -base64 32`) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Optional — payments show "not configured" until set |
| `BLOB_READ_WRITE_TOKEN` | Optional — Vercel Blob for image uploads |

`.env*` is gitignored. Never commit real secrets.

### Demo logins (after `db:seed`)

| Email | Password | Notes |
| --- | --- | --- |
| `demo@jorify.test` | `demo-password-123` | Owner of all 5 demo stores |
| `viewer@jorify.test` | `demo-password-123` | Viewer role (read-only) |

Demo storefronts: `/generation-bread`, `/sample-clothing`, `/sample-cafe`, `/sample-pet-shop`, `/sample-salon`. Admin lives at `/admin/<store-slug>`.

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run start        # serve production build
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run db:generate  # generate migration from schema changes
npm run db:migrate   # apply migrations
npm run db:push      # push schema directly (dev only)
npm run db:seed      # seed demo data (idempotent)
```

## Architecture notes

- **Tenancy**: shared schema, `store_id` on every business table. Every admin page and server action calls `requireStoreContext(storeSlug)` and asserts permissions — the context only resolves if the signed-in user's organization owns that store (`src/lib/tenancy/context.ts`).
- **Permissions**: `owner | admin | manager | staff | viewer` mapped to a static permission list (`src/lib/auth/permissions.ts`). Enforced server-side; the sidebar hiding items is cosmetic only.
- **Money**: integer minor units everywhere; render with `formatMoney(amount, currency)`.
- **Business types**: `src/lib/business-types/index.ts` drives nav, modules, order statuses, themes and product attributes per industry — registering a new industry is data, not code.
- **Storefront**: DB-driven page builder (sections, navigation, themes) under `src/app/[store]` with theme presets in `src/lib/storefront/themes.ts`.
- **Honest labeling**: unimplemented integrations (email/SMS delivery, domain DNS verification, payment processor) are surfaced as "not configured" — never faked as working.

## Tests

```bash
npm test
```

- `tests/tenant-isolation.test.ts` — **critical**: runs against the live database and proves tenant A can never read tenant B's stores, products, or orders (skip automatically if `DATABASE_URL` is unset).
- `tests/permissions.test.ts` — role → permission rules.
- `tests/discounts.test.ts` — discount math and money formatting.

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Create a Neon project, copy the connection string.
3. In Vercel: import the repo, set `DATABASE_URL`, `AUTH_SECRET` (and optional Stripe/Blob vars).
4. Locally or in a CI step: `npm run db:migrate` against production (or wire `db:migrate` into the build).
5. Custom domains: add the domain in the admin (Settings → Domains), point DNS at Vercel. Domain verification and auto-SSL display as "pending" until a verification endpoint is implemented.
