import { stripeProvider } from "@/lib/payments/stripe";
import { logger } from "@/lib/logging";

export async function POST(request: Request) {
  const result = await stripeProvider.handleWebhook(request);
  if (!result.handled) {
    logger.warn("stripe webhook rejected", { error: result.error });
    return Response.json({ error: result.error ?? "Rejected" }, { status: 400 });
  }
  if (result.error) return Response.json({ ok: false, error: result.error }, { status: 500 });
  return Response.json({ ok: true });
}
