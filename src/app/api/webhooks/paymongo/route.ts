import { logger } from "@/lib/logging";
import { paymongoProvider } from "@/lib/payments/paymongo";

export async function POST(request: Request) {
  const result = await paymongoProvider.handleWebhook(request);
  if (!result.handled) {
    logger.warn("paymongo webhook rejected", { error: result.error });
    return Response.json({ error: result.error ?? "Rejected" }, { status: 400 });
  }
  if (result.error) return Response.json({ ok: false, error: result.error }, { status: 500 });
  return Response.json({ ok: true });
}
