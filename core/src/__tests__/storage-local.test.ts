import { describe, it, expect, beforeEach } from "vitest";
import { LocalStorageProvider } from "../storage-local.js";
import { createSong, createTag, createSection } from "../models.js";
import type { Song, Tag, Section } from "../models.js";

describe("LocalStorageProvider (IndexedDB)", () => {
  let storage: LocalStorageProvider;

  beforeEach(async () => {
    storage = new LocalStorageProvider();
    await storage.clear();
  });

  // ── Song CRUD ──

  describe("Songs", () => {
    const makeSong = (overrides?: Partial<Parameters<typeof createSong>[0]>): Song =>
      createSong({ title: "Test Song", artist: "Test Artist", source: "manual", ...overrides });

    it("upserts and retrieves a song", async () => {
      const song = makeSong();
      await storage.upsertSong(song);
      const retrieved = await storage.getSong(song.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.title).toBe("Test Song");
    });

    it("lists all songs", async () => {
      await storage.upsertSong(makeSong({ title: "Song A" }));
      await storage.upsertSong(makeSong({ title: "Song B" }));
      await storage.upsertSong(makeSong({ title: "Song C" }));

      const songs = await storage.getSongs();
      expect(songs.length).toBe(3);
    });

    it("searches songs by title", async () => {
      await storage.upsertSong(makeSong({ title: "Bohemian Rhapsody", artist: "Queen" }));
      await storage.upsertSong(makeSong({ title: "Another One Bites the Dust", artist: "Queen" }));
      await storage.upsertSong(makeSong({ title: "Stairway to Heaven", artist: "Led Zeppelin" }));

      const results = await storage.searchSongs("queen");
      expect(results.length).toBe(2);
    });

    it("searches songs by artist", async () => {
      await storage.upsertSong(makeSong({ title: "Song 1", artist: "Radiohead" }));
      await storage.upsertSong(makeSong({ title: "Song 2", artist: "Radiohead" }));
      await storage.upsertSong(makeSong({ title: "Song 3", artist: "Other" }));

      const results = await storage.searchSongs("radiohead");
      expect(results.length).toBe(2);
    });

    it("updates a song via upsert", async () => {
      const song = makeSong({ title: "Original Title" });
      await storage.upsertSong(song);

      const updated = { ...song, title: "Updated Title" };
      await storage.upsertSong(updated);

      const retrieved = await storage.getSong(song.id);
      expect(retrieved!.title).toBe("Updated Title");

      const all = await storage.getSongs();
      expect(all.length).toBe(1);
    });

    it("deletes a song and its tags/sections", async () => {
      const song = makeSong();
      await storage.upsertSong(song);

      const tag = createTag({ songId: song.id, timestampMs: 1000 });
      await storage.upsertTag(tag);

      const section = createSection({ songId: song.id, startMs: 0, endMs: 5000, type: "intro" });
      await storage.upsertSection(section);

      await storage.deleteSong(song.id);

      expect(await storage.getSong(song.id)).toBeNull();
      expect((await storage.getTagsForSong(song.id)).length).toBe(0);
      expect((await storage.getSectionsForSong(song.id)).length).toBe(0);
    });

    it("returns null for non-existent song", async () => {
      const result = await storage.getSong("non-existent-id");
      expect(result).toBeNull();
    });
  });

  // ── Tag CRUD ──

  describe("Tags", () => {
    let songId: string;

    beforeEach(async () => {
      const song = createSong({ title: "Tag Test Song", source: "manual" });
      await storage.upsertSong(song);
      songId = song.id;
    });

    it("creates and retrieves tags for a song", async () => {
      const tag1 = createTag({ songId, timestampMs: 10000, label: "verse start" });
      const tag2 = createTag({ songId, timestampMs: 45000, label: "chorus" });
      const tag3 = createTag({ songId, timestampMs: 25000, label: "pre-chorus" });

      await storage.upsertTag(tag1);
      await storage.upsertTag(tag2);
      await storage.upsertTag(tag3);

      const tags = await storage.getTagsForSong(songId);
      expect(tags.length).toBe(3);
      // Should be sorted by timestampMs
      expect(tags[0].timestampMs).toBe(10000);
      expect(tags[1].timestampMs).toBe(25000);
      expect(tags[2].timestampMs).toBe(45000);
    });

    it("deletes a single tag", async () => {
      const tag = createTag({ songId, timestampMs: 5000 });
      await storage.upsertTag(tag);
      expect(await storage.getTag(tag.id)).not.toBeNull();

      await storage.deleteTag(tag.id);
      expect(await storage.getTag(tag.id)).toBeNull();
    });

    it("gets all tags across songs", async () => {
      const song2 = createSong({ title: "Another Song", source: "manual" });
      await storage.upsertSong(song2);

      await storage.upsertTag(createTag({ songId, timestampMs: 1000 }));
      await storage.upsertTag(createTag({ songId: song2.id, timestampMs: 2000 }));

      const allTags = await storage.getAllTags();
      expect(allTags.length).toBe(2);
    });
  });

  // ── Section CRUD ──

  describe("Sections", () => {
    let songId: string;

    beforeEach(async () => {
      const song = createSong({ title: "Section Test Song", source: "manual" });
      await storage.upsertSong(song);
      songId = song.id;
    });

    it("creates and retrieves sections sorted by startMs", async () => {
      await storage.upsertSection(createSection({ songId, startMs: 60000, endMs: 120000, type: "chorus" }));
      await storage.upsertSection(createSection({ songId, startMs: 0, endMs: 15000, type: "intro" }));
      await storage.upsertSection(createSection({ songId, startMs: 15000, endMs: 60000, type: "verse" }));

      const sections = await storage.getSectionsForSong(songId);
      expect(sections.length).toBe(3);
      expect(sections[0].type).toBe("intro");
      expect(sections[1].type).toBe("verse");
      expect(sections[2].type).toBe("chorus");
    });

    it("deletes a section", async () => {
      const section = createSection({ songId, startMs: 0, endMs: 5000, type: "intro" });
      await storage.upsertSection(section);

      await storage.deleteSection(section.id);
      expect(await storage.getSection(section.id)).toBeNull();
    });
  });

  // ── Export / Import ──

  describe("Export & Import", () => {
    it("exports all data", async () => {
      const song = createSong({ title: "Export Test", source: "manual" });
      await storage.upsertSong(song);
      await storage.upsertTag(createTag({ songId: song.id, timestampMs: 5000 }));
      await storage.upsertSection(createSection({ songId: song.id, startMs: 0, endMs: 10000, type: "intro" }));

      const exported = await storage.exportAll();
      expect(exported.version).toBe(1);
      expect(exported.songs.length).toBe(1);
      expect(exported.tags.length).toBe(1);
      expect(exported.sections.length).toBe(1);
      expect(exported.exportedAt).toBeTruthy();
    });

    it("imports data into a fresh database", async () => {
      const song = createSong({ title: "Import Test", source: "spotify" });
      const tag = createTag({ songId: song.id, timestampMs: 30000, label: "bridge" });
      const section = createSection({ songId: song.id, startMs: 60000, endMs: 90000, type: "bridge" });

      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        user: null,
        songs: [song],
        tags: [tag],
        sections: [section],
      };

      // Import into fresh storage
      const freshStorage = new LocalStorageProvider();
      await freshStorage.clear();
      await freshStorage.importAll(exportData);

      const songs = await freshStorage.getSongs();
      expect(songs.length).toBe(1);
      expect(songs[0].title).toBe("Import Test");

      const tags = await freshStorage.getTagsForSong(song.id);
      expect(tags.length).toBe(1);
      expect(tags[0].label).toBe("bridge");
    });

    it("clear() removes all data", async () => {
      await storage.upsertSong(createSong({ title: "To Delete", source: "manual" }));
      await storage.clear();

      expect((await storage.getSongs()).length).toBe(0);
      expect((await storage.getAllTags()).length).toBe(0);
      expect((await storage.getAllSections()).length).toBe(0);
    });
  });
});
