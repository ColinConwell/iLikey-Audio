import type { NowPlayingInfo } from "./models.js";

// ── Media Detection Interface ──
// Each platform/service provides its own implementation.

export interface IMediaDetector {
  readonly name: string;
  readonly source: string;

  /** Check if this detector is available on the current platform */
  isAvailable(): Promise<boolean>;

  /** Get the currently playing track, or null if nothing is playing */
  getNowPlaying(): Promise<NowPlayingInfo | null>;

  /** Start polling for now-playing changes */
  startPolling(intervalMs?: number): void;

  /** Stop polling */
  stopPolling(): void;

  /** Register a callback for when the now-playing info changes */
  onNowPlayingChanged(callback: (info: NowPlayingInfo | null) => void): () => void;
}

// ── Base implementation with polling logic ──

export abstract class BaseMediaDetector implements IMediaDetector {
  abstract readonly name: string;
  abstract readonly source: string;

  private listeners: Set<(info: NowPlayingInfo | null) => void> = new Set();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private lastInfo: NowPlayingInfo | null = null;

  abstract isAvailable(): Promise<boolean>;
  abstract getNowPlaying(): Promise<NowPlayingInfo | null>;

  startPolling(intervalMs = 1000): void {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(async () => {
      const info = await this.getNowPlaying();
      if (!this.isEqual(info, this.lastInfo)) {
        this.lastInfo = info;
        this.listeners.forEach((cb) => cb(info));
      }
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  onNowPlayingChanged(callback: (info: NowPlayingInfo | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private isEqual(a: NowPlayingInfo | null, b: NowPlayingInfo | null): boolean {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return (
      a.title === b.title &&
      a.artist === b.artist &&
      a.isPlaying === b.isPlaying &&
      a.externalId === b.externalId
    );
  }
}

// ── Manual detector (user enters info manually) ──

export class ManualMediaDetector extends BaseMediaDetector {
  readonly name = "Manual";
  readonly source = "manual";

  private currentInfo: NowPlayingInfo | null = null;

  async isAvailable(): Promise<boolean> {
    return true; // always available
  }

  async getNowPlaying(): Promise<NowPlayingInfo | null> {
    return this.currentInfo;
  }

  setNowPlaying(info: NowPlayingInfo | null): void {
    this.currentInfo = info;
  }
}

// ── Aggregate detector: tries multiple detectors in priority order ──

export class AggregateMediaDetector extends BaseMediaDetector {
  readonly name = "Aggregate";
  readonly source = "os-now-playing";

  constructor(private detectors: IMediaDetector[]) {
    super();
  }

  async isAvailable(): Promise<boolean> {
    for (const d of this.detectors) {
      if (await d.isAvailable()) return true;
    }
    return false;
  }

  async getNowPlaying(): Promise<NowPlayingInfo | null> {
    for (const d of this.detectors) {
      if (await d.isAvailable()) {
        const info = await d.getNowPlaying();
        if (info) return info;
      }
    }
    return null;
  }
}
