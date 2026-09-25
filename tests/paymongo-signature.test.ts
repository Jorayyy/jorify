import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyPaymongoSignature } from "@/lib/payments/paymongo";

const SECRET = "whsec_test_secret";
const BODY = JSON.stringify({ data: { type: "checkout_session.payment.paid" } });

function sign(body: string, secret: string, offsetSeconds = 0): string {
  const t = Math.floor(Date.now() / 1000) + offsetSeconds;
  const hmac = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return `t=${t},te=${hmac}`;
}

describe("verifyPaymongoSignature", () => {
  it("accepts a valid test signature", () => {
    expect(verifyPaymongoSignature(sign(BODY, SECRET), BODY, SECRET)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const header = sign(BODY, SECRET);
    expect(verifyPaymongoSignature(header, `${BODY} `, SECRET)).toBe(false);
  });

  it("rejects the wrong secret", () => {
    expect(verifyPaymongoSignature(sign(BODY, SECRET), BODY, "other_secret")).toBe(false);
  });

  it("rejects stale timestamps", () => {
    expect(verifyPaymongoSignature(sign(BODY, SECRET, -3600), BODY, SECRET)).toBe(false);
  });

  it("rejects missing header", () => {
    expect(verifyPaymongoSignature(null, BODY, SECRET)).toBe(false);
  });
});
