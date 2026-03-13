# iLikey-Audio — Implementation Plan

## Architecture Overview

```
iLikey-Audio/
├── core/                  # Shared TypeScript library (models, logic, storage abstraction)
├── web/                   # React SPA (Vite) — deploys to Netlify
├── desktop/               # Tauri app — wraps web UI, adds OS-level Now Playing
├── backend/
│   ├── fastapi/           # FastAPI server — deploys to Railway
│   └── firebase/          # Firebase config, Firestore rules, Cloud Functions
├── swift/                 # Future: native Swift apps (iOS/iPadOS/macOS)
└── shared/                # Shared types, constants, API contracts (used by all targets)
```

### Key Principles
- **Local-first**: All tagging works offline. IndexedDB (web/Tauri), SQLite (mobile/desktop native).
- **Sync-optional**: Backend sync is additive — app is fully functional without it.
- **Abstraction layers**: Media detection, storage, and auth are behind interfaces so each platform can provide its own implementation.
- **Both backends**: Firebase AND FastAPI are set up. A config toggle switches between them. Same API contract.

---

## Phase 1: Foundation (Current Sprint)

### 1.1 Monorepo Setup
- pnpm workspaces for `core/`, `web/`, `desktop/`, `backend/fastapi/`, `backend/firebase/`
- Shared TypeScript config, ESLint, Prettier
- Turborepo for build orchestration

### 1.2 Core Library (`core/`)
- **Data Models** (TypeScript + Zod validation):
  - `Song` — name, artist, album, source (spotify/tidal/apple/manual), duration, externalId
  - `Tag` — songId, timestamp (ms), label (free-text), color, createdAt
  - `Section` — songId, startMs, endMs, type (verse/chorus/bridge/drop/intro/outro/custom), label, color, createdAt
  - `UserLibrary` — collection of songs with their tags/sections
- **Storage Interface**:
  - `IStorageProvider` — CRUD for songs, tags, sections
  - `LocalStorageProvider` — IndexedDB via Dexie.js (web/Tauri)
  - `FirebaseStorageProvider` — Firestore
  - `APIStorageProvider` — FastAPI REST client
- **Media Detection Interface**:
  - `IMediaDetector` — `getNowPlaying(): Promise<NowPlayingInfo | null>`
  - `SpotifyMediaDetector` — Spotify Web API (works everywhere)
  - `TidalMediaDetector` — Tidal API
  - `OSMediaDetector` — placeholder for native implementations (Tauri plugin, Swift)
- **Auth Interface**:
  - `IAuthProvider` — login, logout, getUser, onAuthChange
  - `AnonymousAuthProvider` — local-only, generates a local UUID
  - `FirebaseAuthProvider` — Google, GitHub, Apple sign-in
  - `OAuthProvider` — Spotify, Tidal OAuth flows

### 1.3 Web App (`web/`)
- **Vite + React + TypeScript**
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **Key Views**:
  - **Now Playing** — shows current track, tag/section buttons
  - **Library** — browse tagged songs, search, filter by source
  - **Song Detail** — waveform-style timeline showing tags/sections, edit/delete
  - **Settings** — connect streaming services, choose backend, export data
- **Tagging UX**:
  - Single tap → instant timestamp tag (with optional label popup)
  - Toggle "Section Mode" → first tap marks start, second marks end, then label/type picker
  - Pre-defined section types: verse, chorus, bridge, drop, intro, outro, custom
  - Free-text labels on both tags and sections
  - Color coding per section type

### 1.4 Tauri Desktop App (`desktop/`)
- Wraps the web app
- Adds Tauri plugins for:
  - OS-level Now Playing detection (MPRIS on Linux, MediaPlayer on Windows, MRMediaRemoteNowPlayingInfo on macOS)
  - System tray with quick-tag hotkey
  - Local SQLite as alternative storage backend
- Global keyboard shortcut for tagging (e.g., Cmd/Ctrl+Shift+T)

---

## Phase 2: Backends

### 2.1 FastAPI Backend (`backend/fastapi/`)
- **Endpoints**: CRUD for songs, tags, sections, user library
- **Auth**: JWT-based, supports OAuth tokens from Spotify/Tidal/Google/GitHub/Apple
- **Database**: PostgreSQL (via SQLAlchemy + Alembic migrations)
- **Deploy**: Railway (Dockerfile provided)
- **Sync**: Conflict resolution via last-write-wins with timestamps

### 2.2 Firebase Backend (`backend/firebase/`)
- **Firestore**: Collections for users, songs, tags, sections
- **Security Rules**: User-scoped access
- **Cloud Functions**: Optional server-side logic (e.g., deduplication, metadata enrichment)
- **Auth**: Firebase Auth with Google, GitHub, Apple, + custom token exchange for Spotify/Tidal
- **Deploy**: Firebase CLI

---

## Phase 3: Streaming Integrations
- Spotify Web API (playback state, track metadata, OAuth)
- Tidal API (same)
- Apple Music API (MusicKit JS for web, MusicKit for Swift)
- Each integration provides both `IMediaDetector` and `IAuthProvider` implementations

---

## Phase 4: Native Swift Apps (`swift/`)
- **Shared Swift Package**: models, storage (Core Data/SwiftData), media detection
- **iOS/iPadOS App**: SwiftUI, Now Playing via MPNowPlayingInfoCenter
- **macOS App**: SwiftUI, replaces Tauri for Mac users who want native experience
- Communicates with same backends (FastAPI or Firebase)

---

## Data Export/Sharing
- Export as JSON, CSV
- Shareable links (if backend is configured)
- Import/merge libraries

---

## Deployment Targets
| Platform | Technology | Deployment |
|----------|-----------|------------|
| Web | React (Vite) | Netlify |
| Windows | Tauri | GitHub Releases |
| Linux | Tauri | GitHub Releases / Snap / Flatpak |
| macOS | Tauri (v1) → Swift (v2) | GitHub Releases → Mac App Store |
| iOS | Swift (Phase 4) | App Store |
| iPadOS | Swift (Phase 4) | App Store |
| Android | React Native or Capacitor (Phase 4) | Play Store |
