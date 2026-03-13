# iLikey Audio — Swift Native Apps

Phase 4: Native Swift implementations for iOS, iPadOS, and macOS.

## Planned Structure

```
swift/
├── iLikeyCore/          # Swift Package — shared models, storage (SwiftData), media detection
│   ├── Sources/
│   │   ├── Models/      # Song, Tag, Section (mirrors core/ TypeScript models)
│   │   ├── Storage/     # SwiftData persistence
│   │   ├── Media/       # MPNowPlayingInfoCenter, MusicKit
│   │   └── Network/     # API client (talks to FastAPI or Firebase)
│   └── Package.swift
├── iLikeyiOS/           # iOS + iPadOS app (SwiftUI)
├── iLikeyMac/           # macOS app (SwiftUI, replaces Tauri)
└── Package.swift        # Workspace-level Swift Package
```

## Key APIs
- **iOS/iPadOS**: `MPNowPlayingInfoCenter`, `MusicKit`
- **macOS**: `MRMediaRemoteNowPlayingInfo` (private framework), `MusicKit`
- **Storage**: SwiftData (Core Data successor)
- **UI**: SwiftUI with shared components
