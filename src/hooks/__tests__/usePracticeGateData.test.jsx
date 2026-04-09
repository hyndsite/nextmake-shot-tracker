import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"

import { usePracticeGateData } from "../usePracticeGateData"
import {
  listPracticeSessions,
  listActivePracticeSessions,
} from "../../lib/practice-db"
import {
  getActiveAthleteId,
  listAthletes,
} from "../../lib/athlete-db"

vi.mock("../../lib/practice-db", () => ({
  listPracticeSessions: vi.fn(),
  listActivePracticeSessions: vi.fn(),
}))

vi.mock("../../lib/athlete-db", () => ({
  getActiveAthleteId: vi.fn(),
  listAthletes: vi.fn(),
}))

describe("usePracticeGateData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listAthletes.mockReturnValue([
      { id: "ath-1", first_name: "Max", last_name: "McCarty" },
      { id: "ath-2", first_name: "Jane", last_name: "Doe" },
    ])
    getActiveAthleteId.mockReturnValue("ath-1")
    listActivePracticeSessions.mockResolvedValue([])
  })

  it("hydrates sessions and groups previous sessions by month in descending order", async () => {
    listPracticeSessions.mockResolvedValue([
      { id: "mar-2", started_at: "2026-03-12T10:00:00Z" },
      { id: "mar-1", started_at: "2026-03-01T10:00:00Z" },
      { id: "jan-1", started_at: "2026-01-15T10:00:00Z" },
    ])

    const { result } = renderHook(() => usePracticeGateData())

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(3)
    })

    expect(result.current.selectedAthlete?.id).toBe("ath-1")
    expect(result.current.groupedMonths).toHaveLength(2)
    expect(result.current.groupedMonths[0].key).toBe("2026-03")
    expect(result.current.groupedMonths[0].sessions.map((session) => session.id)).toEqual([
      "mar-2",
      "mar-1",
    ])
    expect(result.current.groupedMonths[1].key).toBe("2026-01")
  })

  it("excludes the active session from previous-session month groups", async () => {
    const activeSession = { id: "active-1", started_at: "2026-03-20T10:00:00Z" }
    listPracticeSessions.mockResolvedValue([
      activeSession,
      { id: "older-1", started_at: "2026-03-10T10:00:00Z" },
    ])
    listActivePracticeSessions.mockResolvedValue([activeSession])

    const { result } = renderHook(() => usePracticeGateData())

    await waitFor(() => {
      expect(result.current.active?.id).toBe("active-1")
    })

    expect(result.current.groupedMonths).toHaveLength(1)
    expect(result.current.groupedMonths[0].sessions.map((session) => session.id)).toEqual([
      "older-1",
    ])
  })
})
