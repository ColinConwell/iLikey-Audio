import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  type Song,
  type Tag,
  type Section,
  type NowPlayingInfo,
  type IStorageProvider,
  type IMediaDetector,
  LocalStorageProvider,
  ManualMediaDetector,
  AnonymousAuthProvider,
  createSong,
  createTag,
  createSection,
} from "@ilikey/core";

interface AppState {
  // Now Playing
  nowPlaying: NowPlayingInfo | null;
  isTaggingSection: boolean;
  sectionStart: number | null;

  // Library
  songs: Song[];
  currentSongTags: Tag[];
  currentSongSections: Section[];

  // Actions
  tagTimestamp: (label?: string) => Promise<void>;
  toggleSectionMode: () => void;
  markSectionPoint: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  loadSongDetails: (songId: string) => Promise<Song | null>;

  // Services
  storage: IStorageProvider;
  mediaDetector: IMediaDetector;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [storage] = useState(() => new LocalStorageProvider());
  const [mediaDetector] = useState(() => new ManualMediaDetector());
  const [auth] = useState(() => new AnonymousAuthProvider());

  const [nowPlaying, setNowPlaying] = useState<NowPlayingInfo | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSongTags, setCurrentSongTags] = useState<Tag[]>([]);
  const [currentSongSections, setCurrentSongSections] = useState<Section[]>([]);
  const [isTaggingSection, setIsTaggingSection] = useState(false);
  const [sectionStart, setSectionStart] = useState<number | null>(null);

  // Initialize anonymous auth
  useEffect(() => {
    auth.getCurrentUser().then((u) => {
      if (!u) auth.signIn();
    });
  }, [auth]);

  // Listen for now-playing changes
  useEffect(() => {
    const unsub = mediaDetector.onNowPlayingChanged(setNowPlaying);
    mediaDetector.startPolling(1000);
    return () => {
      unsub();
      mediaDetector.stopPolling();
    };
  }, [mediaDetector]);

  const refreshLibrary = useCallback(async () => {
    const allSongs = await storage.getSongs();
    setSongs(allSongs);
  }, [storage]);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  // Ensure the current song exists in storage, returning its ID
  const ensureCurrentSong = useCallback(async (): Promise<string | null> => {
    if (!nowPlaying) return null;

    // Check if song already exists by externalId
    const existing = await storage.getSongs();
    const match = existing.find(
      (s) =>
        (s.externalId && s.externalId === nowPlaying.externalId) ||
        (s.title === nowPlaying.title && s.artist === nowPlaying.artist)
    );

    if (match) return match.id;

    const song = createSong({
      title: nowPlaying.title,
      artist: nowPlaying.artist,
      album: nowPlaying.album,
      durationMs: nowPlaying.durationMs,
      source: nowPlaying.source,
      externalId: nowPlaying.externalId,
      externalUrl: nowPlaying.externalUrl,
      artworkUrl: nowPlaying.artworkUrl,
    });

    await storage.upsertSong(song);
    await refreshLibrary();
    return song.id;
  }, [nowPlaying, storage, refreshLibrary]);

  const tagTimestamp = useCallback(
    async (label?: string) => {
      const songId = await ensureCurrentSong();
      if (!songId || !nowPlaying?.positionMs) return;

      const tag = createTag({
        songId,
        timestampMs: nowPlaying.positionMs,
        label: label ?? "",
      });

      await storage.upsertTag(tag);
    },
    [ensureCurrentSong, nowPlaying, storage]
  );

  const toggleSectionMode = useCallback(() => {
    setIsTaggingSection((prev) => {
      if (prev) setSectionStart(null); // cancel section
      return !prev;
    });
  }, []);

  const markSectionPoint = useCallback(async () => {
    if (!nowPlaying?.positionMs) return;

    if (sectionStart === null) {
      // Mark start
      setSectionStart(nowPlaying.positionMs);
    } else {
      // Mark end — create section
      const songId = await ensureCurrentSong();
      if (!songId) return;

      const section = createSection({
        songId,
        startMs: Math.min(sectionStart, nowPlaying.positionMs),
        endMs: Math.max(sectionStart, nowPlaying.positionMs),
        type: "custom",
      });

      await storage.upsertSection(section);
      setSectionStart(null);
      setIsTaggingSection(false);
    }
  }, [nowPlaying, sectionStart, ensureCurrentSong, storage]);

  const deleteSong = useCallback(
    async (id: string) => {
      await storage.deleteSong(id);
      await refreshLibrary();
    },
    [storage, refreshLibrary]
  );

  const deleteTag = useCallback(
    async (id: string) => {
      await storage.deleteTag(id);
    },
    [storage]
  );

  const deleteSection = useCallback(
    async (id: string) => {
      await storage.deleteSection(id);
    },
    [storage]
  );

  const loadSongDetails = useCallback(
    async (songId: string): Promise<Song | null> => {
      const song = await storage.getSong(songId);
      if (song) {
        const tags = await storage.getTagsForSong(songId);
        const sections = await storage.getSectionsForSong(songId);
        setCurrentSongTags(tags);
        setCurrentSongSections(sections);
      }
      return song;
    },
    [storage]
  );

  return (
    <AppContext.Provider
      value={{
        nowPlaying,
        isTaggingSection,
        sectionStart,
        songs,
        currentSongTags,
        currentSongSections,
        tagTimestamp,
        toggleSectionMode,
        markSectionPoint,
        refreshLibrary,
        deleteSong,
        deleteTag,
        deleteSection,
        loadSongDetails,
        storage,
        mediaDetector,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
