"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { registerAction, type AuthFormState } from "@/lib/actions/session";
import { BUSINESS_TYPES } from "@/lib/business-types";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export default function RegisterPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(registerAction, null);
  const [storeName, setStoreName] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const slug = slugTouched ? customSlug : slugify(storeName);

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="One account, one organization, your first store."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" required minLength={2} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="organizationName">Organization</Label>
          <Input id="organizationName" name="organizationName" placeholder="Acme Holdings" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="storeName">Store name</Label>
            <Input id="storeName" name="storeName" required value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="storeSlug">Store URL</Label>
            <Input
              id="storeSlug"
              name="storeSlug"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setCustomSlug(slugify(e.target.value));
              }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="businessType">Business type</Label>
          <Select id="businessType" name="businessType" defaultValue="retail">
            {Object.values(BUSINESS_TYPES).map((type) => (
              <option key={type.key} value={type.key}>
                {type.label}
              </option>
            ))}
          </Select>
        </div>
        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating…" : "Create workspace"}
        </Button>
        <p className="text-xs text-zinc-500">Your store will be live at /{slug || "your-store"} on this domain.</p>
      </form>
    </AuthShell>
  );
}
