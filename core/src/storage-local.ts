import Dexie, { type EntityTable } from "dexie";
import type { Song, Tag, Section, User } from "./models.js";
import type { IStorageProvider, ExportData } from "./storage.js";

// ── IndexedDB Storage (Web + Tauri) ──

class ILikeyDatabase extends Dexie {
  songs!: EntityTable<Song, "id">;
  tags!: EntityTable<Tag, "id">;
  sections!: EntityTable<Section, "id">;
  users!: EntityTable<User, "id">;

  constructor() {
    super("ilikey-audio");

    this.version(1).stores({
      songs: "id, title, artist, source, externalId, createdAt",
      tags: "id, songId, timestampMs, createdAt",
      sections: "id, songId, startMs, type, createdAt",
      users: "id",
    });
  }
}

export class LocalStorageProvider implements IStorageProvider {
  private db: ILikeyDatabase;

  constructor() {
    this.db = new ILikeyDatabase();
  }

  // Songs
  async getSong(id: string): Promise<Song | null> {
    return (await this.db.songs.get(id)) ?? null;
  }

  async getSongs(): Promise<Song[]> {
    return this.db.songs.orderBy("createdAt").reverse().toArray();
  }

  async searchSongs(query: string): Promise<Song[]> {
    const q = query.toLowerCase();
    return this.db.songs
      .filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          (s.album?.toLowerCase().includes(q) ?? false)
      )
      .toArray();
  }

  async upsertSong(song: Song): Promise<void> {
    await this.db.songs.put(song);
  }

  async deleteSong(id: string): Promise<void> {
    await this.db.transaction("rw", [this.db.songs, this.db.tags, this.db.sections], async () => {
      await this.db.tags.where("songId").equals(id).delete();
      await this.db.sections.where("songId").equals(id).delete();
      await this.db.songs.delete(id);
    });
  }

  // Tags
  async getTag(id: string): Promise<Tag | null> {
    return (await this.db.tags.get(id)) ?? null;
  }

  async getTagsForSong(songId: string): Promise<Tag[]> {
    return this.db.tags.where("songId").equals(songId).sortBy("timestampMs");
  }

  async getAllTags(): Promise<Tag[]> {
    return this.db.tags.toArray();
  }

  async upsertTag(tag: Tag): Promise<void> {
    await this.db.tags.put(tag);
  }

  async deleteTag(id: string): Promise<void> {
    await this.db.tags.delete(id);
  }

  // Sections
  async getSection(id: string): Promise<Section | null> {
    return (await this.db.sections.get(id)) ?? null;
  }

  async getSectionsForSong(songId: string): Promise<Section[]> {
    return this.db.sections.where("songId").equals(songId).sortBy("startMs");
  }

  async getAllSections(): Promise<Section[]> {
    return this.db.sections.toArray();
  }

  async upsertSection(section: Section): Promise<void> {
    await this.db.sections.put(section);
  }

  async deleteSection(id: string): Promise<void> {
    await this.db.sections.delete(id);
  }

  // User
  async getUser(): Promise<User | null> {
    const users = await this.db.users.toArray();
    return users[0] ?? null;
  }

  async setUser(user: User): Promise<void> {
    await this.db.users.clear();
    await this.db.users.put(user);
  }

  // Bulk
  async exportAll(): Promise<ExportData> {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      user: await this.getUser(),
      songs: await this.db.songs.toArray(),
      tags: await this.db.tags.toArray(),
      sections: await this.db.sections.toArray(),
    };
  }

  async importAll(data: ExportData): Promise<void> {
    await this.db.transaction("rw", [this.db.songs, this.db.tags, this.db.sections, this.db.users], async () => {
      if (data.user) await this.db.users.put(data.user);
      await this.db.songs.bulkPut(data.songs);
      await this.db.tags.bulkPut(data.tags);
      await this.db.sections.bulkPut(data.sections);
    });
  }

  async clear(): Promise<void> {
    await this.db.transaction("rw", [this.db.songs, this.db.tags, this.db.sections, this.db.users], async () => {
      await this.db.songs.clear();
      await this.db.tags.clear();
      await this.db.sections.clear();
      await this.db.users.clear();
    });
  }
}
