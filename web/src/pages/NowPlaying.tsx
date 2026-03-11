import { useState } from "react";
import { Bookmark, Scissors, Music2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatTimestamp, cn } from "../lib/utils";
import type { ManualMediaDetector } from "@ilikey/core";

export function NowPlaying() {
  const {
    nowPlaying,
    isTaggingSection,
    sectionStart,
    tagTimestamp,
    toggleSectionMode,
    markSectionPoint,
    mediaDetector,
  } = useApp();

  const [manualTitle, setManualTitle] = useState("");
  const [manualArtist, setManualArtist] = useState("");
  const [tagLabel, setTagLabel] = useState("");

  const handleManualSet = () => {
    if (!manualTitle.trim()) return;
    (mediaDetector as ManualMediaDetector).setNowPlaying({
      title: manualTitle.trim(),
      artist: manualArtist.trim() || "Unknown Artist",
      isPlaying: true,
      source: "manual",
      positionMs: 0,
    });
    setManualTitle("");
    setManualArtist("");
  };

  const handleTag = async () => {
    if (isTaggingSection) {
      await markSectionPoint();
    } else {
      await tagTimestamp(tagLabel || undefined);
      setTagLabel("");
    }
  };

  return (
    <div className="space-y-8">
      {/* Now Playing Card */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        {nowPlaying ? (
          <div className="flex items-center gap-5">
            {nowPlaying.artworkUrl ? (
              <img
                src={nowPlaying.artworkUrl}
                alt="Album art"
                className="h-24 w-24 rounded-xl object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-gray-800">
                <Music2 size={32} className="text-gray-600" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-semibold">{nowPlaying.title}</h2>
              <p className="truncate text-gray-400">{nowPlaying.artist}</p>
              {nowPlaying.album && (
                <p className="truncate text-sm text-gray-500">{nowPlaying.album}</p>
              )}
              <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                {nowPlaying.positionMs !== undefined && (
                  <span>{formatTimestamp(nowPlaying.positionMs)}</span>
                )}
                {nowPlaying.durationMs && (
                  <span>/ {formatTimestamp(nowPlaying.durationMs)}</span>
                )}
                <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs capitalize">
                  {nowPlaying.source}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <Music2 size={48} className="mx-auto mb-3 text-gray-700" />
            <p>No track detected</p>
            <p className="text-sm">Connect a streaming service or enter a song manually</p>
          </div>
        )}
      </div>

      {/* Tagging Controls */}
      <div className="space-y-4">
        <div className="flex gap-3">
          {/* Tag / Section button */}
          <button
            onClick={handleTag}
            disabled={!nowPlaying}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-4 text-lg font-medium transition-all",
              isTaggingSection
                ? sectionStart !== null
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-orange-600 hover:bg-orange-500 text-white"
                : "bg-brand-600 hover:bg-brand-500 text-white",
              !nowPlaying && "opacity-40 cursor-not-allowed"
            )}
          >
            {isTaggingSection ? (
              <>
                <Scissors size={20} />
                {sectionStart !== null
                  ? `End Section (from ${formatTimestamp(sectionStart)})`
                  : "Mark Section Start"}
              </>
            ) : (
              <>
                <Bookmark size={20} />
                Tag This Moment
              </>
            )}
          </button>

          {/* Toggle section mode */}
          <button
            onClick={toggleSectionMode}
            className={cn(
              "rounded-xl border px-4 py-4 transition-colors",
              isTaggingSection
                ? "border-orange-500 bg-orange-500/10 text-orange-400"
                : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600"
            )}
            title={isTaggingSection ? "Cancel section mode" : "Switch to section mode"}
          >
            <Scissors size={20} />
          </button>
        </div>

        {/* Tag label input (point mode only) */}
        {!isTaggingSection && (
          <input
            type="text"
            value={tagLabel}
            onChange={(e) => setTagLabel(e.target.value)}
            placeholder="Optional label for tag..."
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleTag()}
          />
        )}
      </div>

      {/* Manual Entry */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-3 text-sm font-medium text-gray-400">Manual Entry</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            placeholder="Song title"
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none"
          />
          <input
            type="text"
            value={manualArtist}
            onChange={(e) => setManualArtist(e.target.value)}
            placeholder="Artist"
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={handleManualSet}
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-600"
          >
            Set
          </button>
        </div>
      </div>
    </div>
  );
}
