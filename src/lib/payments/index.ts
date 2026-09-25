import { paymongoProvider } from "./paymongo";
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
  if (configured === "paymongo" && process.env.PAYMONGO_SECRET_KEY) return paymongoProvider;
  return manualProvider;
}

export function availablePaymentProviders(): string[] {
  const providers = ["manual"];
  if (process.env.STRIPE_SECRET_KEY) providers.push("stripe");
  if (process.env.PAYMONGO_SECRET_KEY) providers.push("paymongo");
  return providers;
}
