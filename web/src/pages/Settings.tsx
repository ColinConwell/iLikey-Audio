import { useState } from "react";
import { Download, Upload, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";

export function Settings() {
  const { storage, refreshLibrary } = useApp();
  const [status, setStatus] = useState("");

  const handleExport = async () => {
    const data = await storage.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ilikey-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Exported successfully!");
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      await storage.importAll(data);
      await refreshLibrary();
      setStatus(`Imported ${data.songs?.length ?? 0} songs`);
    };
    input.click();
  };

  const handleClear = async () => {
    if (!confirm("Delete all data? This cannot be undone.")) return;
    await storage.clear();
    await refreshLibrary();
    setStatus("All data cleared.");
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold">Settings</h2>

      {/* Backend selector */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-3 font-medium">Storage Backend</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-3 rounded-lg border border-brand-500 bg-brand-500/10 p-3">
            <input type="radio" name="backend" value="local" defaultChecked className="accent-brand-500" />
            <div>
              <p className="text-sm font-medium">Local (IndexedDB)</p>
              <p className="text-xs text-gray-500">Data stays on this device</p>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-gray-700 p-3 opacity-50">
            <input type="radio" name="backend" value="firebase" disabled />
            <div>
              <p className="text-sm font-medium">Firebase</p>
              <p className="text-xs text-gray-500">Coming soon — cloud sync with real-time database</p>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-gray-700 p-3 opacity-50">
            <input type="radio" name="backend" value="fastapi" disabled />
            <div>
              <p className="text-sm font-medium">FastAPI Server</p>
              <p className="text-xs text-gray-500">Coming soon — self-hosted backend</p>
            </div>
          </label>
        </div>
      </div>

      {/* Streaming Connections */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-3 font-medium">Connected Services</h3>
        <div className="space-y-2">
          {["Spotify", "Tidal", "Apple Music"].map((service) => (
            <div key={service} className="flex items-center justify-between rounded-lg border border-gray-700 p-3">
              <span className="text-sm">{service}</span>
              <button
                disabled
                className="rounded-lg bg-gray-800 px-3 py-1 text-xs text-gray-500"
              >
                Connect (Coming Soon)
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Data Management */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-3 font-medium">Data Management</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
          >
            <Download size={16} /> Export JSON
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm hover:bg-gray-700"
          >
            <Upload size={16} /> Import JSON
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
          >
            <Trash2 size={16} /> Clear All Data
          </button>
        </div>
        {status && <p className="mt-3 text-sm text-green-400">{status}</p>}
      </div>
    </div>
  );
}
