import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"

import { usePracticeGateScreen } from "../usePracticeGateScreen"
import { usePracticeGateData } from "../usePracticeGateData"
import {
  addPracticeSession,
  deletePracticeSession,
  listActivePracticeSessions,
} from "../../lib/practice-db"
import { setActiveAthlete } from "../../lib/athlete-db"

vi.mock("../usePracticeGateData", () => ({
  usePracticeGateData: vi.fn(),
}))

vi.mock("../../lib/practice-db", () => ({
  addPracticeSession: vi.fn(),
  deletePracticeSession: vi.fn(),
  listActivePracticeSessions: vi.fn(),
}))

vi.mock("../../lib/athlete-db", () => ({
  setActiveAthlete: vi.fn(),
}))

describe("usePracticeGateScreen", () => {
  const refresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    refresh.mockResolvedValue(undefined)
    usePracticeGateData.mockReturnValue({
      sessions: [
        { id: "session-1", started_at: "2026-01-10T10:00:00Z" },
      ],
      active: { id: "active-1", started_at: "2026-01-20T10:00:00Z" },
      athletes: [
        { id: "ath-1", first_name: "Max", last_name: "McCarty" },
        { id: "ath-2", first_name: "Jane", last_name: "Doe" },
      ],
      selectedAthleteId: "ath-1",
      setSelectedAthleteId: vi.fn(),
      selectedAthlete: { id: "ath-1", first_name: "Max", last_name: "McCarty" },
      canStartForSelectedAthlete: true,
      groupedMonths: [{ key: "2026-01", label: "January 2026", sessions: [] }],
      refresh,
    })
    listActivePracticeSessions.mockResolvedValue([])
    addPracticeSession.mockResolvedValue({
      id: "new-session",
      started_at: "2026-01-22T09:00:00Z",
    })
    deletePracticeSession.mockResolvedValue({})
  })

  it("returns grouped data and ui state, and opens the start card", () => {
    const navigate = vi.fn()
    const { result } = renderHook(() => usePracticeGateScreen({ navigate }))

    expect(result.current.data.selectedAthlete?.id).toBe("ath-1")
    expect(result.current.startUi.showStartCard).toBe(false)
    expect(result.current.historyUi.openMonth).toBe(null)
    expect(result.current.startActions).toBeDefined()
    expect(result.current.historyActions).toBeDefined()
    expect(result.current.modalActions).toBeDefined()

    act(() => {
      result.current.startActions.openStartCard()
    })

    expect(result.current.startUi.showStartCard).toBe(true)
    expect(result.current.startUi.showSwitchAthlete).toBe(false)
  })

  it("starts a session for the selected athlete and navigates", async () => {
    const navigate = vi.fn()
    const { result } = renderHook(() => usePracticeGateScreen({ navigate }))

    act(() => {
      result.current.startActions.openStartCard()
    })

    await act(async () => {
      await result.current.startActions.startForSelectedAthlete()
    })

    expect(setActiveAthlete).toHaveBeenCalledWith("ath-1")
    expect(addPracticeSession).toHaveBeenCalledWith({ athlete_id: "ath-1" })
    expect(refresh).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith("practice-log", {
      id: "new-session",
      started_at: "2026-01-22T09:00:00Z",
    })
    expect(result.current.startUi.showStartCard).toBe(false)
  })

  it("surfaces an existing active session instead of creating a new one", async () => {
    const navigate = vi.fn()
    listActivePracticeSessions.mockResolvedValue([
      { id: "existing-1", started_at: "2026-01-21T11:00:00Z" },
    ])

    const { result } = renderHook(() => usePracticeGateScreen({ navigate }))

    await act(async () => {
      await result.current.startActions.startForSelectedAthlete()
    })

    expect(addPracticeSession).not.toHaveBeenCalled()
    expect(result.current.modal.existingActiveSession?.id).toBe("existing-1")
    expect(navigate).not.toHaveBeenCalled()
  })

  it("deletes a session and refreshes data", async () => {
    const navigate = vi.fn()
    const { result } = renderHook(() => usePracticeGateScreen({ navigate }))

    await act(async () => {
      await result.current.historyActions.deleteSession("session-1")
    })

    expect(deletePracticeSession).toHaveBeenCalledWith("session-1")
    expect(refresh).toHaveBeenCalled()
  })

  it("closes the chooser on outside pointer down", async () => {
    const navigate = vi.fn()
    const { result } = renderHook(() => usePracticeGateScreen({ navigate }))

    act(() => {
      result.current.startActions.openStartCard()
    })

    await waitFor(() => {
      expect(result.current.startUi.showStartCard).toBe(true)
    })

    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
    })

    await waitFor(() => {
      expect(result.current.startUi.showStartCard).toBe(false)
    })
  })

  it("exposes intent-based handlers for athlete and month selection", () => {
    const navigate = vi.fn()
    const setSelectedAthleteId = vi.fn()
    usePracticeGateData.mockReturnValue({
      sessions: [],
      active: null,
      athletes: [{ id: "ath-1" }],
      selectedAthleteId: "ath-1",
      setSelectedAthleteId,
      selectedAthlete: { id: "ath-1" },
      canStartForSelectedAthlete: true,
      groupedMonths: [{ key: "2026-01", label: "January 2026", sessions: [] }],
      refresh,
    })

    const { result } = renderHook(() => usePracticeGateScreen({ navigate }))

    act(() => {
      result.current.startActions.toggleSwitchAthlete()
    })
    expect(result.current.startUi.showSwitchAthlete).toBe(true)

    act(() => {
      result.current.startActions.selectAthlete("ath-2")
    })
    expect(setSelectedAthleteId).toHaveBeenCalledWith("ath-2")

    act(() => {
      result.current.historyActions.toggleMonth("2026-01")
    })
    expect(result.current.historyUi.openMonth).toBe("2026-01")

    act(() => {
      result.current.historyActions.toggleMonth("2026-01")
    })
    expect(result.current.historyUi.openMonth).toBe(null)
  })
})
