import { and, eq } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { orders, payments } from "@/lib/db/schema";
import { captureError, logger } from "@/lib/logging";
import type { CheckoutRequest, CheckoutResult, PaymentProvider, WebhookResult } from "./types";

const CHECKOUT_URL = "https://api.paymongo.com/v2/checkout_sessions";

function authHeader(): string | null {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) return null;
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

export function verifyPaymongoSignature(header: string | null, rawBody: string, secret: string): boolean {
  if (!header) return false;

  const parts: Record<string, string> = {};
  for (const chunk of header.split(",")) {
    const index = chunk.indexOf("=");
    if (index > 0) parts[chunk.slice(0, index).trim()] = chunk.slice(index + 1);
  }

  const timestamp = parts.t;
  if (!timestamp || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return [parts.te, parts.li].filter(Boolean).some((signature) => {
    const signatureBuffer = Buffer.from(signature, "utf8");
    return signatureBuffer.length === expectedBuffer.length && timingSafeEqual(signatureBuffer, expectedBuffer);
  });
}

export const paymongoProvider: PaymentProvider = {
  key: "paymongo",

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const auth = authHeader();
    if (!auth) throw new Error("PayMongo is not configured (missing PAYMONGO_SECRET_KEY)");

    const response = await fetch(CHECKOUT_URL, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: [
              { name: request.description.slice(0, 120), amount: request.amount, currency: request.currency, quantity: 1 },
            ],
            success_url: request.successUrl,
            cancel_url: request.cancelUrl,
            reference_number: request.orderNumber,
          },
        },
      }),
    });

    const json = (await response.json().catch(() => null)) as {
      data?: { id?: string; attributes?: { checkout_url?: string } };
      errors?: { detail?: string }[];
    };
    const checkoutUrl = json?.data?.attributes?.checkout_url;
    const sessionId = json?.data?.id;
    if (!response.ok || !checkoutUrl || !sessionId) {
      throw new Error(json?.errors?.[0]?.detail ?? "PayMongo checkout failed");
    }

    await db.insert(payments).values({
      storeId: request.storeId,
      orderId: request.orderId,
      provider: "paymongo",
      status: "pending",
      amount: request.amount,
      currency: request.currency,
      externalId: sessionId,
      payload: { sessionId, referenceNumber: request.orderNumber },
    });

    return { mode: "redirect", url: checkoutUrl };
  },

  async handleWebhook(request: Request): Promise<WebhookResult> {
    const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
    if (!secret) return { handled: false, error: "PayMongo webhook is not configured" };

    const signature = request.headers.get("paymongo-signature");
    const payload = await request.text();

    if (!verifyPaymongoSignature(signature, payload, secret)) {
      await captureError({ error: new Error("Invalid PayMongo signature"), action: "paymongo.webhook.verify" });
      return { handled: false, error: "Invalid signature" };
    }

    let event: { data?: { type?: string; data?: { id?: string; attributes?: Record<string, unknown> } } };
    try {
      event = JSON.parse(payload);
    } catch {
      return { handled: false, error: "Invalid payload" };
    }

    const type = event.data?.type;
    if (type !== "checkout_session.payment.paid") return { handled: true };

    const sessionId = event.data?.data?.id;
    if (!sessionId) return { handled: true };

    try {
      const payment = await db.query.payments.findFirst({
        where: and(eq(payments.provider, "paymongo"), eq(payments.externalId, sessionId)),
      });
      if (payment) {
        await db.transaction(async (tx) => {
          const [order] = await tx
            .update(orders)
            .set({ paymentStatus: "paid", status: "confirmed", updatedAt: new Date() })
            .where(and(eq(orders.id, payment.orderId), eq(orders.storeId, payment.storeId)))
            .returning();
          if (order) {
            await tx
              .update(payments)
              .set({ status: "succeeded", updatedAt: new Date() })
              .where(eq(payments.id, payment.id));
          }
        });
        logger.info("paymongo payment captured", { orderId: payment.orderId, sessionId });
      }
    } catch (error) {
      await captureError({ error, action: "paymongo.webhook.fulfill", context: { sessionId } });
      return { handled: true, error: "fulfillment_failed" };
    }

    return { handled: true };
  },
};
