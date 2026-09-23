"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Hoy", icon: "🥘" },
  { href: "/platillos", label: "Platillos", icon: "🍳" },
  { href: "/ingredientes", label: "Ingredientes", icon: "🧅" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="Navegación principal">
      {TABS.map((tab) => {
        const active =
          tab.href === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`nav-item${active ? " nav-item--active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              {tab.icon}
            </span>
            <span className="nav-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}