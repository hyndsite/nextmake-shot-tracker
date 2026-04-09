import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"

import { useDashboardAthleteActions } from "../useDashboardAthleteActions"
import { addAthlete, archiveAthlete } from "../../lib/athlete-db"
import {
  archiveAthleteProfile,
  createAthleteProfile,
} from "../../lib/athlete-profiles-db"

vi.mock("../../lib/athlete-db", () => ({
  addAthlete: vi.fn(),
  archiveAthlete: vi.fn(),
}))

vi.mock("../../lib/athlete-profiles-db", () => ({
  createAthleteProfile: vi.fn(),
  archiveAthleteProfile: vi.fn(),
}))

describe("useDashboardAthleteActions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, "confirm").mockReturnValue(true)
  })

  it("creates an athlete and selects it", async () => {
    const selectAthlete = vi.fn()

    createAthleteProfile.mockResolvedValueOnce({
      id: "remote_max",
      first_name: "Max",
      last_name: "McCarty",
      created_at: "2026-04-08T00:00:00.000Z",
      avatar_color: "#BFDBFE",
    })
    addAthlete.mockReturnValueOnce({ id: "remote_max" })

    const { result } = renderHook(() =>
      useDashboardAthleteActions({
        activeAthlete: null,
        refreshAthletes: vi.fn(),
        selectAthlete,
      }),
    )

    act(() => {
      result.current.setFirstName("Max")
      result.current.setLastName("McCarty")
    })

    await act(async () => {
      await result.current.handleAddAthlete({ preventDefault: vi.fn() })
    })

    expect(createAthleteProfile).toHaveBeenCalledWith({
      firstName: "Max",
      lastName: "McCarty",
    })
    expect(addAthlete).toHaveBeenCalledWith({
      firstName: "Max",
      lastName: "McCarty",
      id: "remote_max",
      createdAt: "2026-04-08T00:00:00.000Z",
      avatarColor: "#BFDBFE",
    })
    expect(selectAthlete).toHaveBeenCalledWith("remote_max")
    expect(result.current.firstName).toBe("")
    expect(result.current.lastName).toBe("")
  })

  it("archives the active athlete and refreshes the list", async () => {
    const refreshAthletes = vi.fn()

    const { result } = renderHook(() =>
      useDashboardAthleteActions({
        activeAthlete: {
          id: "remote_ava",
          first_name: "Ava",
          last_name: "Lopez",
        },
        refreshAthletes,
        selectAthlete: vi.fn(),
      }),
    )

    await act(async () => {
      await result.current.handleArchiveAthlete()
    })

    expect(archiveAthleteProfile).toHaveBeenCalledWith("remote_ava")
    expect(archiveAthlete).toHaveBeenCalledWith("remote_ava")
    expect(refreshAthletes).toHaveBeenCalled()
  })
})
