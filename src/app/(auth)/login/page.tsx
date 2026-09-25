"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { loginAction, type AuthFormState } from "@/lib/actions/session";

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, null);

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your stores and workspace."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-medium text-zinc-900 underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@business.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
