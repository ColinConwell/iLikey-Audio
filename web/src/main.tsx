import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { Layout } from "./components/Layout";
import { NowPlaying } from "./pages/NowPlaying";
import { Library } from "./pages/Library";
import { SongDetail } from "./pages/SongDetail";
import { Settings } from "./pages/Settings";
import { AudioTest } from "./pages/AudioTest";
import { Generate } from "./pages/Generate";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<NowPlaying />} />
            <Route path="/library" element={<Library />} />
            <Route path="/song/:id" element={<SongDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/test" element={<AudioTest />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
