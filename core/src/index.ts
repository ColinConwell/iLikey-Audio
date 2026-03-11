// Models
export {
  Song,
  Tag,
  Section,
  User,
  NowPlayingInfo,
  SectionType,
  MediaSource,
  AuthProvider as AuthProviderEnum,
  SECTION_COLORS,
  createSong,
  createTag,
  createSection,
} from "./models.js";

// Storage
export type { IStorageProvider, ExportData, BackendConfig, BackendType } from "./storage.js";
export { LocalStorageProvider } from "./storage-local.js";

// Media Detection
export type { IMediaDetector } from "./media.js";
export { BaseMediaDetector, ManualMediaDetector, AggregateMediaDetector } from "./media.js";

// Auth
export type { IAuthProvider } from "./auth.js";
export { AnonymousAuthProvider } from "./auth.js";

// Integrations
export { SpotifyMediaDetector, SpotifyAuthProvider } from "./spotify.js";
