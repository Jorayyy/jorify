"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { registerBusiness } from "@/lib/actions/auth";
import { logger } from "@/lib/logging";

export type AuthFormState = { error?: string } | null;

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required" };

  try {
    await signIn("credentials", { email, password, redirectTo: "/stores" });
  } catch (error) {
    if (error instanceof AuthError) {
      logger.warn("authentication failed", { email, reason: (error as { code?: string }).code ?? error.type });
      return { error: "Invalid email or password" };
    }
    throw error;
  }
  return null;
}

export async function registerAction(prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const input = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    organizationName: String(formData.get("organizationName") ?? ""),
    storeName: String(formData.get("storeName") ?? ""),
    storeSlug: String(formData.get("storeSlug") ?? ""),
    businessType: String(formData.get("businessType") ?? "retail"),
  };

  const result = await registerBusiness(input);
  if (!result.ok) return { error: result.error };

  try {
    await signIn("credentials", { email: input.email, password: input.password, redirectTo: `/admin/${result.storeSlug}` });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login");
    throw error;
  }
  return null;
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
