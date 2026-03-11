import { z } from "zod";

// ── Enums ──

export const SectionType = z.enum([
  "intro",
  "verse",
  "pre-chorus",
  "chorus",
  "post-chorus",
  "bridge",
  "drop",
  "breakdown",
  "outro",
  "solo",
  "interlude",
  "custom",
]);
export type SectionType = z.infer<typeof SectionType>;

export const MediaSource = z.enum([
  "spotify",
  "tidal",
  "apple-music",
  "youtube-music",
  "soundcloud",
  "local-file",
  "browser",
  "os-now-playing",
  "manual",
]);
export type MediaSource = z.infer<typeof MediaSource>;

export const AuthProvider = z.enum([
  "anonymous",
  "google",
  "github",
  "apple",
  "spotify",
  "tidal",
]);
export type AuthProvider = z.infer<typeof AuthProvider>;

// ── Core Models ──

export const Song = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  artist: z.string().default("Unknown Artist"),
  album: z.string().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  source: MediaSource,
  externalId: z.string().optional(), // Spotify track ID, Tidal ID, etc.
  externalUrl: z.string().url().optional(),
  artworkUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Song = z.infer<typeof Song>;

export const Tag = z.object({
  id: z.string().uuid(),
  songId: z.string().uuid(),
  timestampMs: z.number().int().nonnegative(),
  label: z.string().default(""),
  color: z.string().default("#3b82f6"), // blue-500
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Tag = z.infer<typeof Tag>;

export const Section = z.object({
  id: z.string().uuid(),
  songId: z.string().uuid(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  type: SectionType,
  label: z.string().default(""),
  color: z.string().default("#8b5cf6"), // violet-500
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Section = z.infer<typeof Section>;

export const User = z.object({
  id: z.string(),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
  authProvider: AuthProvider,
  connectedServices: z.array(MediaSource).default([]),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof User>;

// ── Now Playing ──

export const NowPlayingInfo = z.object({
  title: z.string(),
  artist: z.string(),
  album: z.string().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  positionMs: z.number().int().nonnegative().optional(),
  isPlaying: z.boolean(),
  source: MediaSource,
  externalId: z.string().optional(),
  externalUrl: z.string().url().optional(),
  artworkUrl: z.string().url().optional(),
});
export type NowPlayingInfo = z.infer<typeof NowPlayingInfo>;

// ── Section type colors (defaults) ──

export const SECTION_COLORS: Record<SectionType, string> = {
  intro: "#6b7280",
  verse: "#3b82f6",
  "pre-chorus": "#8b5cf6",
  chorus: "#ef4444",
  "post-chorus": "#f97316",
  bridge: "#eab308",
  drop: "#ec4899",
  breakdown: "#14b8a6",
  outro: "#6b7280",
  solo: "#f59e0b",
  interlude: "#06b6d4",
  custom: "#a855f7",
};

// ── Helper: create new instances ──

export function createSong(
  data: Omit<Song, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Song {
  const now = new Date().toISOString();
  return Song.parse({
    id: data.id ?? crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...data,
  });
}

export function createTag(
  data: Omit<Tag, "id" | "createdAt" | "updatedAt" | "color" | "label"> & { id?: string; color?: string; label?: string }
): Tag {
  const now = new Date().toISOString();
  return Tag.parse({
    id: data.id ?? crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...data,
  });
}

export function createSection(
  data: Omit<Section, "id" | "createdAt" | "updatedAt" | "color" | "label"> & { id?: string; color?: string; label?: string }
): Section {
  const now = new Date().toISOString();
  return Section.parse({
    id: data.id ?? crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...data,
  });
}
