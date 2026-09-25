import "./load-env";
import { eq, inArray, like } from "drizzle-orm";

import { hashPassword } from "../src/lib/auth/password";
import { db } from "../src/lib/db";
import {
  attributeDefinitions,
  customers,
  discounts,
  employees,
  inventory,
  inventoryTransactions,
  organizationMembers,
  organizations,
  orderEvents,
  orderItems,
  orders,
  plans,
  productCategories,
  productImages,
  products,
  productVariants,
  storeDomains,
  storeNavigation,
  storePages,
  storeSettings,
  storeThemes,
  stores,
  subscriptions,
  users,
} from "../src/lib/db/schema";

const DEMO_EMAIL = "demo@jorify.test";
const DEMO_VIEWER_EMAIL = "viewer@jorify.test";
const DEMO_PASSWORD = "demo-password-123";

type DemoVariant = { name: string; price: number; options: { name: string; value: string }[]; quantity: number; sku?: string };
type DemoProduct = {
  name: string;
  slug: string;
  price: number;
  compareAt?: number;
  category: string;
  description: string;
  featured?: boolean;
  type?: "product" | "service";
  durationMinutes?: number;
  tags?: string[];
  variants?: DemoVariant[];
  stock?: number;
};
type DemoStore = {
  org: string;
  store: string;
  slug: string;
  businessType: string;
  description: string;
  attributes: { name: string; values: string[] }[];
  categories: string[];
  products: DemoProduct[];
  customers: { first: string; last: string; email: string; phone?: string }[];
  orders: number;
  discount?: { name: string; code: string; type: "percentage" | "fixed"; value: number };
  staff?: { name: string; email: string; role: string }[];
};

const image = (seed: string) => `https://picsum.photos/seed/${seed}/900/700`;

const DEMO_STORES: DemoStore[] = [
  {
    org: "Generation Bread",
    store: "Generation Bread",
    slug: "generation-bread",
    businessType: "bakery",
    description: "Freshly baked sourdough, pandesal and pastries every morning.",
    attributes: [{ name: "Size", values: ['6"', '10"', '14"'] }],
    categories: ["Breads", "Pastries", "Bundles"],
    products: [
      { name: "Sourdough Loaf", slug: "sourdough-loaf", price: 32000, compareAt: 38000, category: "Breads", description: "48-hour fermented country loaf with a blistered crust.", featured: true, stock: 24, tags: ["fresh"] },
      { name: "Pandesal (12 pcs)", slug: "pandesal-12", price: 18000, category: "Breads", description: "Soft Filipino breakfast rolls, baked to order.", stock: 40, tags: ["bestseller"] },
      { name: "Ensaymada", slug: "ensaymada", price: 9500, category: "Pastries", description: "Buttery brioche roll with cheese and buttercream.", stock: 30 },
      { name: "Baker's Bundle", slug: "bakers-bundle", price: 59900, compareAt: 69000, category: "Bundles", description: "One loaf, six pandesal and two ensaymadas.", featured: true, stock: 12 },
    ],
    customers: [
      { first: "Maria", last: "Santos", email: "maria.santos@example.com", phone: "+639171234567" },
      { first: "Joel", last: "Reyes", email: "joel.reyes@example.com" },
      { first: "Ana", last: "Cruz", email: "ana.cruz@example.com", phone: "+639181112222" },
    ],
    orders: 14,
    discount: { name: "Opening week", code: "BREAD10", type: "percentage", value: 10 },
  },
  {
    org: "Sample Clothing Store",
    store: "Sample Clothing Store",
    slug: "sample-clothing",
    businessType: "fashion",
    description: "Everyday essentials cut for the Philippine climate.",
    attributes: [
      { name: "Size", values: ["XS", "S", "M", "L", "XL"] },
      { name: "Color", values: ["Black", "White", "Navy"] },
    ],
    categories: ["Tops", "Outerwear", "Bottoms"],
    products: [
      {
        name: "Classic Cotton Tee",
        slug: "classic-cotton-tee",
        price: 79900,
        compareAt: 99900,
        category: "Tops",
        description: "220gsm combed cotton, pre-shrunk.",
        featured: true,
        tags: ["essential"],
        variants: [
          { name: "Black / M", price: 79900, options: [{ name: "Color", value: "Black" }, { name: "Size", value: "M" }], quantity: 18, sku: "TEE-BLK-M" },
          { name: "Black / L", price: 79900, options: [{ name: "Color", value: "Black" }, { name: "Size", value: "L" }], quantity: 12, sku: "TEE-BLK-L" },
          { name: "White / M", price: 79900, options: [{ name: "Color", value: "White" }, { name: "Size", value: "M" }], quantity: 4, sku: "TEE-WHT-M" },
          { name: "Navy / L", price: 79900, options: [{ name: "Color", value: "Navy" }, { name: "Size", value: "L" }], quantity: 9, sku: "TEE-NVY-L" },
        ],
      },
      { name: "Oversized Denim Jacket", slug: "oversized-denim-jacket", price: 249900, category: "Outerwear", description: "Washed denim with a boxy cut.", featured: true, stock: 10, tags: ["new"] },
      { name: "Pleated Chinos", slug: "pleated-chinos", price: 159900, category: "Bottoms", description: "Tapered chinos in stone cotton twill.", stock: 16 },
    ],
    customers: [
      { first: "Bea", last: "Lim", email: "bea.lim@example.com", phone: "+639175556666" },
      { first: "Carlo", last: "Tan", email: "carlo.tan@example.com" },
      { first: "Diane", last: "Gonzales", email: "diane.gonzales@example.com" },
    ],
    orders: 18,
    discount: { name: "Welcome voucher", code: "STYLE200", type: "fixed", value: 20000 },
  },
  {
    org: "Sample Cafe",
    store: "Sample Cafe",
    slug: "sample-cafe",
    businessType: "cafe",
    description: "Single-origin coffee and all-day breakfast.",
    attributes: [
      { name: "Size", values: ["Small", "Medium", "Large"] },
      { name: "Milk", values: ["Regular", "Oat", "Almond"] },
    ],
    categories: ["Coffee", "Pastries", "Meals"],
    products: [
      {
        name: "Spanish Latte",
        slug: "spanish-latte",
        price: 16000,
        category: "Coffee",
        description: "Espresso, milk and a touch of condensed milk.",
        featured: true,
        variants: [
          { name: "Medium / Regular", price: 16000, options: [{ name: "Size", value: "Medium" }, { name: "Milk", value: "Regular" }], quantity: 999, sku: "LAT-MED" },
          { name: "Large / Oat", price: 19000, options: [{ name: "Size", value: "Large" }, { name: "Milk", value: "Oat" }], quantity: 999, sku: "LAT-LRG-OAT" },
        ],
      },
      { name: "Cold Brew Tonic", slug: "cold-brew-tonic", price: 17500, category: "Coffee", description: "18-hour cold brew over tonic and citrus.", stock: 999 },
      { name: "Butter Croissant", slug: "butter-croissant", price: 9500, category: "Pastries", description: "Laminated daily.", stock: 18 },
      { name: "Garlic Chicken Rice Bowl", slug: "garlic-chicken-rice", price: 14900, category: "Meals", description: "Garlic rice, fried chicken thigh, fried egg.", stock: 25 },
    ],
    customers: [
      { first: "Paolo", last: "Mendoza", email: "paolo.mendoza@example.com", phone: "+639170001111" },
      { first: "Trina", last: "Aquino", email: "trina.aquino@example.com" },
    ],
    orders: 22,
  },
  {
    org: "Sample Pet Shop",
    store: "Sample Pet Shop",
    slug: "sample-pet-shop",
    businessType: "pet_shop",
    description: "Pet food, grooming and wellness for city pets.",
    attributes: [
      { name: "Size", values: ["Small", "Medium", "Large"] },
      { name: "Flavor", values: ["Chicken", "Beef", "Fish"] },
    ],
    categories: ["Food", "Toys", "Grooming"],
    products: [
      { name: "Adult Dog Food — Chicken 5kg", slug: "adult-dog-food-chicken-5kg", price: 129900, category: "Food", description: "Complete and balanced kibble.", featured: true, stock: 20, tags: ["bestseller"] },
      { name: "Cat Tuna Treats", slug: "cat-tuna-treats", price: 24900, category: "Food", description: "Soft treats with real tuna.", stock: 45 },
      { name: "Rope Tug Toy", slug: "rope-tug-toy", price: 34900, category: "Toys", description: "Cotton rope for aggressive chewers.", stock: 30 },
      { name: "Full Grooming Session", slug: "full-grooming-session", price: 85000, category: "Grooming", description: "Bath, haircut, nail trim and ear cleaning.", type: "service", durationMinutes: 90, featured: true, stock: 0 },
    ],
    customers: [
      { first: "Miguel", last: "Ocampo", email: "miguel.ocampo@example.com", phone: "+639173334444" },
      { first: "Lara", last: "Diaz", email: "lara.diaz@example.com" },
    ],
    orders: 11,
    staff: [{ name: "Kim Flores", email: "kim.flores@example.com", role: "staff" }],
  },
  {
    org: "Sample Salon",
    store: "Sample Salon",
    slug: "sample-salon",
    businessType: "salon",
    description: "Cuts, color and treatments by appointment.",
    attributes: [{ name: "Length", values: ["Short", "Medium", "Long"] }],
    categories: ["Hair", "Treatment"],
    products: [
      { name: "Signature Haircut", slug: "signature-haircut", price: 45000, category: "Hair", description: "Consultation, cut and style.", type: "service", durationMinutes: 45, featured: true, stock: 0 },
      { name: "Hair Color — Full", slug: "hair-color-full", price: 180000, category: "Hair", description: "Ammonia-free color with gloss finish.", type: "service", durationMinutes: 120, stock: 0 },
      { name: "Keratin Treatment", slug: "keratin-treatment", price: 250000, category: "Treatment", description: "Smoothing treatment for frizz control.", type: "service", durationMinutes: 150, stock: 0 },
      { name: "Argan Hair Oil 50ml", slug: "argan-hair-oil-50ml", price: 59900, category: "Treatment", description: "Leave-in finishing oil.", stock: 15 },
    ],
    customers: [
      { first: "Nica", last: "Bautista", email: "nica.bautista@example.com", phone: "+639176667777" },
      { first: "Sam", last: "Rivera", email: "sam.rivera@example.com" },
    ],
    orders: 9,
    staff: [
      { name: "Joy Ramos", email: "joy.ramos@example.com", role: "manager" },
      { name: "Elmer Cruz", email: "elmer.cruz@example.com", role: "staff" },
    ],
  },
];

const PLANS = [
  {
    code: "free",
    name: "Free",
    description: "For trying the platform.",
    priceMonthly: 0,
    position: 0,
    entitlements: { "products.limit": 20, "employees.limit": 2, "stores.limit": 1, "orders.limit": 100, custom_domain: false, analytics: false, advanced_themes: false, abandoned_cart: false },
  },
  {
    code: "starter",
    name: "Starter",
    description: "For small shops finding their rhythm.",
    priceMonthly: 79900,
    position: 1,
    entitlements: { "products.limit": 200, "employees.limit": 5, "stores.limit": 2, "orders.limit": 5000, custom_domain: false, analytics: true, advanced_themes: false, abandoned_cart: false },
  },
  {
    code: "professional",
    name: "Professional",
    description: "For growing multi-staff businesses.",
    priceMonthly: 199900,
    position: 2,
    entitlements: { "products.limit": 5000, "employees.limit": 20, "stores.limit": 5, "orders.limit": 100000, custom_domain: true, analytics: true, advanced_themes: true, abandoned_cart: false },
  },
  {
    code: "business",
    name: "Business",
    description: "For established brands and franchises.",
    priceMonthly: 499900,
    position: 3,
    entitlements: { "products.limit": 100000, "employees.limit": 100, "stores.limit": 25, "orders.limit": 1000000, custom_domain: true, analytics: true, advanced_themes: true, abandoned_cart: true },
  },
];

function demoSections(name: string) {
  return [
    { id: crypto.randomUUID(), type: "announcement", enabled: true, settings: { text: "Demo store — sample data only" } },
    { id: crypto.randomUUID(), type: "hero", enabled: true, settings: { heading: name, subheading: "Demo storefront built on Jorify", buttonLabel: "Shop now", buttonHref: "/products" } },
    { id: crypto.randomUUID(), type: "featured_products", enabled: true, settings: { title: "Featured", limit: 8 } },
    { id: crypto.randomUUID(), type: "categories", enabled: true, settings: { title: "Shop by category" } },
    { id: crypto.randomUUID(), type: "about", enabled: true, settings: { title: "About", body: "This is demo data generated by the seed script." } },
    { id: crypto.randomUUID(), type: "footer", enabled: true, settings: { text: "Demo data · Jorify" } },
  ];
}

async function main() {
  await db.delete(organizations).where(like(organizations.slug, "%-demo"));
  await db.delete(users).where(inArray(users.email, [DEMO_EMAIL, DEMO_VIEWER_EMAIL]));

  for (const plan of PLANS) {
    await db.insert(plans).values(plan).onConflictDoUpdate({ target: plans.code, set: { ...plan } });
  }

  const owner = await db
    .insert(users)
    .values({ email: DEMO_EMAIL, name: "Demo Owner", passwordHash: hashPassword(DEMO_PASSWORD) })
    .returning();

  const second = await db
    .insert(users)
    .values({ email: DEMO_VIEWER_EMAIL, name: "Demo Viewer", passwordHash: hashPassword(DEMO_PASSWORD) })
    .returning();

  let orderCount = 0;

  for (const [index, demo] of DEMO_STORES.entries()) {
    const [organization] = await db
      .insert(organizations)
      .values({ name: `${demo.org} (Demo)`, slug: `${demo.slug}-demo` })
      .returning();

    await db.insert(organizationMembers).values([
      { organizationId: organization.id, userId: owner[0].id, role: "owner" },
      { organizationId: organization.id, userId: second[0].id, role: "viewer" },
    ]);

    const [store] = await db
      .insert(stores)
      .values({
        organizationId: organization.id,
        name: demo.store,
        slug: demo.slug,
        businessType: demo.businessType,
        description: demo.description,
      })
      .returning();

    await db.insert(storeSettings).values({
      storeId: store.id,
      contact: { email: `hello@${demo.slug}.test`, phone: "+63281234567" },
      checkout: { guestCheckout: true, requirePhone: false, orderNotes: true },
      taxes: { enabled: true, rate: 12 },
      seo: { title: `${demo.store} — demo store`, description: demo.description },
      notifications: { newOrder: true, lowStock: true },
    });
    await db.insert(storeDomains).values([
      { storeId: store.id, domain: `${demo.slug}.jorify.app`, isPrimary: true, verificationStatus: "pending" },
      { storeId: store.id, domain: `www.${demo.slug}.jorify.app`, isPrimary: false, verificationStatus: "pending" },
    ]);
    await db.insert(storeThemes).values({
      storeId: store.id,
      name: "primary",
      themeKey: index % 2 === 0 ? "minimal" : "local",
      isPublished: true,
      settings: {},
    });
    await db.insert(storePages).values({
      storeId: store.id,
      title: "Home",
      slug: "home",
      isHomepage: true,
      sections: demoSections(demo.store),
      published: true,
      seo: { title: demo.store, description: demo.description },
    });
    await db.insert(storePages).values([
      {
        storeId: store.id,
        title: "About",
        slug: "about",
        sections: [
          { id: crypto.randomUUID(), type: "about", enabled: true, settings: { title: `About ${demo.store}`, body: demo.description } },
        ],
        published: true,
        seo: { title: `About ${demo.store}`, description: demo.description },
      },
      {
        storeId: store.id,
        title: "Contact",
        slug: "contact",
        sections: [
          {
            id: crypto.randomUUID(),
            type: "contact",
            enabled: true,
            settings: { title: "Contact us", email: `hello@${demo.slug}.test`, phone: "+63281234567", address: "Tacloban City, Philippines", hours: "Mon–Sat, 9am–6pm" },
          },
        ],
        published: true,
        seo: { title: `Contact ${demo.store}`, description: demo.description },
      },
    ]);
    await db.insert(storeNavigation).values([
      { storeId: store.id, location: "header", label: "Products", url: "/products", position: 0 },
      { storeId: store.id, location: "header", label: "About", url: "/about", position: 1 },
      { storeId: store.id, location: "footer", label: "Contact", url: "/contact", position: 0 },
    ]);
    await db.insert(subscriptions).values({ organizationId: organization.id, planCode: index === 0 ? "professional" : "starter", status: "active" });

    for (const [attrIndex, attribute] of demo.attributes.entries()) {
      await db.insert(attributeDefinitions).values({
        storeId: store.id,
        name: attribute.name,
        values: attribute.values,
        position: attrIndex,
      });
    }

    const categoryIds = new Map<string, string>();
    for (const [catIndex, categoryName] of demo.categories.entries()) {
      const [category] = await db
        .insert(productCategories)
        .values({
          storeId: store.id,
          name: categoryName,
          slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          position: catIndex,
        })
        .returning();
      categoryIds.set(categoryName, category.id);
    }

    const productIds = new Map<string, string>();
    const variantIds = new Map<string, string>();
    for (const [prodIndex, demoProduct] of demo.products.entries()) {
      const [product] = await db
        .insert(products)
        .values({
          storeId: store.id,
          name: demoProduct.name,
          slug: demoProduct.slug,
          type: demoProduct.type ?? "product",
          status: "active",
          description: demoProduct.description,
          shortDescription: demoProduct.description.slice(0, 120),
          price: demoProduct.price,
          compareAtPrice: demoProduct.compareAt ?? null,
          categoryId: categoryIds.get(demoProduct.category) ?? null,
          tags: demoProduct.tags ?? [],
          featured: demoProduct.featured ?? false,
          durationMinutes: demoProduct.durationMinutes ?? null,
          trackInventory: (demoProduct.type ?? "product") === "product",
          requiresShipping: (demoProduct.type ?? "product") === "product",
          position: prodIndex,
          seoTitle: demoProduct.name,
          seoDescription: demoProduct.description.slice(0, 150),
        })
        .returning();
      productIds.set(demoProduct.slug, product.id);

      await db.insert(productImages).values({
        storeId: store.id,
        productId: product.id,
        url: image(`${demo.slug}-${demoProduct.slug}`),
        alt: demoProduct.name,
        position: 0,
      });

      if (demoProduct.variants?.length) {
        for (const [varIndex, variant] of demoProduct.variants.entries()) {
          const [created] = await db
            .insert(productVariants)
            .values({
              storeId: store.id,
              productId: product.id,
              name: variant.name,
              sku: variant.sku ?? null,
              price: variant.price,
              options: variant.options,
              position: varIndex,
            })
            .returning();
          variantIds.set(`${demoProduct.slug}:${variant.name}`, created.id);
          const [inv] = await db
            .insert(inventory)
            .values({ storeId: store.id, variantId: created.id, quantity: variant.quantity, lowStockThreshold: 5 })
            .returning();
          await db.insert(inventoryTransactions).values({
            storeId: store.id,
            inventoryId: inv.id,
            delta: variant.quantity,
            quantityAfter: variant.quantity,
            reason: "initial",
            note: "Demo seed",
          });
        }
      } else if ((demoProduct.type ?? "product") === "product") {
        const quantity = demoProduct.stock ?? 10;
        const [inv] = await db
          .insert(inventory)
          .values({ storeId: store.id, productId: product.id, quantity, lowStockThreshold: 5 })
          .returning();
        await db.insert(inventoryTransactions).values({
          storeId: store.id,
          inventoryId: inv.id,
          delta: quantity,
          quantityAfter: quantity,
          reason: "initial",
          note: "Demo seed",
        });
      }
    }

    const customerIds: string[] = [];
    for (const demoCustomer of demo.customers) {
      const [customer] = await db
        .insert(customers)
        .values({
          storeId: store.id,
          firstName: demoCustomer.first,
          lastName: demoCustomer.last,
          email: demoCustomer.email,
          phone: demoCustomer.phone ?? null,
          tags: ["demo"],
        })
        .returning();
      customerIds.push(customer.id);
    }

    if (demo.discount) {
      await db.insert(discounts).values({
        storeId: store.id,
        name: demo.discount.name,
        code: demo.discount.code,
        type: demo.discount.type,
        value: demo.discount.value,
        status: "active",
        startsAt: new Date(Date.now() - 7 * 86_400_000),
      });
    }

    for (const staff of demo.staff ?? []) {
      const userRow = await db.query.users.findFirst({ where: eq(users.email, staff.email) });
      await db.insert(employees).values({
        storeId: store.id,
        userId: userRow?.id ?? null,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        status: userRow ? "active" : "invited",
      });
      if (userRow) {
        await db.insert(organizationMembers).values({
          organizationId: organization.id,
          userId: userRow.id,
          role: staff.role,
        });
      }
    }

    const sellable = demo.products.filter((product) => (product.type ?? "product") === "product");
    for (let i = 0; i < demo.orders && sellable.length > 0; i += 1) {
      const items = Array.from({ length: 1 + (i % 2) }, (_, itemIndex) => {
        const product = sellable[(i + itemIndex) % sellable.length];
        const variant = product.variants?.[0] ?? null;
        return {
          product,
          dbProductId: productIds.get(product.slug) ?? null,
          variant,
          variantId: variant ? variantIds.get(`${product.slug}:${variant.name}`) ?? null : null,
          quantity: 1 + ((i + itemIndex) % 2),
          unitPrice: variant?.price ?? product.price,
        };
      });

      const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const taxTotal = Math.round(subtotal * 0.12);
      const total = subtotal + taxTotal;
      const placedAt = new Date(Date.now() - Math.floor(Math.random() * 30) * 86_400_000 - Math.floor(Math.random() * 40) * 60_000);
      const status = i % 7 === 0 ? "cancelled" : ["completed", "completed", "confirmed", "processing"][i % 4];
      const customer = customerIds[i % customerIds.length] ?? null;
      const number = `#${1001 + orderCount}`;
      orderCount += 1;

      const [order] = await db
        .insert(orders)
        .values({
          storeId: store.id,
          number,
          customerId: customer,
          email: demo.customers[i % demo.customers.length].email,
          status,
          paymentStatus: status === "cancelled" ? "refunded" : "paid",
          fulfillmentType: demo.businessType === "salon" || demo.businessType === "cafe" ? "pickup" : "delivery",
          subtotal,
          taxTotal,
          total,
          currency: "PHP",
          placedAt,
        })
        .returning();

      for (const item of items) {
        await db.insert(orderItems).values({
          storeId: store.id,
          orderId: order.id,
          productId: item.dbProductId,
          variantId: item.variantId,
          title: item.product.name,
          variantTitle: item.variant?.name ?? null,
          sku: item.variant?.sku ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.unitPrice * item.quantity,
          requiresShipping: true,
        });

        if (status !== "cancelled") {
          const invRow = item.variantId
            ? await db.query.inventory.findFirst({ where: eq(inventory.variantId, item.variantId) })
            : item.dbProductId
              ? await db.query.inventory.findFirst({ where: eq(inventory.productId, item.dbProductId) })
              : undefined;
          if (invRow && invRow.quantity >= item.quantity) {
            const after = invRow.quantity - item.quantity;
            await db.update(inventory).set({ quantity: after }).where(eq(inventory.id, invRow.id));
            await db.insert(inventoryTransactions).values({
              storeId: store.id,
              inventoryId: invRow.id,
              delta: -item.quantity,
              quantityAfter: after,
              reason: "order",
              referenceType: "order",
              referenceId: order.id,
            });
          }
        }
      }

      await db.insert(orderEvents).values({
        storeId: store.id,
        orderId: order.id,
        type: "created",
        body: `Demo order ${number}`,
      });

      if (customer && status !== "cancelled") {
        await db
          .update(customers)
          .set({
            ordersCount: (i % 3) + 1,
            totalSpent: total * ((i % 3) + 1),
            lastOrderAt: placedAt,
          })
          .where(eq(customers.id, customer));
      }
    }
  }

  console.log("Seed complete.");
  console.log("  DEMO login : demo@jorify.test / demo-password-123 (owner of all demo stores)");
  console.log("  VIEWER     : viewer@jorify.test / demo-password-123 (viewer role, tenant isolation check)");
  console.log(`  Stores     : ${DEMO_STORES.map((s) => `/${s.slug}`).join(", ")}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
