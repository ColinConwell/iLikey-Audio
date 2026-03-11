import type { Song, Tag, Section, User } from "./models.js";

// ── Storage Interface ──
// All platform-specific storage providers implement this interface.

export interface IStorageProvider {
  // Songs
  getSong(id: string): Promise<Song | null>;
  getSongs(): Promise<Song[]>;
  searchSongs(query: string): Promise<Song[]>;
  upsertSong(song: Song): Promise<void>;
  deleteSong(id: string): Promise<void>;

  // Tags
  getTag(id: string): Promise<Tag | null>;
  getTagsForSong(songId: string): Promise<Tag[]>;
  getAllTags(): Promise<Tag[]>;
  upsertTag(tag: Tag): Promise<void>;
  deleteTag(id: string): Promise<void>;

  // Sections
  getSection(id: string): Promise<Section | null>;
  getSectionsForSong(songId: string): Promise<Section[]>;
  getAllSections(): Promise<Section[]>;
  upsertSection(section: Section): Promise<void>;
  deleteSection(id: string): Promise<void>;

  // User (local profile)
  getUser(): Promise<User | null>;
  setUser(user: User): Promise<void>;

  // Bulk operations
  exportAll(): Promise<ExportData>;
  importAll(data: ExportData): Promise<void>;
  clear(): Promise<void>;
}

export interface ExportData {
  version: number;
  exportedAt: string;
  user: User | null;
  songs: Song[];
  tags: Tag[];
  sections: Section[];
}

// ── Backend config ──

export type BackendType = "local" | "firebase" | "fastapi";

export interface BackendConfig {
  type: BackendType;
  // FastAPI
  apiBaseUrl?: string;
  apiToken?: string;
  // Firebase
  firebaseConfig?: Record<string, string>;
}
