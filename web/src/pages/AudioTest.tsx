import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, Bookmark, Scissors, RotateCcw } from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatTimestamp, cn } from "../lib/utils";
import type { ManualMediaDetector } from "@ilikey/core";

// Public domain / CC0 audio samples
const TEST_TRACKS = [
  {
    title: "Bach - Cello Suite No. 1",
    artist: "Public Domain",
    // Archive.org — public domain classical
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Johann_Sebastian_Bach_-_Cello_Suite_No._1_in_G_major%2C_BWV_1007_-_I._Pr%C3%A9lude_%28excerpt%29.ogg",
    source: "local-file" as const,
  },
  {
    title: "Chopin - Nocturne Op. 9 No. 2",
    artist: "Public Domain",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e4/Chopin_-_Nocturne_Op._9_No._2_%28Maurizio_Pollini%29.ogg",
    source: "local-file" as const,
  },
  {
    title: "Mozart - Eine kleine Nachtmusik",
    artist: "Public Domain",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/09/Mozart_-_Eine_kleine_Nachtmusik_-_1._Allegro.ogg",
    source: "local-file" as const,
  },
];

interface LatencyEntry {
  type: "tag" | "section-start" | "section-end" | "play" | "pause";
  timestampMs: number;
  latencyMs: number;
}

export function AudioTest() {
  const { tagTimestamp, toggleSectionMode, markSectionPoint, isTaggingSection, sectionStart, mediaDetector, storage } =
    useApp();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);

  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [latencyLog, setLatencyLog] = useState<LatencyEntry[]>([]);
  const [autoTestRunning, setAutoTestRunning] = useState(false);
  const [autoTestResults, setAutoTestResults] = useState<string>("");

  const track = TEST_TRACKS[currentTrackIdx];

  // Sync audio position to detector
  const updatePosition = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const posMs = Math.round(audio.currentTime * 1000);
    const durMs = Math.round(audio.duration * 1000) || 0;
    setPosition(posMs);
    setDuration(durMs);

    (mediaDetector as ManualMediaDetector).setNowPlaying({
      title: track.title,
      artist: track.artist,
      durationMs: durMs,
      positionMs: posMs,
      isPlaying: !audio.paused,
      source: track.source,
    });

    animFrameRef.current = requestAnimationFrame(updatePosition);
  }, [mediaDetector, track]);

  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const loadTrack = useCallback(
    (idx: number) => {
      const t = TEST_TRACKS[idx];
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = t.url;
      audioRef.current.load();
      setCurrentTrackIdx(idx);
      setIsPlaying(false);
      setPosition(0);
      cancelAnimationFrame(animFrameRef.current);
    },
    []
  );

  useEffect(() => {
    loadTrack(0);
  }, [loadTrack]);

  const handlePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const t0 = performance.now();
    audio.play().then(() => {
      const latency = performance.now() - t0;
      setIsPlaying(true);
      setLatencyLog((prev) => [
        ...prev,
        { type: "play", timestampMs: Math.round(audio.currentTime * 1000), latencyMs: latency },
      ]);
      animFrameRef.current = requestAnimationFrame(updatePosition);
    });
  }, [updatePosition]);

  const handlePause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const t0 = performance.now();
    audio.pause();
    const latency = performance.now() - t0;
    setIsPlaying(false);
    cancelAnimationFrame(animFrameRef.current);
    setLatencyLog((prev) => [
      ...prev,
      { type: "pause", timestampMs: Math.round(audio.currentTime * 1000), latencyMs: latency },
    ]);
  }, []);

  const handleTag = useCallback(async () => {
    const t0 = performance.now();
    await tagTimestamp(`test-tag-${Date.now()}`);
    const latency = performance.now() - t0;
    setLatencyLog((prev) => [...prev, { type: "tag", timestampMs: position, latencyMs: latency }]);
  }, [tagTimestamp, position]);

  const handleSection = useCallback(async () => {
    const t0 = performance.now();
    await markSectionPoint();
    const latency = performance.now() - t0;
    const type = sectionStart !== null ? "section-end" : "section-start";
    setLatencyLog((prev) => [...prev, { type, timestampMs: position, latencyMs: latency }]);
  }, [markSectionPoint, position, sectionStart]);

  // Automated test: random button presses at random intervals
  const runAutoTest = useCallback(async () => {
    if (!audioRef.current) return;
    setAutoTestRunning(true);
    setAutoTestResults("");
    setLatencyLog([]);

    const audio = audioRef.current;
    audio.currentTime = 0;

    // Start playback
    await audio.play();
    setIsPlaying(true);
    animFrameRef.current = requestAnimationFrame(updatePosition);

    const results: LatencyEntry[] = [];
    const actions = 30; // number of random actions

    for (let i = 0; i < actions; i++) {
      // Random wait 200-1500ms
      await new Promise((r) => setTimeout(r, Math.random() * 1300 + 200));

      if (audio.ended) break;

      const posMs = Math.round(audio.currentTime * 1000);
      const action = Math.random();

      if (action < 0.5) {
        // Tag
        const t0 = performance.now();
        await tagTimestamp(`auto-${i}`);
        results.push({ type: "tag", timestampMs: posMs, latencyMs: performance.now() - t0 });
      } else if (action < 0.7) {
        // Play/pause toggle
        const t0 = performance.now();
        if (audio.paused) {
          await audio.play();
          setIsPlaying(true);
          results.push({ type: "play", timestampMs: posMs, latencyMs: performance.now() - t0 });
        } else {
          audio.pause();
          setIsPlaying(false);
          results.push({ type: "pause", timestampMs: posMs, latencyMs: performance.now() - t0 });
        }
      } else {
        // Section (quick start+end)
        const t0 = performance.now();
        // Ensure we're in section mode
        if (!isTaggingSection) toggleSectionMode();
        await markSectionPoint(); // start
        await new Promise((r) => setTimeout(r, Math.random() * 500 + 200));
        await markSectionPoint(); // end
        results.push({ type: "section-end", timestampMs: posMs, latencyMs: performance.now() - t0 });
      }
    }

    audio.pause();
    setIsPlaying(false);
    cancelAnimationFrame(animFrameRef.current);

    // Compute stats
    const tagLatencies = results.filter((r) => r.type === "tag").map((r) => r.latencyMs);
    const playPauseLatencies = results.filter((r) => r.type === "play" || r.type === "pause").map((r) => r.latencyMs);
    const sectionLatencies = results.filter((r) => r.type === "section-end").map((r) => r.latencyMs);

    const avg = (arr: number[]) => (arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : "N/A");
    const max = (arr: number[]) => (arr.length ? Math.max(...arr).toFixed(2) : "N/A");

    const report = [
      `Automated Test Complete — ${results.length} actions`,
      ``,
      `Tag Latency (${tagLatencies.length} tags):`,
      `  Avg: ${avg(tagLatencies)}ms | Max: ${max(tagLatencies)}ms`,
      ``,
      `Play/Pause Latency (${playPauseLatencies.length} toggles):`,
      `  Avg: ${avg(playPauseLatencies)}ms | Max: ${max(playPauseLatencies)}ms`,
      ``,
      `Section Latency (${sectionLatencies.length} sections):`,
      `  Avg: ${avg(sectionLatencies)}ms | Max: ${max(sectionLatencies)}ms`,
    ].join("\n");

    setAutoTestResults(report);
    setLatencyLog(results);
    setAutoTestRunning(false);
  }, [tagTimestamp, markSectionPoint, toggleSectionMode, isTaggingSection, updatePosition]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Audio Playback Test Harness</h2>
      <p className="text-sm text-gray-500">
        Streams public domain audio, tests play/pause controls, and measures tagging latency.
      </p>

      {/* Track selector */}
      <div className="space-y-2">
        {TEST_TRACKS.map((t, idx) => (
          <button
            key={idx}
            onClick={() => loadTrack(idx)}
            className={cn(
              "w-full rounded-lg border p-3 text-left text-sm transition-colors",
              idx === currentTrackIdx
                ? "border-brand-500 bg-brand-500/10 text-brand-300"
                : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600"
            )}
          >
            <span className="font-medium">{t.title}</span> — {t.artist}
          </button>
        ))}
      </div>

      {/* Player controls */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <div className="mb-3 flex items-center gap-4">
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className="rounded-full bg-brand-600 p-3 text-white hover:bg-brand-500"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <div className="flex-1">
            <p className="font-medium">{track.title}</p>
            <p className="text-sm text-gray-500">
              {formatTimestamp(position)} / {formatTimestamp(duration)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${duration ? (position / duration) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Manual tag/section buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleTag}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-500"
        >
          <Bookmark size={18} /> Tag Now
        </button>
        <button
          onClick={() => {
            if (!isTaggingSection) toggleSectionMode();
            handleSection();
          }}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-white",
            sectionStart !== null ? "bg-red-600 hover:bg-red-500" : "bg-orange-600 hover:bg-orange-500"
          )}
        >
          <Scissors size={18} /> {sectionStart !== null ? "End Section" : "Start Section"}
        </button>
      </div>

      {/* Auto test */}
      <button
        onClick={runAutoTest}
        disabled={autoTestRunning}
        className={cn(
          "w-full rounded-xl border border-green-600 px-4 py-3 font-medium transition-colors",
          autoTestRunning
            ? "animate-pulse bg-green-600/20 text-green-400"
            : "bg-green-600/10 text-green-400 hover:bg-green-600/20"
        )}
      >
        {autoTestRunning ? "Running automated test..." : "Run Automated Latency Test (30 random actions)"}
      </button>

      {/* Results */}
      {autoTestResults && (
        <pre className="rounded-xl border border-gray-700 bg-gray-900 p-4 text-sm text-green-400 whitespace-pre-wrap">
          {autoTestResults}
        </pre>
      )}

      {/* Latency log */}
      {latencyLog.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">Latency Log ({latencyLog.length} events)</h3>
            <button onClick={() => setLatencyLog([])} className="text-gray-600 hover:text-gray-400">
              <RotateCcw size={14} />
            </button>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {latencyLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span
                  className={cn(
                    "w-20 rounded px-1.5 py-0.5 text-center",
                    entry.type === "tag" && "bg-blue-500/20 text-blue-400",
                    entry.type === "play" && "bg-green-500/20 text-green-400",
                    entry.type === "pause" && "bg-yellow-500/20 text-yellow-400",
                    (entry.type === "section-start" || entry.type === "section-end") &&
                      "bg-orange-500/20 text-orange-400"
                  )}
                >
                  {entry.type}
                </span>
                <span className="font-mono text-gray-500">{formatTimestamp(entry.timestampMs)}</span>
                <span
                  className={cn("font-mono", entry.latencyMs < 5 ? "text-green-400" : entry.latencyMs < 20 ? "text-yellow-400" : "text-red-400")}
                >
                  {entry.latencyMs.toFixed(2)}ms
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
