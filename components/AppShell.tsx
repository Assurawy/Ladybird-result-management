import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import { isWholeSchoolRole } from "@/lib/permissions";
import LogoutButton from "./LogoutButton";

export default function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const whole = isWholeSchoolRole(user.role);
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b bg-navy px-4 py-3 text-white">
        <div className="flex items-center gap-6">
          <span className="font-bold">Ladybird</span>
          <nav className="hidden gap-4 text-sm sm:flex">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            {whole && (
              <Link href="/students" className="hover:underline">
                Students
              </Link>
            )}
            {whole && (
              <Link href="/teachers" className="hover:underline">
                Teachers
              </Link>
            )}
            <Link href="/score-entry" className="hover:underline">
              Score Entry
            </Link>
            <Link href="/form-review" className="hover:underline">
              Class Review
            </Link>
            {whole && (
              <Link href="/approvals" className="hover:underline">
                Approvals
              </Link>
            )}
            <Link href="/reports" className="hover:underline">
              Reports
            </Link>
            {whole && (
              <Link href="/audit" className="hover:underline">
                Audit
              </Link>
            )}
            {whole && (
              <Link href="/settings" className="hover:underline">
                Settings
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span>
            {user.name} · <span className="text-gold">{user.role.replace("_", " ")}</span>
          </span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}
