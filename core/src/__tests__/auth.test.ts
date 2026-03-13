import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnonymousAuthProvider } from "../auth.js";

// Mock localStorage for Node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("AnonymousAuthProvider", () => {
  let auth: AnonymousAuthProvider;

  beforeEach(() => {
    localStorageMock.clear();
    auth = new AnonymousAuthProvider();
  });

  it("returns null when no user is signed in", async () => {
    expect(await auth.getCurrentUser()).toBeNull();
  });

  it("signs in and creates an anonymous user", async () => {
    const user = await auth.signIn();
    expect(user.id).toBeTruthy();
    expect(user.authProvider).toBe("anonymous");
    expect(user.displayName).toBe("Anonymous User");
  });

  it("persists user to localStorage", async () => {
    await auth.signIn();
    const stored = localStorageMock.getItem("ilikey-anonymous-user");
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!).authProvider).toBe("anonymous");
  });

  it("retrieves persisted user on new instance", async () => {
    await auth.signIn();

    const auth2 = new AnonymousAuthProvider();
    const user = await auth2.getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.authProvider).toBe("anonymous");
  });

  it("signs out and clears storage", async () => {
    await auth.signIn();
    await auth.signOut();

    expect(await auth.getCurrentUser()).toBeNull();
    expect(localStorageMock.getItem("ilikey-anonymous-user")).toBeNull();
  });

  it("notifies listeners on sign in", async () => {
    const callback = vi.fn();
    auth.onAuthStateChanged(callback);

    await auth.signIn();
    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0][0]?.authProvider).toBe("anonymous");
  });

  it("notifies listeners on sign out", async () => {
    const callback = vi.fn();
    auth.onAuthStateChanged(callback);

    await auth.signIn();
    await auth.signOut();

    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback.mock.calls[1][0]).toBeNull();
  });

  it("unsubscribe stops listener", async () => {
    const callback = vi.fn();
    const unsub = auth.onAuthStateChanged(callback);
    unsub();

    await auth.signIn();
    expect(callback).not.toHaveBeenCalled();
  });
});
