import type { User, AuthProvider } from "./models.js";

// ── Auth Interface ──

export interface IAuthProvider {
  readonly providerName: AuthProvider;

  /** Get the current user, or null if not logged in */
  getCurrentUser(): Promise<User | null>;

  /** Sign in (provider-specific) */
  signIn(options?: Record<string, unknown>): Promise<User>;

  /** Sign out */
  signOut(): Promise<void>;

  /** Listen for auth state changes */
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
}

// ── Anonymous (local-only) auth ──

export class AnonymousAuthProvider implements IAuthProvider {
  readonly providerName = "anonymous" as AuthProvider;
  private user: User | null = null;
  private listeners: Set<(user: User | null) => void> = new Set();

  async getCurrentUser(): Promise<User | null> {
    if (!this.user) {
      // Check localStorage for existing anonymous user
      const stored = typeof localStorage !== "undefined"
        ? localStorage.getItem("ilikey-anonymous-user")
        : null;

      if (stored) {
        this.user = JSON.parse(stored);
      }
    }
    return this.user;
  }

  async signIn(): Promise<User> {
    this.user = {
      id: crypto.randomUUID(),
      displayName: "Anonymous User",
      authProvider: "anonymous",
      connectedServices: [],
      createdAt: new Date().toISOString(),
    };

    if (typeof localStorage !== "undefined") {
      localStorage.setItem("ilikey-anonymous-user", JSON.stringify(this.user));
    }

    this.listeners.forEach((cb) => cb(this.user));
    return this.user;
  }

  async signOut(): Promise<void> {
    this.user = null;
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("ilikey-anonymous-user");
    }
    this.listeners.forEach((cb) => cb(null));
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}
