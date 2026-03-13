import { describe, it, expect, beforeEach } from "vitest";
import { ManualMediaDetector } from "../media.js";
import { LocalStorageProvider } from "../storage-local.js";
import { createSong, createTag, createSection } from "../models.js";
import type { NowPlayingInfo } from "../models.js";

/**
 * Simulates the full tagging workflow:
 * 1. A "now playing" track with advancing position
 * 2. Random-interval button presses that create tags/sections
 * 3. Measures end-to-end latency for each operation
 */

interface LatencyResult {
  operation: string;
  latencyMs: number;
  timestampMs: number;
}

describe("Tagging Latency & Playback Simulation", () => {
  let storage: LocalStorageProvider;
  let detector: ManualMediaDetector;

  beforeEach(async () => {
    storage = new LocalStorageProvider();
    await storage.clear();
    detector = new ManualMediaDetector();
  });

  /**
   * Simulate a playing track with advancing position.
   * Returns a function to get current "position".
   */
  function simulatePlayback(durationMs: number): {
    getPosition: () => number;
    play: () => void;
    pause: () => void;
    isPlaying: () => boolean;
  } {
    let playing = false;
    let position = 0;
    let lastResumeTime = 0;
    let accumulatedBeforePause = 0;

    return {
      getPosition: () => {
        if (!playing) return position;
        return accumulatedBeforePause + (performance.now() - lastResumeTime);
      },
      play: () => {
        if (!playing) {
          playing = true;
          lastResumeTime = performance.now();
        }
      },
      pause: () => {
        if (playing) {
          accumulatedBeforePause += performance.now() - lastResumeTime;
          position = accumulatedBeforePause;
          playing = false;
        }
      },
      isPlaying: () => playing,
    };
  }

  it("measures single-tag latency across random intervals", async () => {
    const song = createSong({
      title: "Latency Test Song",
      artist: "Test Artist",
      durationMs: 180000, // 3 minutes
      source: "manual",
    });
    await storage.upsertSong(song);

    const playback = simulatePlayback(180000);
    playback.play();

    const results: LatencyResult[] = [];
    const NUM_TAGS = 20;

    // Simulate random-interval tag button presses
    for (let i = 0; i < NUM_TAGS; i++) {
      // Random delay 10-100ms to simulate user pressing at different times
      await new Promise((r) => setTimeout(r, Math.random() * 90 + 10));

      const positionAtPress = playback.getPosition();
      const start = performance.now();

      // Update detector state (simulating real-time position update)
      detector.setNowPlaying({
        title: song.title,
        artist: song.artist,
        durationMs: song.durationMs,
        positionMs: Math.round(positionAtPress),
        isPlaying: true,
        source: "manual",
      });

      // Create and persist the tag
      const tag = createTag({
        songId: song.id,
        timestampMs: Math.round(positionAtPress),
        label: `tag-${i}`,
      });
      await storage.upsertTag(tag);

      const latency = performance.now() - start;
      results.push({
        operation: "tag",
        latencyMs: latency,
        timestampMs: Math.round(positionAtPress),
      });
    }

    playback.pause();

    // Verify all tags were persisted
    const tags = await storage.getTagsForSong(song.id);
    expect(tags.length).toBe(NUM_TAGS);

    // Analyze latency
    const latencies = results.map((r) => r.latencyMs);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const minLatency = Math.min(...latencies);
    const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

    console.log(`\n📊 Single-Tag Latency Results (${NUM_TAGS} tags):`);
    console.log(`   Min: ${minLatency.toFixed(2)}ms`);
    console.log(`   Avg: ${avgLatency.toFixed(2)}ms`);
    console.log(`   P95: ${p95.toFixed(2)}ms`);
    console.log(`   Max: ${maxLatency.toFixed(2)}ms`);

    // Tags should be created in under 50ms each (IndexedDB is fast)
    expect(avgLatency).toBeLessThan(50);
    expect(maxLatency).toBeLessThan(200);
  });

  it("measures section-marking latency (two-tap workflow)", async () => {
    const song = createSong({
      title: "Section Test Song",
      artist: "Test Artist",
      durationMs: 300000, // 5 minutes
      source: "manual",
    });
    await storage.upsertSong(song);

    const playback = simulatePlayback(300000);
    playback.play();

    const results: LatencyResult[] = [];
    const NUM_SECTIONS = 10;

    for (let i = 0; i < NUM_SECTIONS; i++) {
      // Wait a bit for playback to advance
      await new Promise((r) => setTimeout(r, Math.random() * 50 + 20));

      const startPos = playback.getPosition();

      // Another delay for second tap
      await new Promise((r) => setTimeout(r, Math.random() * 80 + 30));

      const endPos = playback.getPosition();
      const start = performance.now();

      const section = createSection({
        songId: song.id,
        startMs: Math.round(Math.min(startPos, endPos)),
        endMs: Math.round(Math.max(startPos, endPos)),
        type: ["verse", "chorus", "bridge", "drop", "intro", "outro"][i % 6] as any,
        label: `section-${i}`,
      });
      await storage.upsertSection(section);

      const latency = performance.now() - start;
      results.push({
        operation: "section",
        latencyMs: latency,
        timestampMs: Math.round(startPos),
      });
    }

    playback.pause();

    const sections = await storage.getSectionsForSong(song.id);
    expect(sections.length).toBe(NUM_SECTIONS);

    const latencies = results.map((r) => r.latencyMs);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);

    console.log(`\n📊 Section-Marking Latency Results (${NUM_SECTIONS} sections):`);
    console.log(`   Avg: ${avgLatency.toFixed(2)}ms`);
    console.log(`   Max: ${maxLatency.toFixed(2)}ms`);

    expect(avgLatency).toBeLessThan(50);
  });

  it("measures play/pause toggle responsiveness", async () => {
    const playback = simulatePlayback(180000);
    const toggleResults: { action: string; latencyMs: number }[] = [];
    const NUM_TOGGLES = 20;

    for (let i = 0; i < NUM_TOGGLES; i++) {
      await new Promise((r) => setTimeout(r, Math.random() * 30 + 10));

      const start = performance.now();
      if (playback.isPlaying()) {
        playback.pause();
        const info: NowPlayingInfo = {
          title: "Test",
          artist: "Test",
          positionMs: Math.round(playback.getPosition()),
          isPlaying: false,
          source: "manual",
        };
        detector.setNowPlaying(info);
      } else {
        playback.play();
        const info: NowPlayingInfo = {
          title: "Test",
          artist: "Test",
          positionMs: Math.round(playback.getPosition()),
          isPlaying: true,
          source: "manual",
        };
        detector.setNowPlaying(info);
      }
      const latency = performance.now() - start;
      toggleResults.push({
        action: playback.isPlaying() ? "play" : "pause",
        latencyMs: latency,
      });
    }

    const latencies = toggleResults.map((r) => r.latencyMs);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    console.log(`\n📊 Play/Pause Toggle Latency (${NUM_TOGGLES} toggles):`);
    console.log(`   Avg: ${avgLatency.toFixed(2)}ms`);
    console.log(`   Max: ${Math.max(...latencies).toFixed(2)}ms`);

    // Toggle should be essentially instant (< 5ms)
    expect(avgLatency).toBeLessThan(5);
  });

  it("stress test: rapid-fire tagging under load", async () => {
    const song = createSong({
      title: "Stress Test Song",
      artist: "Test",
      durationMs: 300000,
      source: "manual",
    });
    await storage.upsertSong(song);

    const playback = simulatePlayback(300000);
    playback.play();

    // Fire 100 tags as fast as possible
    const start = performance.now();
    const promises: Promise<void>[] = [];

    for (let i = 0; i < 100; i++) {
      const pos = playback.getPosition();
      const tag = createTag({
        songId: song.id,
        timestampMs: Math.round(pos),
        label: `rapid-${i}`,
      });
      promises.push(storage.upsertTag(tag));
    }

    await Promise.all(promises);
    const totalTime = performance.now() - start;

    playback.pause();

    const tags = await storage.getTagsForSong(song.id);
    expect(tags.length).toBe(100);

    console.log(`\n📊 Rapid-Fire Stress Test (100 concurrent tags):`);
    console.log(`   Total: ${totalTime.toFixed(2)}ms`);
    console.log(`   Per tag: ${(totalTime / 100).toFixed(2)}ms`);

    // 100 concurrent tags should complete in under 2 seconds
    expect(totalTime).toBeLessThan(2000);
  });

  it("mixed workflow: play, tag, pause, tag, section, resume", async () => {
    const song = createSong({
      title: "Mixed Workflow Song",
      artist: "Test",
      durationMs: 240000,
      source: "spotify",
      externalId: "spotify:track:test123",
    });
    await storage.upsertSong(song);

    const playback = simulatePlayback(240000);
    const timeline: { action: string; posMs: number; latencyMs: number }[] = [];

    // 1. Play
    playback.play();
    detector.setNowPlaying({
      title: song.title,
      artist: song.artist,
      positionMs: 0,
      isPlaying: true,
      source: "spotify",
      externalId: song.externalId,
    });

    // 2. Tag at ~50ms
    await new Promise((r) => setTimeout(r, 50));
    let pos = playback.getPosition();
    let t0 = performance.now();
    await storage.upsertTag(createTag({ songId: song.id, timestampMs: Math.round(pos), label: "intro" }));
    timeline.push({ action: "tag", posMs: Math.round(pos), latencyMs: performance.now() - t0 });

    // 3. Pause
    await new Promise((r) => setTimeout(r, 30));
    playback.pause();
    pos = playback.getPosition();
    detector.setNowPlaying({
      title: song.title,
      artist: song.artist,
      positionMs: Math.round(pos),
      isPlaying: false,
      source: "spotify",
    });

    // 4. Tag while paused
    t0 = performance.now();
    await storage.upsertTag(createTag({ songId: song.id, timestampMs: Math.round(pos), label: "paused-tag" }));
    timeline.push({ action: "tag-paused", posMs: Math.round(pos), latencyMs: performance.now() - t0 });

    // 5. Resume
    playback.play();
    await new Promise((r) => setTimeout(r, 40));

    // 6. Mark section (two points)
    const sectionStart = playback.getPosition();
    await new Promise((r) => setTimeout(r, 60));
    const sectionEnd = playback.getPosition();
    t0 = performance.now();
    await storage.upsertSection(
      createSection({
        songId: song.id,
        startMs: Math.round(sectionStart),
        endMs: Math.round(sectionEnd),
        type: "chorus",
        label: "main chorus",
      })
    );
    timeline.push({ action: "section", posMs: Math.round(sectionStart), latencyMs: performance.now() - t0 });

    // 7. Another tag
    await new Promise((r) => setTimeout(r, 25));
    pos = playback.getPosition();
    t0 = performance.now();
    await storage.upsertTag(createTag({ songId: song.id, timestampMs: Math.round(pos), label: "post-chorus" }));
    timeline.push({ action: "tag", posMs: Math.round(pos), latencyMs: performance.now() - t0 });

    playback.pause();

    // Verify everything persisted
    const tags = await storage.getTagsForSong(song.id);
    const sections = await storage.getSectionsForSong(song.id);
    expect(tags.length).toBe(3);
    expect(sections.length).toBe(1);
    expect(sections[0].label).toBe("main chorus");

    console.log("\n📊 Mixed Workflow Timeline:");
    for (const entry of timeline) {
      console.log(`   [${entry.posMs}ms] ${entry.action}: ${entry.latencyMs.toFixed(2)}ms`);
    }

    // All operations should be fast
    for (const entry of timeline) {
      expect(entry.latencyMs).toBeLessThan(100);
    }
  });
});
