"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@heroui/react";
import { NAV_ITEMS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col gap-1 border-r border-border bg-surface p-4">
      <div className="mb-4 px-2 text-lg font-semibold text-foreground">
        Aqua Life Admin
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent-soft text-accent-soft-foreground"
                  : "text-muted hover:bg-default hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
