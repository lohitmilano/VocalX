import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/70 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-300/70" />
            <div>
              <div className="text-sm font-semibold leading-none">VocalX</div>
              <div className="text-xs text-slate-400">Promptable audio + video editor</div>
            </div>
          </div>

          <nav className="hidden items-center gap-3 sm:flex">
            <Link className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5" href="/studio">
              Studio
            </Link>
            <Link className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5" href="/history">
              History
            </Link>
            <Link className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5" href="/local">
              Local Test
            </Link>
            <Link className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5" href="/login">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              SAM‑Audio + PE‑AV + SAM3
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Prompt, isolate, edit — across audio and video.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">
              Build “prompt nodes” with text, time spans, and visual selections. VocalX runs the right model chain to
              extract targets, suppress noise, and sync edits back to your video.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/studio"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-500 px-5 text-sm font-semibold text-black hover:bg-brand-600"
              >
                Open Studio
              </Link>
              <Link
                href="/local"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-5 text-sm font-semibold text-slate-100 hover:bg-white/5"
              >
                Run local worker test
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="text-sm font-semibold">Audio Studio</div>
                <div className="mt-1 text-xs text-slate-400">Text + span prompts, multi-lane waveform</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="text-sm font-semibold">Video Studio</div>
                <div className="mt-1 text-xs text-slate-400">Prompt + propagate masks across frames (SAM3)</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                <div className="text-sm font-semibold">Multimodal</div>
                <div className="mt-1 text-xs text-slate-400">Combine text + time + object selections</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/30 p-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-xs font-semibold text-slate-300">Example prompt node</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">T: “host speech”</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">⏱ 00:05–00:45</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">👁 Person‑1</span>
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
                  Mode: isolate
                </span>
              </div>
              <div className="mt-4 h-28 rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900" />
              <div className="mt-3 text-xs text-slate-400">
                First preview 2–3 seconds → then “Apply to entire file”.
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-sm font-semibold">Templates</div>
                <div className="mt-2 text-xs text-slate-400">
                  Podcast cleaner • Music stems • Interview sync • Custom
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-sm font-semibold">Local dev</div>
                <div className="mt-2 text-xs text-slate-400">
                  Use <span className="text-slate-200">/local</span> to call your worker directly.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
