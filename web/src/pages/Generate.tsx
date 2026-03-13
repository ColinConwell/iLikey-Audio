import { useState, useRef, useCallback } from "react";
import { Wand2, Play, Pause, Download, Loader2, Music2, Mic, Piano, AlertCircle } from "lucide-react";
import {
  SunoClient,
  SUNO_STYLE_PRESETS,
  SUNO_MODELS,
  type SunoModel,
  type SunoTrack,
  type SunoTaskStatus,
} from "@ilikey/core";
import { cn, formatTimestamp } from "../lib/utils";
import { useApp } from "../context/AppContext";
import type { ManualMediaDetector } from "@ilikey/core";

const STATUS_LABELS: Record<SunoTaskStatus, string> = {
  pending: "Queued...",
  processing: "Generating...",
  text: "Writing lyrics...",
  first: "First track ready!",
  complete: "Complete!",
  error: "Error",
};

export function Generate() {
  const { mediaDetector } = useApp();

  // API key state
  const [apiKey, setApiKey] = useState(() => {
    if (typeof sessionStorage !== "undefined") {
      return sessionStorage.getItem("ilikey-kie-api-key") ?? "";
    }
    return "";
  });
  const [keyVisible, setKeyVisible] = useState(false);

  // Form state
  const [mode, setMode] = useState<"simple" | "custom">("simple");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Pop");
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [model, setModel] = useState<SunoModel>("V5");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [taskStatus, setTaskStatus] = useState<SunoTaskStatus | null>(null);
  const [tracks, setTracks] = useState<SunoTrack[]>([]);
  const [error, setError] = useState("");

  // Playback
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [playbackPosition, setPlaybackPosition] = useState(0);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    if (typeof sessionStorage !== "undefined") {
      if (key) {
        sessionStorage.setItem("ilikey-kie-api-key", key);
      } else {
        sessionStorage.removeItem("ilikey-kie-api-key");
      }
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!apiKey.trim()) {
      setError("Please enter your Kie AI API key.");
      return;
    }
    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    setGenerating(true);
    setError("");
    setTracks([]);
    setTaskStatus("pending");

    try {
      const client = new SunoClient(apiKey.trim());

      const result = await client.generateAndWait(
        {
          prompt: prompt.trim(),
          customMode: mode === "custom",
          instrumental,
          model,
          style: mode === "custom" ? style : undefined,
          title: mode === "custom" ? title || undefined : undefined,
          lyrics: mode === "custom" && lyrics.trim() ? lyrics.trim() : undefined,
        },
        {
          pollIntervalMs: 4000,
          timeoutMs: 300000,
          onStatus: (status) => {
            setTaskStatus(status.status);
            if (status.tracks.length > 0) {
              setTracks(status.tracks);
            }
          },
        }
      );

      setTracks(result.tracks);
      setTaskStatus("complete");
    } catch (err: any) {
      setError(err.message ?? "Generation failed");
      setTaskStatus("error");
    } finally {
      setGenerating(false);
    }
  }, [apiKey, prompt, mode, style, title, lyrics, instrumental, model]);

  const playTrack = useCallback(
    (track: SunoTrack) => {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.addEventListener("timeupdate", () => {
          setPlaybackPosition(Math.round((audioRef.current?.currentTime ?? 0) * 1000));
        });
        audioRef.current.addEventListener("ended", () => {
          setPlayingTrackId(null);
          setPlaybackPosition(0);
        });
      }

      if (playingTrackId === track.id) {
        // Toggle pause
        if (audioRef.current.paused) {
          audioRef.current.play();
        } else {
          audioRef.current.pause();
        }
        return;
      }

      audioRef.current.src = track.audioUrl;
      audioRef.current.play();
      setPlayingTrackId(track.id);
      setPlaybackPosition(0);

      // Update now-playing detector
      (mediaDetector as ManualMediaDetector).setNowPlaying({
        title: track.title || prompt,
        artist: "AI Generated (Suno)",
        durationMs: track.duration ? track.duration * 1000 : undefined,
        positionMs: 0,
        isPlaying: true,
        source: "manual",
      });
    },
    [playingTrackId, mediaDetector, prompt]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Generate Music</h2>
        <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-400">
          Powered by Suno via Kie AI
        </span>
      </div>

      {/* API Key */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <label className="mb-2 block text-sm font-medium text-gray-400">Kie AI API Key</label>
        <div className="flex gap-2">
          <input
            type={keyVisible ? "text" : "password"}
            value={apiKey}
            onChange={(e) => saveApiKey(e.target.value)}
            placeholder="Enter your Kie AI API key..."
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={() => setKeyVisible(!keyVisible)}
            className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-400 hover:bg-gray-800"
          >
            {keyVisible ? "Hide" : "Show"}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-600">
          Stored in session only — cleared when you close the tab. Get a key at kie.ai
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("simple")}
          className={cn(
            "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
            mode === "simple"
              ? "border-brand-500 bg-brand-500/10 text-brand-400"
              : "border-gray-700 text-gray-400 hover:border-gray-600"
          )}
        >
          Simple Mode
        </button>
        <button
          onClick={() => setMode("custom")}
          className={cn(
            "flex-1 rounded-lg border py-2 text-sm font-medium transition-colors",
            mode === "custom"
              ? "border-brand-500 bg-brand-500/10 text-brand-400"
              : "border-gray-700 text-gray-400 hover:border-gray-600"
          )}
        >
          Custom Mode
        </button>
      </div>

      {/* Prompt */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-400">
          {mode === "simple" ? "Describe the music you want" : "Prompt / Description"}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            mode === "simple"
              ? "A chill lo-fi beat with soft piano and rain sounds..."
              : "Describe the mood, instruments, tempo..."
          }
          rows={3}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none"
        />
      </div>

      {/* Custom mode fields */}
      {mode === "custom" && (
        <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">Song Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Song"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Style */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">Style / Genre</label>
            <div className="flex flex-wrap gap-2">
              {SUNO_STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setStyle(preset.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    style === preset.value
                      ? "border-violet-500 bg-violet-500/20 text-violet-300"
                      : "border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lyrics */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">
              Lyrics (optional — AI generates if empty)
            </label>
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="[Verse 1]&#10;Write your lyrics here...&#10;&#10;[Chorus]&#10;..."
              rows={5}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Options row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Model */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Model:</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as SunoModel)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-gray-300"
          >
            {SUNO_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Instrumental toggle */}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={instrumental}
            onChange={(e) => setInstrumental(e.target.checked)}
            className="accent-violet-500"
          />
          {instrumental ? (
            <span className="flex items-center gap-1">
              <Piano size={14} /> Instrumental only
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Mic size={14} /> With vocals
            </span>
          )}
        </label>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={generating || !prompt.trim()}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-lg font-medium transition-all",
          generating
            ? "animate-pulse bg-violet-600/50 text-violet-300"
            : "bg-violet-600 text-white hover:bg-violet-500",
          (!prompt.trim() || !apiKey.trim()) && !generating && "opacity-40 cursor-not-allowed"
        )}
      >
        {generating ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            {taskStatus ? STATUS_LABELS[taskStatus] : "Starting..."}
          </>
        ) : (
          <>
            <Wand2 size={20} />
            Generate Music
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Results */}
      {tracks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400">Generated Tracks</h3>
          {tracks.map((track) => (
            <div
              key={track.id}
              className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4"
            >
              {track.imageUrl ? (
                <img src={track.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-violet-500/10">
                  <Music2 size={24} className="text-violet-400" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{track.title || prompt.slice(0, 50)}</p>
                <p className="text-sm text-gray-500">
                  {track.style ?? style} · {track.model ?? model}
                  {track.duration ? ` · ${formatTimestamp(track.duration * 1000)}` : ""}
                </p>
                {track.lyrics && (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-600">{track.lyrics.slice(0, 120)}...</p>
                )}
              </div>

              <div className="flex gap-2">
                {track.audioUrl && (
                  <>
                    <button
                      onClick={() => playTrack(track)}
                      className="rounded-lg bg-violet-600 p-2 text-white hover:bg-violet-500"
                    >
                      {playingTrackId === track.id ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <a
                      href={track.audioUrl}
                      download
                      className="rounded-lg bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                    >
                      <Download size={16} />
                    </a>
                  </>
                )}
              </div>
            </div>
          ))}

          {playingTrackId && (
            <div className="text-center text-xs text-gray-500">
              Playback: {formatTimestamp(playbackPosition)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
