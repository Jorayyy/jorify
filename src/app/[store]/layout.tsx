import { StoreShell } from "@/components/storefront/layout";
import { resolvePublicStore } from "@/lib/services/storefront";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ store: string }>;
}) {
  const { store: storeSlug } = await params;
  const data = await resolvePublicStore(storeSlug);
  if (!data) return <div className="min-h-screen bg-white text-zinc-900">{children}</div>;
  return (
    <StoreShell store={data.store} navigation={data.navigation} theme={data.theme ?? null}>
      {children}
    </StoreShell>
  );
}
