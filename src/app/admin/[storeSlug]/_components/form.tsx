"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";

export type ActionState = { error?: string; message?: string } | null;

export function useSavedToast(state: ActionState) {
  const { push } = useToast();
  useEffect(() => {
    if (state?.message) push(state.message);
  }, [state, push]);
}

export function useCloseOnSuccess(state: ActionState, close: () => void) {
  useEffect(() => {
    if (state?.message) close();
  }, [state, close]);
}

export function FormError({ state }: { state: ActionState }) {
  if (!state?.error) return null;
  return <p className="text-sm text-red-600">{state.error}</p>;
}
