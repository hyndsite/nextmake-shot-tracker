// src/Performance.jsx

import React from "react"

import ActiveAthleteSwitcher from "../components/ActiveAthleteSwitcher"
import PerformanceSection from "../components/Performance/PerformanceSection"
import { usePerformanceData } from "../hooks/usePerformanceData"

// ---- Main component ----

export default function Performance({ navigate }) {
  const {
    athletes,
    activeAthleteId,
    handleSelectAthlete,
    gameExpanded,
    toggleGameExpanded,
    practiceExpanded,
    togglePracticeExpanded,
    gameRangeId,
    setGameRangeId,
    practiceRangeId,
    setPracticeRangeId,
    gameShotType,
    setGameShotType,
    practiceShotType,
    setPracticeShotType,
    gameContested,
    setGameContested,
    practiceContested,
    setPracticeContested,
    gameMode,
    setGameMode,
    practiceMode,
    setPracticeMode,
    gameTrendMode,
    setGameTrendMode,
    practiceTrendMode,
    setPracticeTrendMode,
    gameLoading,
    practiceLoading,
    gameSelectedPoint,
    setGameSelectedPoint,
    practiceSelectedPoint,
    setPracticeSelectedPoint,
    gameData,
    practiceData,
    gameTrendData,
    gameTrendTicks,
    practiceTrendData,
    practiceTrendTicks,
  } = usePerformanceData()

  return (
    <div className="min-h-dvh bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-screen-sm mx-auto px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Player Performance
          </h2>
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
              Select an active athlete from Dashboard to view performance.
            </div>
          </section>
        )}

        <PerformanceSection
          title="Game"
          expanded={gameExpanded}
          onToggle={toggleGameExpanded}
          modeValue={gameMode}
          onModeChange={setGameMode}
          totalAttemptsText={
            gameData.totalAttempts
              ? `${gameData.totalAttempts} FG attempts`
              : "No shots yet"
          }
          rangeValue={gameRangeId}
          onRangeChange={setGameRangeId}
          shotTypeValue={gameShotType}
          onShotTypeChange={setGameShotType}
          contestedValue={gameContested}
          onContestedChange={setGameContested}
          loading={gameLoading}
          emptyText="No game shots logged in this range yet."
          metrics={gameData.metrics}
          trendTitle={
            gameMode === "attempts"
              ? "Game Attempts Trend"
              : "Game eFG% vs FG% Trend"
          }
          trendData={gameTrendData}
          trendMode={gameTrendMode}
          onTrendModeChange={setGameTrendMode}
          trendTicks={gameTrendTicks}
          sourceLabel="Game"
          selectedPoint={gameSelectedPoint}
          onSelectPoint={setGameSelectedPoint}
          vizMode={gameMode}
          totalAttempts={gameData.totalAttempts}
        />

        <PerformanceSection
          title="Practice"
          expanded={practiceExpanded}
          onToggle={togglePracticeExpanded}
          modeValue={practiceMode}
          onModeChange={setPracticeMode}
          totalAttemptsText={
            practiceData.totalAttempts
              ? `${practiceData.totalAttempts} attempts`
              : "No attempts yet"
          }
          rangeValue={practiceRangeId}
          onRangeChange={setPracticeRangeId}
          shotTypeValue={practiceShotType}
          onShotTypeChange={setPracticeShotType}
          contestedValue={practiceContested}
          onContestedChange={setPracticeContested}
          loading={practiceLoading}
          emptyText="No practice entries logged in this range yet."
          metrics={practiceData.metrics}
          trendTitle={
            practiceMode === "attempts"
              ? "Practice Attempts Trend"
              : "Practice eFG% vs FG% Trend"
          }
          trendData={practiceTrendData}
          trendMode={practiceTrendMode}
          onTrendModeChange={setPracticeTrendMode}
          trendTicks={practiceTrendTicks}
          sourceLabel="Practice"
          selectedPoint={practiceSelectedPoint}
          onSelectPoint={setPracticeSelectedPoint}
          vizMode={practiceMode}
          totalAttempts={practiceData.totalAttempts}
        />
      </main>
    </div>
  )
}
