"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  UserCog,
  ClipboardEdit,
  ClipboardCheck,
  Stamp,
  FileText,
  History,
  Settings as SettingsIcon,
  MoreHorizontal,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { isWholeSchoolRole } from "@/lib/roles";
import LogoutButton from "./LogoutButton";

// `primary: true` items get a slot in the mobile bottom nav (keep this to
// ~5-6 so it stays evenly spaced and doesn't need horizontal scrolling).
// Everything else — primary or not — is always in the full desktop sidebar.
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, wholeOnly: false, primary: true },
  { href: "/students", label: "Students", icon: Users, wholeOnly: true, primary: true },
  { href: "/score-entry", label: "Score Entry", icon: ClipboardEdit, wholeOnly: false, primary: true },
  { href: "/form-review", label: "Class Review", icon: ClipboardCheck, wholeOnly: false, primary: true },
  { href: "/reports", label: "Report Cards", icon: FileText, wholeOnly: false, primary: true },
  { href: "/teachers", label: "Teachers", icon: UserCog, wholeOnly: true, primary: false },
  { href: "/approvals", label: "Approvals", icon: Stamp, wholeOnly: true, primary: false },
  { href: "/audit", label: "Audit", icon: History, wholeOnly: true, primary: false },
  { href: "/settings", label: "Settings", icon: SettingsIcon, wholeOnly: true, primary: true },
] as const;

export default function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const whole = isWholeSchoolRole(user.role);
  const [moreOpen, setMoreOpen] = useState(false);
  const [school, setSchool] = useState<{ name: string; logoUrl: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/school/public")
      .then((r) => r.json())
      .then((data) => setSchool(data))
      .catch(() => {});
  }, []);

  const items = NAV_ITEMS.filter((i) => !i.wholeOnly || whole);
  const primaryItems = items.filter((i) => i.primary).slice(0, 5);
  const primaryHrefs = new Set(primaryItems.map((i) => i.href));
  const moreItems = items.filter((i) => !primaryHrefs.has(i.href));

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div>
      <header className="topbar">
        <div className="brand">
          {school?.logoUrl ? (
            <img src={school.logoUrl} alt="" style={{ width: 36, height: 36, borderRadius: 9, objectFit: "cover" }} />
          ) : (
            <div className="brand-logo-fallback">{(school?.name || "L")[0]}</div>
          )}
          <div className="brand-text">
            <strong>{school?.name || "Ladybird"}</strong>
            <span>Whole-School System</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="user-chip">
            <span className="avatar-sm">{initials}</span>
            <span>
              {user.name} <span style={{ color: "var(--gold)" }}>· {user.role.replace(/_/g, " ")}</span>
            </span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="app-body">
        <nav className="sidebar">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? "active" : ""}`}>
                <Icon className="icon" size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="content">{children}</main>
      </div>

      <nav className="mobile-nav">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`mnav-item ${isActive(item.href) ? "active" : ""}`}>
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
        {moreItems.length > 0 && (
          <button className={`mnav-item ${moreOpen ? "active" : ""}`} onClick={() => setMoreOpen((v) => !v)}>
            <MoreHorizontal size={20} />
            More
          </button>
        )}
      </nav>

      {moreOpen && (
        <>
          <div className="more-sheet-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="more-sheet">
            {moreItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="more-sheet-item" onClick={() => setMoreOpen(false)}>
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
