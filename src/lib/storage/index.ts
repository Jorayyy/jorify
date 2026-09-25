export type StorageProvider = {
  key: string;
  put(input: { key: string; data: Uint8Array; contentType: string }): Promise<{ url: string }>;
  delete(url: string): Promise<void>;
};

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("File storage is not configured. Set BLOB_READ_WRITE_TOKEN to enable uploads.");
    this.name = "StorageNotConfiguredError";
  }
}

const vercelBlobProvider: StorageProvider = {
  key: "vercel-blob",
  async put({ key, data, contentType }) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new StorageNotConfiguredError();
    const { put } = await import("@vercel/blob");
    const blob = await put(key, Buffer.from(data), { access: "public", token, contentType });
    return { url: blob.url };
  },
  async delete(url) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new StorageNotConfiguredError();
    const { del } = await import("@vercel/blob");
    await del(url, { token });
  },
};

export function getStorageProvider(): StorageProvider {
  if (process.env.BLOB_READ_WRITE_TOKEN) return vercelBlobProvider;
  return vercelBlobProvider;
}

export function storageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
