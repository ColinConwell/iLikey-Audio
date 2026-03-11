import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ManualMediaDetector, AggregateMediaDetector } from "../media.js";
import type { NowPlayingInfo } from "../models.js";

describe("ManualMediaDetector", () => {
  let detector: ManualMediaDetector;

  beforeEach(() => {
    detector = new ManualMediaDetector();
  });

  afterEach(() => {
    detector.stopPolling();
  });

  it("is always available", async () => {
    expect(await detector.isAvailable()).toBe(true);
  });

  it("returns null when nothing is set", async () => {
    expect(await detector.getNowPlaying()).toBeNull();
  });

  it("returns the manually set track", async () => {
    const info: NowPlayingInfo = {
      title: "Test Track",
      artist: "Test Artist",
      isPlaying: true,
      source: "manual",
    };
    detector.setNowPlaying(info);

    const result = await detector.getNowPlaying();
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Test Track");
  });

  it("clears now-playing when set to null", async () => {
    detector.setNowPlaying({
      title: "Track",
      artist: "Artist",
      isPlaying: true,
      source: "manual",
    });
    expect(await detector.getNowPlaying()).not.toBeNull();

    detector.setNowPlaying(null);
    expect(await detector.getNowPlaying()).toBeNull();
  });

  it("notifies listeners on change via polling", async () => {
    const callback = vi.fn();
    detector.onNowPlayingChanged(callback);
    detector.startPolling(50); // 50ms for fast testing

    // Set a track
    detector.setNowPlaying({
      title: "New Track",
      artist: "New Artist",
      isPlaying: true,
      source: "manual",
    });

    // Wait for poll
    await new Promise((r) => setTimeout(r, 150));

    expect(callback).toHaveBeenCalled();
    expect(callback.mock.calls[0][0]?.title).toBe("New Track");
  });

  it("unsubscribe stops notifications", async () => {
    const callback = vi.fn();
    const unsub = detector.onNowPlayingChanged(callback);
    detector.startPolling(50);

    unsub(); // Unsubscribe immediately

    detector.setNowPlaying({
      title: "Should Not Fire",
      artist: "Artist",
      isPlaying: true,
      source: "manual",
    });

    await new Promise((r) => setTimeout(r, 150));
    expect(callback).not.toHaveBeenCalled();
  });

  it("does not notify if track hasn't changed", async () => {
    const callback = vi.fn();
    detector.onNowPlayingChanged(callback);

    const info: NowPlayingInfo = {
      title: "Stable Track",
      artist: "Stable Artist",
      isPlaying: true,
      source: "manual",
      externalId: "stable-1",
    };

    detector.setNowPlaying(info);
    detector.startPolling(50);

    // Wait for first notification
    await new Promise((r) => setTimeout(r, 100));
    const callCount = callback.mock.calls.length;

    // Wait more — should NOT fire again since track is same
    await new Promise((r) => setTimeout(r, 200));
    expect(callback.mock.calls.length).toBe(callCount);
  });
});

describe("AggregateMediaDetector", () => {
  it("tries detectors in order", async () => {
    const detector1 = new ManualMediaDetector();
    const detector2 = new ManualMediaDetector();

    detector2.setNowPlaying({
      title: "From Second Detector",
      artist: "Artist",
      isPlaying: true,
      source: "manual",
    });

    const aggregate = new AggregateMediaDetector([detector1, detector2]);

    // First detector returns null, so it should fall through to second
    const result = await aggregate.getNowPlaying();
    expect(result).not.toBeNull();
    expect(result!.title).toBe("From Second Detector");
  });

  it("prefers first detector if it has a result", async () => {
    const detector1 = new ManualMediaDetector();
    const detector2 = new ManualMediaDetector();

    detector1.setNowPlaying({
      title: "From First",
      artist: "Artist",
      isPlaying: true,
      source: "manual",
    });
    detector2.setNowPlaying({
      title: "From Second",
      artist: "Artist",
      isPlaying: true,
      source: "manual",
    });

    const aggregate = new AggregateMediaDetector([detector1, detector2]);
    const result = await aggregate.getNowPlaying();
    expect(result!.title).toBe("From First");
  });

  it("returns null if no detectors have results", async () => {
    const aggregate = new AggregateMediaDetector([
      new ManualMediaDetector(),
      new ManualMediaDetector(),
    ]);
    expect(await aggregate.getNowPlaying()).toBeNull();
  });
});
