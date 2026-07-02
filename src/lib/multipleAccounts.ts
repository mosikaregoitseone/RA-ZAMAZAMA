import { supabase } from "./supabase";

export interface StoredAccount {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  name?: string;
}

const ACCOUNTS_KEY = "ra_zamzama_accounts";
const ACTIVE_ACCOUNT_KEY = "ra_zamzama_active_account";

export const multipleAccounts = {
  // Get all stored accounts
  getAccounts(): StoredAccount[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(ACCOUNTS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  // Get currently active account
  getActiveAccount(): StoredAccount | null {
    if (typeof window === "undefined") return null;
    const activeId = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    if (!activeId) return null;
    const accounts = this.getAccounts();
    return accounts.find((acc) => acc.id === activeId) || null;
  },

  // Save a new account after login
  async saveAccount(user: any, session: any) {
    const accounts = this.getAccounts();
    const account: StoredAccount = {
      id: user.id,
      email: user.email,
      accessToken: session.access_token,
      refreshToken: session.refresh_token || "",
      name: user.user_metadata?.full_name || user.email.split("@")[0],
    };

    // Remove if already exists, then add
    const filtered = accounts.filter((acc) => acc.id !== user.id);
    filtered.push(account);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(filtered));

    // Set as active
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, user.id);
  },

  // Switch to a different account
  async switchAccount(accountId: string) {
    const accounts = this.getAccounts();
    const account = accounts.find((acc) => acc.id === accountId);
    if (!account) return false;

    // Set session in Supabase
    await supabase.auth.setSession({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    });

    // Set as active
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, accountId);
    return true;
  },

  // Remove an account
  removeAccount(accountId: string) {
    const accounts = this.getAccounts();
    const filtered = accounts.filter((acc) => acc.id !== accountId);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(filtered));

    // If it was active, switch to another or clear
    const activeId = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    if (activeId === accountId) {
      if (filtered.length > 0) {
        this.switchAccount(filtered[0].id);
      } else {
        localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
      }
    }
  },

  // Clear all accounts
  clearAll() {
    localStorage.removeItem(ACCOUNTS_KEY);
    localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  },
};