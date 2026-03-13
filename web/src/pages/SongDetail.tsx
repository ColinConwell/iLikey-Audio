import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Bookmark, Scissors, Trash2 } from "lucide-react";
import { type Song, SECTION_COLORS, type SectionType } from "@ilikey/core";
import { useApp } from "../context/AppContext";
import { formatTimestamp, cn } from "../lib/utils";

export function SongDetail() {
  const { id } = useParams<{ id: string }>();
  const { loadSongDetails, currentSongTags, currentSongSections, deleteTag, deleteSection } =
    useApp();
  const [song, setSong] = useState<Song | null>(null);

  useEffect(() => {
    if (id) {
      loadSongDetails(id).then(setSong);
    }
  }, [id, loadSongDetails]);

  if (!song) {
    return (
      <div className="py-16 text-center text-gray-500">
        <p>Song not found</p>
        <Link to="/library" className="mt-2 inline-block text-brand-400 hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          to="/library"
          className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300"
        >
          <ArrowLeft size={14} /> Library
        </Link>
        <h2 className="text-xl font-semibold">{song.title}</h2>
        <p className="text-gray-400">{song.artist}</p>
        {song.album && <p className="text-sm text-gray-500">{song.album}</p>}
      </div>

      {/* Timeline visualization (simple bar) */}
      {song.durationMs && (
        <div className="relative h-12 rounded-lg bg-gray-800">
          {/* Sections as colored ranges */}
          {currentSongSections.map((section) => {
            const left = (section.startMs / song.durationMs!) * 100;
            const width = ((section.endMs - section.startMs) / song.durationMs!) * 100;
            return (
              <div
                key={section.id}
                className="absolute top-0 h-full rounded opacity-30"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: SECTION_COLORS[section.type as SectionType] ?? "#8b5cf6",
                }}
                title={`${section.type}: ${formatTimestamp(section.startMs)} - ${formatTimestamp(section.endMs)}`}
              />
            );
          })}
          {/* Tags as markers */}
          {currentSongTags.map((tag) => {
            const left = (tag.timestampMs / song.durationMs!) * 100;
            return (
              <div
                key={tag.id}
                className="absolute top-0 h-full w-0.5 bg-blue-400"
                style={{ left: `${left}%` }}
                title={`${formatTimestamp(tag.timestampMs)}${tag.label ? `: ${tag.label}` : ""}`}
              />
            );
          })}
        </div>
      )}

      {/* Tags list */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-400">
          <Bookmark size={14} /> Tags ({currentSongTags.length})
        </h3>
        {currentSongTags.length === 0 ? (
          <p className="text-sm text-gray-600">No tags yet</p>
        ) : (
          <div className="space-y-1">
            {currentSongTags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 px-4 py-2"
              >
                <span className="font-mono text-sm text-brand-400">
                  {formatTimestamp(tag.timestampMs)}
                </span>
                <span className="flex-1 text-sm text-gray-300">
                  {tag.label || "Unmarked"}
                </span>
                <button
                  onClick={async () => {
                    await deleteTag(tag.id);
                    if (id) loadSongDetails(id);
                  }}
                  className="text-gray-600 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sections list */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-400">
          <Scissors size={14} /> Sections ({currentSongSections.length})
        </h3>
        {currentSongSections.length === 0 ? (
          <p className="text-sm text-gray-600">No sections yet</p>
        ) : (
          <div className="space-y-1">
            {currentSongSections.map((section) => (
              <div
                key={section.id}
                className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 px-4 py-2"
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: SECTION_COLORS[section.type as SectionType] ?? "#8b5cf6",
                  }}
                />
                <span className="rounded bg-gray-800 px-2 py-0.5 text-xs capitalize">
                  {section.type}
                </span>
                <span className="font-mono text-sm text-gray-400">
                  {formatTimestamp(section.startMs)} - {formatTimestamp(section.endMs)}
                </span>
                <span className="flex-1 text-sm text-gray-300">{section.label}</span>
                <button
                  onClick={async () => {
                    await deleteSection(section.id);
                    if (id) loadSongDetails(id);
                  }}
                  className="text-gray-600 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
