import { describe, expect, it } from "vitest";

import { PERMISSIONS, ROLES, isRole, roleCan } from "@/lib/auth/permissions";

describe("role permissions", () => {
  it("grants owner every permission", () => {
    for (const permission of PERMISSIONS) {
      expect(roleCan("owner", permission)).toBe(true);
    }
  });

  it("denies billing.manage to everyone except owner", () => {
    for (const role of ROLES) {
      expect(roleCan(role, "billing.manage")).toBe(role === "owner");
    }
  });

  it("gives viewer read-only access", () => {
    const viewerWrites = PERMISSIONS.filter(
      (permission) => roleCan("viewer", permission) && !permission.endsWith(".read"),
    );
    expect(viewerWrites).toEqual([]);
  });

  it("gives staff no settings, discounts or employee management access", () => {
    expect(roleCan("staff", "settings.update")).toBe(false);
    expect(roleCan("staff", "discounts.update")).toBe(false);
    expect(roleCan("staff", "employees.manage")).toBe(false);
    expect(roleCan("staff", "products.delete")).toBe(false);
    expect(roleCan("staff", "orders.update")).toBe(true);
  });

  it("denies unknown roles and unknown permissions", () => {
    expect(isRole("superadmin")).toBe(false);
    expect(roleCan("superadmin", "orders.read")).toBe(false);
    expect(roleCan("owner", "orders.nuke" as never)).toBe(false);
  });
});
