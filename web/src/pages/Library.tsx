import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Trash2, Music2 } from "lucide-react";
import { useApp } from "../context/AppContext";

export function Library() {
  const { songs, deleteSong } = useApp();
  const [search, setSearch] = useState("");

  const filtered = songs.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.artist.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Library</h2>
        <span className="text-sm text-gray-500">{songs.length} songs</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search songs..."
          className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-600 focus:border-brand-500 focus:outline-none"
        />
      </div>

      {/* Song List */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-500">
          <Music2 size={48} className="mx-auto mb-3 text-gray-700" />
          <p>{songs.length === 0 ? "No songs tagged yet" : "No matches found"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((song) => (
            <div
              key={song.id}
              className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-gray-700"
            >
              {song.artworkUrl ? (
                <img
                  src={song.artworkUrl}
                  alt=""
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-800">
                  <Music2 size={20} className="text-gray-600" />
                </div>
              )}
              <Link to={`/song/${song.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-200">{song.title}</p>
                <p className="truncate text-sm text-gray-500">{song.artist}</p>
              </Link>
              <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs capitalize text-gray-500">
                {song.source}
              </span>
              <button
                onClick={() => deleteSong(song.id)}
                className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
