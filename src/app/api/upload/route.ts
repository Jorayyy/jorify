import { getStoreContext } from "@/lib/tenancy/context";
import { getStorageProvider, StorageNotConfiguredError } from "@/lib/storage";
import { captureError } from "@/lib/logging";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const storeSlug = String(form.get("storeSlug") ?? "");

    if (!(file instanceof File)) return Response.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) return Response.json({ error: "Unsupported file type" }, { status: 415 });
    if (file.size > MAX_BYTES) return Response.json({ error: "File is larger than 5MB" }, { status: 413 });

    const { getSessionUser } = await import("@/lib/tenancy/context");
    const user = await getSessionUser();
    const ctx = await getStoreContext(storeSlug, user);
    if (!ctx || !ctx.can("products.create")) {
      return Response.json({ error: "Not authorized" }, { status: 403 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const key = `stores/${ctx.store.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const storage = getStorageProvider();
    const result = await storage.put({ key, data: bytes, contentType: file.type });
    return Response.json({ url: result.url });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    await captureError({ error, action: "upload" });
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
