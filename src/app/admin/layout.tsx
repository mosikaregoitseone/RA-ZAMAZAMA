"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const NAV = [
  { href: "/admin",                     label: "Dashboard",            icon: "📊", anyAdmin: true  },
  { href: "/admin/admins",              label: "Admins",               icon: "👮", superOnly: true },
  { href: "/admin/roles-permissions",   label: "Roles & Permissions",  icon: "🔐", superOnly: true },
  { href: "/admin/users",               label: "Users",                icon: "👥", anyAdmin: true  },
  { href: "/admin/listings",            label: "Listings",             icon: "🛒", anyAdmin: true  },
  { href: "/admin/transactions",        label: "Transactions",         icon: "💳", anyAdmin: true  },
  { href: "/admin/universities",        label: "Universities",         icon: "🏛️", superOnly: true },
  { href: "/admin/reports",             label: "Reports",              icon: "🚩", anyAdmin: true  },
  { href: "/admin/document-review",     label: "Document Review",      icon: "📄", anyAdmin: true  },
  { href: "/admin/verification",        label: "Verification",         icon: "✅", anyAdmin: true  },
  { href: "/admin/analytics",           label: "Analytics",            icon: "📈", superOnly: true },
  { href: "/admin/system-logs",         label: "System Logs",          icon: "📜", superOnly: true },
  { href: "/admin/audit-log",           label: "Audit Log",            icon: "🧾", anyAdmin: true  },
  { href: "/admin/backups",             label: "Backups",              icon: "💾", superOnly: true },
  { href: "/admin/settings",            label: "Settings",             icon: "⚙️", anyAdmin: true  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "superadmin" | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      // Prefer the user_roles table (recommended), fall back to user_profiles.role.
      const { data: roleRow } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);
      const roles = (roleRow || []).map((r: any) => r.role);
      let resolved: "admin" | "superadmin" | null = null;
      if (roles.includes("superadmin")) resolved = "superadmin";
      else if (roles.includes("admin")) resolved = "admin";
      if (!resolved) {
        const { data: profile } = await supabase
          .from("user_profiles").select("role").eq("id", user.id).maybeSingle();
        if (profile?.role === "superadmin") resolved = "superadmin";
        else if (profile?.role === "admin") resolved = "admin";
      }
      if (!resolved) { router.push("/"); return; }
      setRole(resolved); setReady(true);
    })();
  }, [router]);

  if (!ready) return <main className="p-6">Loading admin…</main>;

  const visible = NAV.filter((n) => role === "superadmin" ? true : !n.superOnly);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh", background: "#f8fafc" }}>
      <aside style={{ background: "#0b1a3a", color: "white", padding: "20px 0", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "0 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>RA ZAMAZAMA</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {role === "superadmin" ? "Super Admin Console" : "Admin Console"}
          </div>
        </div>
        <nav style={{ padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {visible.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                  borderRadius: 8, color: "white", textDecoration: "none",
                  background: active ? "rgba(255,255,255,0.12)" : "transparent",
                  fontWeight: active ? 700 : 500, fontSize: 14 }}>
                <span>{item.icon}</span>{item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: "20px", marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, textDecoration: "none" }}>
            ← Back to marketplace
          </Link>
        </div>
      </aside>
      <main style={{ padding: "28px 32px" }}>{children}</main>
    </div>
  );
}
