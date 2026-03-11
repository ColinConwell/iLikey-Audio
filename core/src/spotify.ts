import { BaseMediaDetector } from "./media.js";
import type { NowPlayingInfo, User, AuthProvider } from "./models.js";
import type { IAuthProvider } from "./auth.js";

// ── Spotify Integration ──
// Implements both media detection and auth via Spotify Web API.

const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-read-email",
  "user-read-private",
].join(" ");

interface SpotifyConfig {
  clientId: string;
  redirectUri: string;
}

export class SpotifyMediaDetector extends BaseMediaDetector {
  readonly name = "Spotify";
  readonly source = "spotify";

  constructor(private getAccessToken: () => string | null) {
    super();
  }

  async isAvailable(): Promise<boolean> {
    return this.getAccessToken() !== null;
  }

  async getNowPlaying(): Promise<NowPlayingInfo | null> {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 204 || res.status === 401) return null;
      if (!res.ok) return null;

      const data = await res.json();
      if (!data.item) return null;

      return {
        title: data.item.name,
        artist: data.item.artists.map((a: { name: string }) => a.name).join(", "),
        album: data.item.album?.name,
        durationMs: data.item.duration_ms,
        positionMs: data.progress_ms ?? undefined,
        isPlaying: data.is_playing,
        source: "spotify",
        externalId: data.item.id,
        externalUrl: data.item.external_urls?.spotify,
        artworkUrl: data.item.album?.images?.[0]?.url,
      };
    } catch {
      return null;
    }
  }
}

export class SpotifyAuthProvider implements IAuthProvider {
  readonly providerName = "spotify" as AuthProvider;

  private accessToken: string | null = null;
  private user: User | null = null;
  private listeners: Set<(user: User | null) => void> = new Set();

  constructor(private config: SpotifyConfig) {}

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async getCurrentUser(): Promise<User | null> {
    return this.user;
  }

  async signIn(): Promise<User> {
    // Build Spotify OAuth URL and redirect
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: "token",
      redirect_uri: this.config.redirectUri,
      scope: SPOTIFY_SCOPES,
      show_dialog: "true",
    });

    // In a browser, redirect. The callback URL will contain the token.
    window.location.href = `https://accounts.spotify.com/authorize?${params}`;

    // This won't actually return — the page redirects.
    // Token is extracted via handleCallback() after redirect.
    throw new Error("Redirecting to Spotify...");
  }

  /** Call this on the OAuth callback page to extract the token */
  async handleCallback(hash: string): Promise<User> {
    const params = new URLSearchParams(hash.replace("#", "?"));
    const token = params.get("access_token");
    if (!token) throw new Error("No access token in callback");

    this.accessToken = token;

    // Fetch user profile
    const res = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const profile = await res.json();

    this.user = {
      id: profile.id,
      displayName: profile.display_name ?? profile.id,
      email: profile.email,
      avatarUrl: profile.images?.[0]?.url,
      authProvider: "spotify",
      connectedServices: ["spotify"],
      createdAt: new Date().toISOString(),
    };

    this.listeners.forEach((cb) => cb(this.user));
    return this.user;
  }

  async signOut(): Promise<void> {
    this.accessToken = null;
    this.user = null;
    this.listeners.forEach((cb) => cb(null));
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}
