import { and, eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { orderItems, orders, payments } from "@/lib/db/schema";
import { captureError, logger } from "@/lib/logging";
import type { CheckoutRequest, CheckoutResult, PaymentProvider, WebhookResult } from "./types";

function getClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export const stripeProvider: PaymentProvider = {
  key: "stripe",

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const stripe = getClient();
    if (!stripe) throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY)");

    const items = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, request.orderId) });

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: request.currency.toLowerCase(),
        unit_amount: item.unitPrice,
        product_data: { name: item.title + (item.variantTitle ? ` — ${item.variantTitle}` : "") },
      },
    }));

    if ((request.shippingAmount ?? 0) > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: request.currency.toLowerCase(),
          unit_amount: request.shippingAmount ?? 0,
          product_data: { name: "Shipping" },
        },
      });
    }
    if ((request.taxAmount ?? 0) > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: request.currency.toLowerCase(),
          unit_amount: request.taxAmount ?? 0,
          product_data: { name: "Tax" },
        },
      });
    }

    const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
    if ((request.discountAmount ?? 0) > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: request.discountAmount ?? 0,
        currency: request.currency.toLowerCase(),
        duration: "once",
        max_redemptions: 1,
        name: request.description.slice(0, 40),
      });
      discounts.push({ coupon: coupon.id });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: request.successUrl,
      cancel_url: request.cancelUrl,
      customer_email: request.customerEmail,
      metadata: { orderId: request.orderId, storeId: request.storeId, ...(request.metadata ?? {}) },
      line_items: lineItems,
      ...(discounts.length ? { discounts } : {}),
    });

    await db.insert(payments).values({
      storeId: request.storeId,
      orderId: request.orderId,
      provider: "stripe",
      status: "pending",
      amount: request.amount,
      currency: request.currency,
      externalId: session.id,
      payload: { sessionId: session.id },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { mode: "redirect", url: session.url };
  },

  async handleWebhook(request: Request): Promise<WebhookResult> {
    const stripe = getClient();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !secret) return { handled: false, error: "Stripe webhook is not configured" };

    const signature = request.headers.get("stripe-signature");
    if (!signature) return { handled: false, error: "Missing signature" };

    const payload = await request.text();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      await captureError({ error, action: "stripe.webhook.verify" });
      return { handled: false, error: "Invalid signature" };
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      const storeId = session.metadata?.storeId;
      if (orderId && storeId) {
        try {
          await db.transaction(async (tx) => {
            const [order] = await tx
              .update(orders)
              .set({ paymentStatus: "paid", status: "confirmed", updatedAt: new Date() })
              .where(and(eq(orders.id, orderId), eq(orders.storeId, storeId)))
              .returning();
            if (order) {
              await tx
                .update(payments)
                .set({ status: "succeeded", updatedAt: new Date() })
                .where(and(eq(payments.orderId, orderId), eq(payments.externalId, session.id)));
            }
          });
          logger.info("stripe payment captured", { orderId, sessionId: session.id });
        } catch (error) {
          await captureError({ error, action: "stripe.webhook.fulfill", context: { orderId } });
          return { handled: true, error: "fulfillment_failed" };
        }
      }
    }

    return { handled: true };
  },
};
