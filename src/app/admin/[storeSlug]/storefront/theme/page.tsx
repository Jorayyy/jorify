import { eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { storeThemes } from "@/lib/db/schema";
import { getTheme, resolveThemeSettings } from "@/lib/storefront/themes";
import { requireStoreContext } from "@/lib/tenancy/context";
import { ThemeEditor } from "./theme-editor";

type Props = { params: Promise<{ storeSlug: string }> };

export default async function ThemeAdminPage({ params }: Props) {
  const { storeSlug } = await params;
  const ctx = await requireStoreContext(storeSlug);

  const rows = await db.query.storeThemes.findMany({
    where: eq(storeThemes.storeId, ctx.store.id),
  });
  const published = rows.find((row) => row.isPublished) ?? null;
  const theme = getTheme(published?.themeKey);
  const settings = resolveThemeSettings(theme, published?.settings);

  return (
    <div>
      <Link
        href={`/admin/${storeSlug}/storefront`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Storefront
      </Link>
      <PageHeader title="Theme" description="Pick a look, then tune colours, type and corners." />
      <ThemeEditor
        storeSlug={storeSlug}
        initial={{ themeKey: theme.key, ...settings }}
        canEdit={ctx.can("storefront.update")}
      />
    </div>
  );
}
