"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TR } from "@/components/ui/table";

export function ClickableRow({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <TR
      className={cn("cursor-pointer", className)}
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter") router.push(href);
      }}
    >
      {children}
    </TR>
  );
}
