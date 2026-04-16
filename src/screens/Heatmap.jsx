// src/screens/Heatmap.jsx
import React from "react"
import { ArrowLeft } from "lucide-react"
import ActiveAthleteSwitcher from "../components/ActiveAthleteSwitcher"
import HeatmapCourt from "../components/Heatmap/HeatmapCourt"
import HeatmapFilters from "../components/Heatmap/HeatmapFilters"
import { useHeatmapData } from "../hooks/useHeatmapData"

// ---------- main component ----------

export default function Heatmap({ navigate }) {
  const {
    mode,
    setMode,
    source,
    setSource,
    shotType,
    setShotType,
    contested,
    setContested,
    rangeId,
    setRangeId,
    athletes,
    activeAthleteId,
    handleSelectAthlete,
    zones,
    loading,
    handleImgLoad,
    anchorMap,
    totalAttempts,
  } = useHeatmapData()

  return (
    <div className="min-h-dvh bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-screen-sm mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate?.("home")}
            className="btn-back flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex flex-col items-center">
            <h2 className="text-sm font-semibold text-slate-900">Heatmap</h2>
            <span className="text-[11px] text-slate-500">
              Tap a zone to see details.
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-200" />
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto p-4 pb-24 space-y-4">
        <ActiveAthleteSwitcher
          athletes={athletes}
          activeAthleteId={activeAthleteId}
          onSelectAthlete={handleSelectAthlete}
        />

        {!activeAthleteId && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <div className="text-sm text-amber-900">
              Select an active athlete from Dashboard to view heatmap.
            </div>
          </section>
        )}

        <HeatmapFilters
          source={source}
          setSource={setSource}
          rangeId={rangeId}
          setRangeId={setRangeId}
          mode={mode}
          setMode={setMode}
          shotType={shotType}
          setShotType={setShotType}
          contested={contested}
          setContested={setContested}
        />

        <HeatmapCourt
          loading={loading}
          totalAttempts={totalAttempts}
          zones={zones}
          mode={mode}
          anchorMap={anchorMap}
          onImageLoad={handleImgLoad}
          onZoneClick={() => {
            // hook up modal later if desired
          }}
        />
      </main>
    </div>
  )
}
