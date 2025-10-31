// src/screens/ModeGate.jsx
import { Gamepad2, Brain } from "lucide-react"

export default function ModeGate({ onSelect }) {
  return (
    <div className="min-h-dvh bg-white">
      {/* Page header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-screen-sm mx-auto px-4 py-3">
          <h2 className="screen-title">Select Mode</h2>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-screen-sm mx-auto p-4 space-y-6 pb-24">
        {/* Game Mode card */}
        <section className="card">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl">
              <Gamepad2 className="h-10 w-10 text-sky-700" strokeWidth={2.5} />
            </div>

            <h2 className="text-xl font-semibold text-slate-900">Game Mode</h2>
            <p className="mt-1 text-sm text-slate-600">
              Challenge yourself with competitive gameplay and leaderboard rankings.
            </p>

            <button
              type="button"
              onClick={() => onSelect?.("game")}
              className="btn-primary w-full mt-5"
              aria-label="Start Game Mode"
            >
              Start Mode
            </button>
          </div>
        </section>

        {/* Practice Mode card */}
        <section className="card">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl">
              <Brain className="h-10 w-10 text-sky-700" strokeWidth={2.5} />
            </div>

            <h2 className="text-xl font-semibold text-slate-900">Practice Mode</h2>
            <p className="mt-1 text-sm text-slate-600">
              Refine your skills in a no-pressure environment with customizable drills.
            </p>

            <button
              type="button"
              onClick={() => onSelect?.("practice")}
              className="btn-primary w-full mt-5"
              aria-label="Start Practice Mode"
            >
              Start Mode
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
