"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { multipleAccounts } from "../lib/multipleAccounts";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [otherAccounts, setOtherAccounts] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (!user) {
      setIsAdmin(false);
      setOtherAccounts([]);
      return;
    }

    // Get other accounts
    const allAccounts = multipleAccounts.getAccounts();
    const others = allAccounts.filter((acc) => acc.id !== user.id);
    setOtherAccounts(others);

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setIsAdmin(profile?.role === "admin");
  };

  checkUser();

  // Listen for auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      checkUser();
    }
  );

  const channel = supabase
    .channel("navbar-user")
    .on("postgres_changes", { event: "*", schema: "public", table: "user_profiles" }, () => {
      checkUser();
    })
    .subscribe();

  return () => {
    subscription?.unsubscribe();
    supabase.removeChannel(channel);
  };
}, []);

  const handleLogout = async () => {
    const activeAccount = multipleAccounts.getActiveAccount();
    if (activeAccount) {
      multipleAccounts.removeAccount(activeAccount.id);
    }
    await supabase.auth.signOut();
    setMobileMenuOpen(false);
    window.location.href = "/";
  };

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <>
      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 40, backgroundColor: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: "64px", padding: "0 1rem", flexWrap: "nowrap" }}>

          {/* Hamburger - Left */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Open menu"
            style={{ flexShrink: 0, width: "auto", padding: "8px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", borderRadius: "8px" }}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Logo - Center */}
          <Link
            href="/"
            style={{ flex: 1, textAlign: "center", fontSize: "1.5rem", fontWeight: 900, letterSpacing: "0.35em", color: "#2563eb", textDecoration: "none" }}
          >
            RA ZAMAZAMA
          </Link>

          {/* Dots - Right */}
          <div style={{ flexShrink: 0, position: "relative" }}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              aria-label="Account menu"
              style={{ width: "auto", flexShrink: 0, padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#374151", borderRadius: "8px" }}
            >
              {"⋮"}
            </button>

            {!user && profileMenuOpen && (
              <div style={{ position: "absolute", right: 0, marginTop: "12px", width: "176px", background: "white", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", border: "1px solid #e5e7eb", overflow: "hidden", zIndex: 1000 }}>
                <Link href="/login" className="block px-5 py-3 text-sm font-semibold hover:bg-gray-100 text-center" onClick={() => setProfileMenuOpen(false)}>LOGIN</Link>
                <Link href="/register" className="block px-5 py-3 text-sm font-semibold hover:bg-gray-100 text-center border-t" onClick={() => setProfileMenuOpen(false)}>SIGN UP</Link>
              </div>
            )}

            {user && profileMenuOpen && (
              <div style={{ position: "absolute", right: 0, marginTop: "12px", width: "220px", background: "white", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", border: "1px solid #e5e7eb", overflow: "hidden", zIndex: 1000 }}>
                
                {/* Current Account */}
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#f3f4f6" }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", marginBottom: "4px", textTransform: "uppercase" }}>Current Account</p>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111" }}>{user.email}</p>
                </div>

                {/* Other Logged In Accounts */}
                {otherAccounts.length > 0 && (
                  <>
                    <div style={{ padding: "8px 0", borderBottom: "1px solid #e5e7eb" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", padding: "8px 16px", textTransform: "uppercase" }}>Switch Account</p>
                      {otherAccounts.map((account) => (
                        <button
                          key={account.id}
                          onClick={() => {
                            multipleAccounts.switchAccount(account.id);
                            setProfileMenuOpen(false);
                            window.location.reload();
                          }}
                          style={{ width: "100%", textAlign: "left", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "#374151", display: "block", borderBottom: "1px solid #f3f4f6" }}
                        >
                          {account.email}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Menu Items */}
                <Link href="/profile" className="block px-5 py-3 text-sm font-semibold hover:bg-gray-100 text-center" onClick={() => setProfileMenuOpen(false)}>PROFILE</Link>
                <button onClick={() => { handleLogout(); setProfileMenuOpen(false); }} style={{ width: "100%", padding: "12px 20px", background: "none", border: "none", borderTop: "1px solid #e5e7eb", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}>LOGOUT</button>
              </div>
            )}
          </div>

        </div>
      </nav>

      {/* Sidebar Menu */}
{mobileMenuOpen && (
  <>
    {/* Overlay - Click to close */}
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "transparent",
        zIndex: 30,
        cursor: "pointer"
      }}
      onClick={() => setMobileMenuOpen(false)}
    />
    
    {/* Sidebar */}
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: "100%",
        width: "300px",
        backgroundColor: "white",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        overscrollBehavior: "contain"
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ padding: "16px", borderBottom: "1px solid #e5e7eb" }}>
        <h2 style={{ fontWeight: 700, fontSize: "1rem" }}>Menu</h2>
      </div>

      {/* Navigation Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <nav style={{ display: "flex", flexDirection: "column", padding: "8px 0" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", borderBottom: "1px solid #f3f4f6", textDecoration: "none", color: "inherit" }} onClick={closeMenu}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 11l4-4m0 0l4 4m-4-4V3" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: "0.875rem", letterSpacing: "0.05em" }}>HOME</span>
          </Link>

          <Link href="/post" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", borderBottom: "1px solid #f3f4f6", textDecoration: "none", color: "inherit" }} onClick={closeMenu}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: "0.875rem", letterSpacing: "0.05em" }}>SELL</span>
          </Link>

          {user && (
            <Link href="/my-listings" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", borderBottom: "1px solid #f3f4f6", textDecoration: "none", color: "inherit" }} onClick={closeMenu}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m0 0l8-4m-8 4v10l8 4m0-10l8 4m-8-4v10M7 10.5l5 2.5m5-2.5l-5 2.5" />
              </svg>
              <span style={{ fontWeight: 600, fontSize: "0.875rem", letterSpacing: "0.05em" }}>MY ITEMS</span>
            </Link>
          )}

          {user && (
  <Link href="/transactions" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", borderBottom: "1px solid #f3f4f6", textDecoration: "none", color: "inherit" }} onClick={closeMenu}>
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
    <span style={{ fontWeight: 600, fontSize: "0.875rem", letterSpacing: "0.05em" }}>MY TRANSACTIONS</span>
  </Link>
)}


          {user && (
            <Link href="/messages" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", borderBottom: "1px solid #f3f4f6", textDecoration: "none", color: "inherit" }} onClick={closeMenu}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span style={{ fontWeight: 600, fontSize: "0.875rem", letterSpacing: "0.05em" }}>MESSAGES</span>
            </Link>
          )}

          {user && (
            <Link href="/profile" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", borderBottom: "1px solid #f3f4f6", textDecoration: "none", color: "inherit" }} onClick={closeMenu}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span style={{ fontWeight: 600, fontSize: "0.875rem", letterSpacing: "0.05em" }}>PROFILE</span>
            </Link>
          )}

          {user && (
            <Link href="/verification" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", borderBottom: "1px solid #f3f4f6", textDecoration: "none", color: "inherit" }} onClick={closeMenu}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span style={{ fontWeight: 600, fontSize: "0.875rem", letterSpacing: "0.05em" }}>VERIFICATION</span>
            </Link>
          )}

          

          {isAdmin && (
            <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", borderBottom: "1px solid #f3f4f6", color: "#dc2626", textDecoration: "none" }} onClick={closeMenu}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span style={{ fontWeight: 600, fontSize: "0.875rem", letterSpacing: "0.05em" }}>ADMIN</span>
            </Link>
          )}

          <Link href="/contact-us" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 20px", borderBottom: "1px solid #f3f4f6", textDecoration: "none", color: "inherit" }} onClick={closeMenu}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: "0.875rem", letterSpacing: "0.05em" }}>CONTACT US</span>
          </Link>
        </nav>
      </div>

      {/* Footer */}
      {!user && (
        <div style={{ borderTop: "1px solid #e5e7eb", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <Link href="/login" style={{ display: "block", textAlign: "center", border: "2px solid black", padding: "8px 16px", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none", color: "inherit", cursor: "pointer" }} onClick={closeMenu}>Login</Link>
          <Link href="/register" style={{ display: "block", textAlign: "center", backgroundColor: "black", color: "white", padding: "8px 16px", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none", cursor: "pointer" }} onClick={closeMenu}>Sign Up</Link>
        </div>
      )}

      {user && (
        <div style={{ borderTop: "1px solid #e5e7eb", padding: "16px" }}>
          <button onClick={handleLogout} style={{ width: "100%", textAlign: "center", border: "2px solid black", padding: "8px 16px", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600, backgroundColor: "white", cursor: "pointer" }}>Logout</button>
        </div>
      )}
    </div>
  </>
)}
    </>
  );
}