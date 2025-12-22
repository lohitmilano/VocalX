"use client";

import { useMemo, useState } from "react";

type StudioMode = "audio" | "video" | "multimodal";
type PromptType = "text" | "span" | "visual";
type EditMode = "isolate" | "remove" | "attenuate";

export type Prompt = {
  id: string;
  type: PromptType;
  text?: string;
  span?: { startSec: number; endSec: number };
  visualRef?: { frameIndex: number; instanceId?: string };
  mode: EditMode;
  target: "audio" | "video" | "both";
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
}

function uuid(): string {
  return crypto.randomUUID();
}

export function StudioClient() {
  const [mode, setMode] = useState<StudioMode>("audio");
  const [file, setFile] = useState<File | null>(null);
  const [promptText, setPromptText] = useState("A man speaking");
  const [editMode, setEditMode] = useState<EditMode>("isolate");
  const [spanStart, setSpanStart] = useState(0);
  const [spanEnd, setSpanEnd] = useState(15);
  const [useSpan, setUseSpan] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Prompt[]>([]);

  const spanLabel = useMemo(() => `${formatTime(spanStart)} – ${formatTime(spanEnd)}`, [spanStart, spanEnd]);

  async function run(which: "target" | "residual") {
    if (!file) {
      setError("Please upload an audio/video file first.");
      return;
    }
    if (!promptText.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    setIsRunning(true);
    setError(null);
    try {
      const prompt: Prompt = {
        id: uuid(),
        type: useSpan ? "span" : "text",
        text: promptText.trim(),
        span: useSpan ? { startSec: spanStart, endSec: spanEnd } : undefined,
        mode: editMode,
        target: "audio",
      };

      // For now we only implement "isolate" with the local worker endpoint.
      // Remove/attenuate will be applied later as post-processing in the webapp mixer.
      const anchors = useSpan ? [["+", spanStart, spanEnd]] : null;

      const fd = new FormData();
      fd.set("file", file, file.name);
      fd.set("description", prompt.text ?? "");
      fd.set("anchorsJson", anchors ? JSON.stringify(anchors) : "");
      fd.set("which", which);

      const res = await fetch("/api/local/separate", { method: "POST", body: fd });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const details = json?.details;
        if (typeof details === "string" && details.trim()) throw new Error(details);
        if (details && typeof details === "object") throw new Error(JSON.stringify(details));
        throw new Error(json?.error || `Request failed: ${res.status}`);
      }

      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") || "";
      const match = /filename="([^"]+)"/.exec(cd);
      const filename = match?.[1] || `${which}.wav`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setHistory((h) => [prompt, ...h].slice(0, 20));
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-800/70 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-300/70" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">VocalX Studio</div>
              <div className="text-xs text-slate-400">Promptable editor</div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-1">
            {(
              [
                ["audio", "Audio"],
                ["video", "Video"],
                ["multimodal", "Multimodal"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={[
                  "h-9 rounded-xl px-3 text-sm font-semibold transition-colors",
                  mode === key ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-300 md:block">
              GPU: local worker
            </div>
            <button
              disabled={isRunning || mode !== "audio"}
              onClick={() => run("target")}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-500 px-4 text-sm font-semibold text-black disabled:opacity-50"
              title={mode !== "audio" ? "Run is wired for Audio mode first" : undefined}
            >
              {isRunning ? "Running…" : "Run"}
            </button>
          </div>
        </div>
      </header>

      {/* 3-column body */}
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[320px_1fr_360px]">
        {/* Left: sessions & presets */}
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Sessions</div>
            <button className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10">
              New
            </button>
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-300">Presets</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Clean dialog", "Vocals", "Drums", "Crowd noise", "Ambience"].map((p) => (
                <button
                  key={p}
                  className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs text-slate-200 hover:bg-white/5"
                  onClick={() => {
                    if (p === "Clean dialog") setPromptText("speech");
                    if (p === "Vocals") setPromptText("lead vocal");
                    if (p === "Drums") setPromptText("drums");
                    if (p === "Crowd noise") setPromptText("crowd noise");
                    if (p === "Ambience") setPromptText("room tone");
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold text-slate-300">Prompt history</div>
            <div className="mt-2 space-y-2">
              {history.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
                  Run a prompt to see nodes appear here.
                </div>
              ) : null}
              {history.map((p) => (
                <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-200">
                      {p.type === "span" ? "⏱ Span" : "T Text"} • {p.mode}
                    </div>
                    <button className="text-xs text-slate-400 hover:text-slate-200" title="Toggle later">
                      ⟳
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-slate-300">{p.text}</div>
                  {p.span ? <div className="mt-1 text-[11px] text-slate-500">{formatTime(p.span.startSec)}–{formatTime(p.span.endSec)}</div> : null}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Center: canvas */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">
                {mode === "audio" ? "Waveform" : mode === "video" ? "Video canvas" : "Multimodal canvas"}
              </div>
              <div className="text-xs text-slate-400">
                {mode === "audio"
                  ? "Upload a file, select a span, then prompt."
                  : mode === "video"
                    ? "SAM3 prompting + propagation (next)."
                    : "Combine text + span + visual chips (next)."}
              </div>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 hover:bg-white/5">
              <input
                className="hidden"
                type="file"
                accept="audio/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <span className="rounded-lg bg-white/10 px-2 py-1 text-[11px]">Upload</span>
              <span className="max-w-[220px] truncate text-slate-300">{file ? file.name : "audio/video file"}</span>
            </label>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
            {mode === "audio" ? (
              <>
                <div className="text-xs font-semibold text-slate-300">Lanes</div>
                <div className="mt-3 space-y-3">
                  {["Original mix", "Target (current)", "Residual"].map((lane) => (
                    <div key={lane} className="rounded-xl border border-slate-800 bg-slate-900/30 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-200">{lane}</div>
                        <div className="text-[11px] text-slate-500">{useSpan ? `Selected: ${spanLabel}` : "No span selected"}</div>
                      </div>
                      <div className="mt-2 h-10 rounded-lg bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-[340px] items-center justify-center text-sm text-slate-400">
                {mode === "video"
                  ? "Video canvas + mask overlay will appear here."
                  : "Multimodal prompt chips + results tracks will appear here."}
              </div>
            )}
          </div>
        </section>

        {/* Right: prompt + outputs */}
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Prompt</div>
            <div className="text-xs text-slate-400">{mode.toUpperCase()}</div>
          </div>

          {mode === "audio" ? (
            <>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-slate-300">Text</div>
                  <input
                    className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder='e.g. "lead vocal", "dog barking", "car horn"'
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Vocals", "Speech", "Drums", "Crowd", "Ambience"].map((chip) => (
                      <button
                        key={chip}
                        className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200 hover:bg-white/15"
                        onClick={() => {
                          if (chip === "Vocals") setPromptText("lead vocal");
                          if (chip === "Speech") setPromptText("speech");
                          if (chip === "Drums") setPromptText("drums");
                          if (chip === "Crowd") setPromptText("crowd noise");
                          if (chip === "Ambience") setPromptText("room tone");
                        }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-300">Span prompt</div>
                    <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={useSpan}
                        onChange={(e) => setUseSpan(e.target.checked)}
                        className="h-4 w-4 accent-brand-500"
                      />
                      Use span
                    </label>
                  </div>
                  <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="text-[11px] text-slate-400">Selected: {spanLabel}</div>
                    <div className="mt-2 space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Start</span>
                          <span>{formatTime(spanStart)}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(spanEnd, 1)}
                          step={0.5}
                          value={spanStart}
                          onChange={(e) => setSpanStart(Math.min(Number(e.target.value), spanEnd))}
                          className="mt-1 w-full accent-brand-500"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>End</span>
                          <span>{formatTime(spanEnd)}</span>
                        </div>
                        <input
                          type="range"
                          min={spanStart}
                          max={180}
                          step={0.5}
                          value={spanEnd}
                          onChange={(e) => setSpanEnd(Math.max(Number(e.target.value), spanStart))}
                          className="mt-1 w-full accent-brand-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-300">Edit mode</div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(["isolate", "remove", "attenuate"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setEditMode(m)}
                        className={[
                          "rounded-xl border px-3 py-2 text-xs font-semibold",
                          editMode === m
                            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                            : "border-slate-800 bg-slate-950 text-slate-200 hover:bg-white/5",
                        ].join(" ")}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    Note: only <span className="text-slate-300">isolate</span> is executed in the worker right now;{" "}
                    remove/attenuate will be applied as mix operations next.
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
                  <div className="text-xs font-semibold text-slate-300">Outputs</div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      disabled={isRunning}
                      onClick={() => run("target")}
                      className="rounded-xl bg-brand-500 px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
                    >
                      Download target.wav
                    </button>
                    <button
                      disabled={isRunning}
                      onClick={() => run("residual")}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/5 disabled:opacity-50"
                    >
                      Download residual.wav
                    </button>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              {mode === "video" ? (
                <>
                  <div className="font-semibold">Video Studio (next)</div>
                  <div className="mt-2 text-slate-400">
                    Prompt a frame (text/box/point) → generate mask → propagate across the clip with SAM3.
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold">Multimodal Studio (next)</div>
                  <div className="mt-2 text-slate-400">
                    Combine text + span + visual chips into a single prompt node, then generate audio + mask tracks.
                  </div>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}


