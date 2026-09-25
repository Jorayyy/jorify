import { and, desc, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { carts, cartItems, productVariants, products, stores } from "@/lib/db/schema";

export async function getCartSessionKey(storeId: string): Promise<string> {
  const store = await db.query.stores.findFirst({ where: eq(stores.id, storeId) });
  const name = `cart_${(store?.slug ?? storeId).slice(0, 32)}`;
  const jar = await cookies();
  const existing = jar.get(name)?.value;
  if (existing) return existing;
  const created = crypto.randomUUID();
  jar.set(name, created, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return created;
}

export async function readCartSessionKey(storeId: string): Promise<string | null> {
  const store = await db.query.stores.findFirst({ where: eq(stores.id, storeId), columns: { slug: true } });
  const name = `cart_${(store?.slug ?? storeId).slice(0, 32)}`;
  return (await cookies()).get(name)?.value ?? null;
}

export async function getCart(storeId: string, sessionKey: string) {
  const cart = await db.query.carts.findFirst({
    where: and(eq(carts.storeId, storeId), eq(carts.sessionKey, sessionKey), eq(carts.status, "active")),
    with: {
      items: {
        with: { product: { with: { images: true } }, variant: true },
        orderBy: [cartItems.createdAt],
      },
    },
  });
  if (!cart) return null;

  const subtotal = cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return { ...cart, subtotal };
}

export async function getOrCreateCart(storeId: string, sessionKey: string) {
  const existing = await db.query.carts.findFirst({
    where: and(eq(carts.storeId, storeId), eq(carts.sessionKey, sessionKey), eq(carts.status, "active")),
  });
  if (existing) return existing;
  const [cart] = await db
    .insert(carts)
    .values({ storeId, sessionKey })
    .returning();
  return cart;
}

export async function addToCart(
  storeId: string,
  sessionKey: string,
  input: { productId: string; variantId?: string | null; quantity?: number },
) {
  const quantity = Math.max(1, input.quantity ?? 1);
  const product = await db.query.products.findFirst({
    where: eq(products.id, input.productId),
  });
  if (!product || product.storeId !== storeId || product.deletedAt || product.status !== "active") {
    throw new Error("Product is not available");
  }

  let unitPrice = product.price;
  if (input.variantId) {
    const variant = await db.query.productVariants.findFirst({ where: eq(productVariants.id, input.variantId) });
    if (!variant || variant.storeId !== storeId) throw new Error("Variant is not available");
    unitPrice = variant.price;
  }

  const cart = await getOrCreateCart(storeId, sessionKey);
  const existingItem = await db.query.cartItems.findFirst({
    where: input.variantId
      ? and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, input.variantId))
      : and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, input.productId), isNull(cartItems.variantId)),
  });

  if (existingItem) {
    await db
      .update(cartItems)
      .set({ quantity: existingItem.quantity + quantity, updatedAt: new Date() })
      .where(eq(cartItems.id, existingItem.id));
  } else {
    await db.insert(cartItems).values({
      cartId: cart.id,
      storeId,
      productId: input.productId,
      variantId: input.variantId ?? null,
      quantity,
      unitPrice,
    });
  }

  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
  return getCart(storeId, sessionKey);
}

export async function updateCartItem(storeId: string, sessionKey: string, itemId: string, quantity: number) {
  const cart = await getCart(storeId, sessionKey);
  if (!cart) return null;
  const item = cart.items.find((row) => row.id === itemId);
  if (!item) return null;

  if (quantity <= 0) {
    await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.storeId, storeId)));
  } else {
    await db
      .update(cartItems)
      .set({ quantity, updatedAt: new Date() })
      .where(and(eq(cartItems.id, itemId), eq(cartItems.storeId, storeId)));
  }
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
  return getCart(storeId, sessionKey);
}

export async function removeCartItem(storeId: string, sessionKey: string, itemId: string) {
  return updateCartItem(storeId, sessionKey, itemId, 0);
}

export async function setCartCode(storeId: string, sessionKey: string, code: string | null) {
  const cart = await getOrCreateCart(storeId, sessionKey);
  await db.update(carts).set({ discountCode: code, updatedAt: new Date() }).where(eq(carts.id, cart.id));
  return getCart(storeId, sessionKey);
}

export async function clearCart(storeId: string, sessionKey: string) {
  const cart = await db.query.carts.findFirst({
    where: and(eq(carts.storeId, storeId), eq(carts.sessionKey, sessionKey)),
    orderBy: [desc(carts.updatedAt)],
  });
  if (!cart) return;
  await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
  await db.delete(carts).where(eq(carts.id, cart.id));
}
