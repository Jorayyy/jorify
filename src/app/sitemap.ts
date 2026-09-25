import type { MetadataRoute } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { logger } from "@/lib/logging";

const base = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: base(), changeFrequency: "weekly", priority: 1 },
    { url: `${base()}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base()}/register`, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const rows = await db
      .select({ slug: stores.slug, updatedAt: stores.updatedAt })
      .from(stores)
      .where(and(eq(stores.status, "active"), isNull(stores.deletedAt)))
      .limit(2000);

    for (const row of rows) {
      entries.push(
        { url: `${base()}/${row.slug}`, changeFrequency: "daily", priority: 0.9 },
        { url: `${base()}/${row.slug}/products`, changeFrequency: "daily", priority: 0.8 },
      );
    }
  } catch (error) {
    logger.warn("sitemap: store listing unavailable", { error: String(error) });
  }

  return entries;
}
