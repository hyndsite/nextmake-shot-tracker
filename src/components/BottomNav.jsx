import React from "react"
import {
  House,
  ClipboardList,        // Practice
  Gamepad2,             // Game
  LineChart,            // Performance
  Target,               // Goals
  Map,                  // Heatmap
  UserRound             // Account
} from "lucide-react"

const TABS = [
  { key: "dashboard",  label: "Home",        Icon: House },
  { key: "practice",   label: "Practice",    Icon: ClipboardList },
  { key: "game",       label: "Game",        Icon: Gamepad2 },
  { key: "progress",   label: "Perf",        Icon: LineChart },
  { key: "goals",      label: "Goals",       Icon: Target },
  { key: "heatmap",    label: "Heatmap",     Icon: Map },
  { key: "account",    label: "Account",     Icon: UserRound },
]

/**
 * Bottom navigation bar for primary app sections.
 *
 * Props:
 * - activeTab: string  (one of TABS keys)
 * - onChange:  (key:string)=>void
 */
export default function BottomNav({ activeTab, onChange }) {
  return (
    <nav
        className="bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white
                  shadow-[0_-4px_12px_rgba(15,23,42,0.06)]
                  pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+6px)]"
        role="navigation"
        aria-label="Primary"
      >
      <div className="mx-auto max-w-screen-sm px-3">
        <ul className="grid grid-cols-7">
          {TABS.map(({ key, label, Icon }) => {
            const active = activeTab === key
            return (
              <li key={key} className="flex">
                <button
                    type="button"
                    onClick={() => onChange?.(key)}
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                    className="w-full py-2 bg-transparent border-0 shadow-none
                              focus:outline-none focus-visible:outline-none rounded-lg"
                  >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Icon
                      size={24}
                      strokeWidth={2.25}
                      className={active ? "text-sky-600" : "text-slate-500"}
                    />
                    <span
                      className={`text-[13px] ${
                        active ? "text-sky-700 font-semibold" : "text-slate-500"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
