import { stripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

const manualProvider: PaymentProvider = {
  key: "manual",
  async createCheckout() {
    return { mode: "offline" };
  },
  async handleWebhook() {
    return { handled: false, error: "Manual payments have no webhooks" };
  },
};

export function getPaymentProvider(): PaymentProvider {
  const configured = process.env.PAYMENT_PROVIDER ?? "manual";
  if (configured === "stripe" && process.env.STRIPE_SECRET_KEY) return stripeProvider;
  return manualProvider;
}

export function availablePaymentProviders(): string[] {
  return process.env.STRIPE_SECRET_KEY ? ["manual", "stripe"] : ["manual"];
}
