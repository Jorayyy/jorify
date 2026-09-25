export type CheckoutRequest = {
  storeId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  shippingAmount?: number;
  taxAmount?: number;
  discountAmount?: number;
  metadata?: Record<string, string>;
};

export type CheckoutResult = { mode: "redirect"; url: string } | { mode: "offline" };

export type WebhookResult = { handled: boolean; error?: string };

export type PaymentProvider = {
  key: string;
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  handleWebhook(request: Request): Promise<WebhookResult>;
};
