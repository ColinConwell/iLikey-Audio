/**
 * Kie AI / Suno API Client
 *
 * Wraps the Kie.ai REST API for Suno music generation.
 * All generation is asynchronous — poll for results or use callbacks.
 *
 * API Docs: https://docs.kie.ai/suno-api/quickstart
 * Base URL: https://api.kie.ai/api/v1
 */

const KIE_API_BASE = "https://api.kie.ai/api/v1";

// ── Types ──

export type SunoModel = "V3.5" | "V4" | "V4.5" | "V4.5 Plus" | "V5";

export interface SunoGenerateRequest {
  /** Text prompt describing the music to generate */
  prompt: string;
  /** Use custom mode (requires style + title) */
  customMode?: boolean;
  /** Generate instrumental only (no vocals) */
  instrumental?: boolean;
  /** Suno model version */
  model?: SunoModel;
  /** Music style/genre (required in custom mode) */
  style?: string;
  /** Song title (required in custom mode) */
  title?: string;
  /** Lyrics (custom mode) — if omitted, AI generates lyrics */
  lyrics?: string;
  /** Webhook URL for async results */
  callBackUrl?: string;
}

export interface SunoExtendRequest {
  /** Task ID of the original generation */
  taskId: string;
  /** Which track to extend (from the original generation) */
  audioId: string;
  /** Continue from timestamp (seconds) */
  continueAt?: number;
  /** Additional prompt for the extension */
  prompt?: string;
  model?: SunoModel;
  callBackUrl?: string;
}

export interface SunoLyricsRequest {
  prompt: string;
  callBackUrl?: string;
}

export interface SunoTrack {
  id: string;
  title: string;
  audioUrl: string;
  imageUrl?: string;
  lyrics?: string;
  duration?: number;
  model?: string;
  style?: string;
}

export type SunoTaskStatus = "pending" | "processing" | "text" | "first" | "complete" | "error";

export interface SunoTaskResult {
  taskId: string;
  status: SunoTaskStatus;
  tracks: SunoTrack[];
  lyrics?: string;
  errorMessage?: string;
}

export interface SunoLyricsResult {
  taskId: string;
  status: string;
  lyrics?: string;
}

// ── Client ──

export class SunoClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = KIE_API_BASE) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new SunoApiError(`API error ${res.status}: ${body}`, res.status);
    }

    return res.json();
  }

  /**
   * Generate music from a prompt.
   * Returns a task ID — poll with getTaskStatus() or use callBackUrl.
   */
  async generate(req: SunoGenerateRequest): Promise<{ taskId: string }> {
    return this.request("/generate", {
      method: "POST",
      body: JSON.stringify({
        prompt: req.prompt,
        customMode: req.customMode ?? false,
        instrumental: req.instrumental ?? false,
        model: req.model ?? "V5",
        style: req.style,
        title: req.title,
        lyrics: req.lyrics,
        callBackUrl: req.callBackUrl,
      }),
    });
  }

  /**
   * Check the status of a generation task.
   */
  async getTaskStatus(taskId: string): Promise<SunoTaskResult> {
    const raw = await this.request<any>(`/generate/record-info?taskId=${encodeURIComponent(taskId)}`);

    return {
      taskId: raw.taskId ?? taskId,
      status: raw.status ?? "pending",
      tracks: (raw.data ?? []).map((t: any) => ({
        id: t.id ?? "",
        title: t.title ?? "",
        audioUrl: t.audio_url ?? t.audioUrl ?? "",
        imageUrl: t.image_url ?? t.imageUrl,
        lyrics: t.lyric ?? t.lyrics,
        duration: t.duration,
        model: t.model_name ?? t.model,
        style: t.style ?? t.tags,
      })),
      lyrics: raw.lyrics,
      errorMessage: raw.errorMessage ?? raw.error,
    };
  }

  /**
   * Generate music and poll until complete.
   * Returns the final result with track URLs.
   */
  async generateAndWait(
    req: SunoGenerateRequest,
    options?: { pollIntervalMs?: number; timeoutMs?: number; onStatus?: (status: SunoTaskResult) => void }
  ): Promise<SunoTaskResult> {
    const { taskId } = await this.generate(req);
    const pollInterval = options?.pollIntervalMs ?? 5000;
    const timeout = options?.timeoutMs ?? 300000; // 5 min default
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      await new Promise((r) => setTimeout(r, pollInterval));

      const result = await this.getTaskStatus(taskId);
      options?.onStatus?.(result);

      if (result.status === "complete") return result;
      if (result.status === "error") throw new SunoApiError(result.errorMessage ?? "Generation failed", 500);
    }

    throw new SunoApiError("Generation timed out", 408);
  }

  /**
   * Extend an existing track.
   */
  async extend(req: SunoExtendRequest): Promise<{ taskId: string }> {
    return this.request("/generate/extend", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  /**
   * Generate lyrics only (no audio).
   */
  async generateLyrics(req: SunoLyricsRequest): Promise<{ taskId: string }> {
    return this.request("/generate/lyrics", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  /**
   * Get lyrics generation result.
   */
  async getLyricsStatus(taskId: string): Promise<SunoLyricsResult> {
    return this.request(`/generate/lyrics/record-info?taskId=${encodeURIComponent(taskId)}`);
  }

  /**
   * Convert a track to WAV format.
   */
  async convertToWav(audioUrl: string): Promise<{ taskId: string }> {
    return this.request("/wav/generate", {
      method: "POST",
      body: JSON.stringify({ audioUrl }),
    });
  }
}

// ── Errors ──

export class SunoApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "SunoApiError";
  }
}

// ── Preset styles for the UI ──

export const SUNO_STYLE_PRESETS = [
  { label: "Pop", value: "Pop" },
  { label: "Rock", value: "Rock" },
  { label: "Hip Hop", value: "Hip Hop" },
  { label: "R&B", value: "R&B" },
  { label: "Jazz", value: "Jazz" },
  { label: "Classical", value: "Classical" },
  { label: "Electronic", value: "Electronic" },
  { label: "EDM", value: "EDM" },
  { label: "Lo-fi", value: "Lo-fi" },
  { label: "Ambient", value: "Ambient" },
  { label: "Country", value: "Country" },
  { label: "Folk", value: "Folk" },
  { label: "Metal", value: "Metal" },
  { label: "Punk", value: "Punk" },
  { label: "Reggae", value: "Reggae" },
  { label: "Soul", value: "Soul" },
  { label: "Funk", value: "Funk" },
  { label: "Blues", value: "Blues" },
  { label: "Latin", value: "Latin" },
  { label: "Synthwave", value: "Synthwave" },
  { label: "Cinematic", value: "Cinematic" },
] as const;

export const SUNO_MODELS: { label: string; value: SunoModel }[] = [
  { label: "V5 (Latest)", value: "V5" },
  { label: "V4.5 Plus", value: "V4.5 Plus" },
  { label: "V4.5", value: "V4.5" },
  { label: "V4", value: "V4" },
  { label: "V3.5", value: "V3.5" },
];
