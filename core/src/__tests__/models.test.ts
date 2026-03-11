import { describe, it, expect } from "vitest";
import {
  Song,
  Tag,
  Section,
  User,
  NowPlayingInfo,
  SectionType,
  MediaSource,
  SECTION_COLORS,
  createSong,
  createTag,
  createSection,
} from "../models.js";

describe("Models — Zod Schemas", () => {
  describe("Song", () => {
    it("parses a valid song", () => {
      const song = Song.parse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "Test Song",
        artist: "Test Artist",
        album: "Test Album",
        durationMs: 210000,
        source: "spotify",
        externalId: "spotify:track:abc123",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(song.title).toBe("Test Song");
      expect(song.source).toBe("spotify");
    });

    it("applies default artist", () => {
      const song = Song.parse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "No Artist Song",
        source: "manual",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(song.artist).toBe("Unknown Artist");
    });

    it("rejects empty title", () => {
      expect(() =>
        Song.parse({
          id: "550e8400-e29b-41d4-a716-446655440000",
          title: "",
          source: "manual",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        })
      ).toThrow();
    });

    it("rejects invalid source", () => {
      expect(() =>
        Song.parse({
          id: "550e8400-e29b-41d4-a716-446655440000",
          title: "Test",
          source: "invalid-source",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        })
      ).toThrow();
    });

    it("rejects negative durationMs", () => {
      expect(() =>
        Song.parse({
          id: "550e8400-e29b-41d4-a716-446655440000",
          title: "Test",
          source: "manual",
          durationMs: -1,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        })
      ).toThrow();
    });
  });

  describe("Tag", () => {
    it("parses a valid tag with defaults", () => {
      const tag = Tag.parse({
        id: "550e8400-e29b-41d4-a716-446655440001",
        songId: "550e8400-e29b-41d4-a716-446655440000",
        timestampMs: 45000,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(tag.label).toBe("");
      expect(tag.color).toBe("#3b82f6");
      expect(tag.timestampMs).toBe(45000);
    });

    it("accepts custom label and color", () => {
      const tag = Tag.parse({
        id: "550e8400-e29b-41d4-a716-446655440001",
        songId: "550e8400-e29b-41d4-a716-446655440000",
        timestampMs: 0,
        label: "sick drop",
        color: "#ff0000",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(tag.label).toBe("sick drop");
      expect(tag.color).toBe("#ff0000");
    });
  });

  describe("Section", () => {
    it("parses all section types", () => {
      const types = SectionType.options;
      expect(types).toContain("verse");
      expect(types).toContain("chorus");
      expect(types).toContain("drop");
      expect(types).toContain("bridge");
      expect(types).toContain("custom");
      expect(types.length).toBe(12);
    });

    it("parses a valid section", () => {
      const section = Section.parse({
        id: "550e8400-e29b-41d4-a716-446655440002",
        songId: "550e8400-e29b-41d4-a716-446655440000",
        startMs: 30000,
        endMs: 60000,
        type: "chorus",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      expect(section.startMs).toBe(30000);
      expect(section.endMs).toBe(60000);
      expect(section.type).toBe("chorus");
    });

    it("all section types have a color mapping", () => {
      for (const type of SectionType.options) {
        expect(SECTION_COLORS[type]).toBeDefined();
        expect(SECTION_COLORS[type]).toMatch(/^#[0-9a-f]{6}$/);
      }
    });
  });

  describe("MediaSource", () => {
    it("includes all expected sources", () => {
      const sources = MediaSource.options;
      expect(sources).toContain("spotify");
      expect(sources).toContain("tidal");
      expect(sources).toContain("apple-music");
      expect(sources).toContain("youtube-music");
      expect(sources).toContain("soundcloud");
      expect(sources).toContain("local-file");
      expect(sources).toContain("manual");
    });
  });

  describe("NowPlayingInfo", () => {
    it("parses minimal now-playing info", () => {
      const info = NowPlayingInfo.parse({
        title: "Currently Playing",
        artist: "Some Artist",
        isPlaying: true,
        source: "spotify",
      });
      expect(info.title).toBe("Currently Playing");
      expect(info.positionMs).toBeUndefined();
    });

    it("parses full now-playing info", () => {
      const info = NowPlayingInfo.parse({
        title: "Full Track",
        artist: "Full Artist",
        album: "Full Album",
        durationMs: 300000,
        positionMs: 150000,
        isPlaying: true,
        source: "tidal",
        externalId: "tidal:123",
        externalUrl: "https://tidal.com/track/123",
        artworkUrl: "https://tidal.com/art/123.jpg",
      });
      expect(info.durationMs).toBe(300000);
      expect(info.positionMs).toBe(150000);
    });
  });
});

describe("Factory Functions", () => {
  describe("createSong", () => {
    it("generates id and timestamps", () => {
      const song = createSong({
        title: "New Song",
        artist: "New Artist",
        source: "manual",
      });
      expect(song.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(song.createdAt).toBeTruthy();
      expect(song.updatedAt).toBeTruthy();
    });

    it("allows overriding id", () => {
      const song = createSong({
        id: "550e8400-e29b-41d4-a716-446655440099",
        title: "Custom ID Song",
        source: "manual",
      });
      expect(song.id).toBe("550e8400-e29b-41d4-a716-446655440099");
    });
  });

  describe("createTag", () => {
    it("generates id, timestamps, and applies defaults", () => {
      const tag = createTag({
        songId: "550e8400-e29b-41d4-a716-446655440000",
        timestampMs: 42000,
      });
      expect(tag.id).toBeTruthy();
      expect(tag.label).toBe("");
      expect(tag.color).toBe("#3b82f6");
      expect(tag.timestampMs).toBe(42000);
    });

    it("accepts optional label and color", () => {
      const tag = createTag({
        songId: "550e8400-e29b-41d4-a716-446655440000",
        timestampMs: 10000,
        label: "intro ends",
        color: "#00ff00",
      });
      expect(tag.label).toBe("intro ends");
      expect(tag.color).toBe("#00ff00");
    });
  });

  describe("createSection", () => {
    it("generates id, timestamps, and applies defaults", () => {
      const section = createSection({
        songId: "550e8400-e29b-41d4-a716-446655440000",
        startMs: 0,
        endMs: 15000,
        type: "intro",
      });
      expect(section.id).toBeTruthy();
      expect(section.label).toBe("");
      expect(section.type).toBe("intro");
    });
  });
});
