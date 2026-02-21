import { beforeEach, describe, expect, it } from "vitest"

import {
  addAthlete,
  archiveAthlete,
  buildInitials,
  getActiveAthlete,
  getActiveAthleteId,
  listAthletes,
  setActiveAthlete,
} from "../athlete-db"

describe("athlete-db", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("builds initials from first and last name", () => {
    expect(buildInitials("Max", "McCarty")).toBe("MM")
    expect(buildInitials("Max", "")).toBe("M")
  })

  it("adds an athlete and auto-selects first athlete", () => {
    const athlete = addAthlete({ firstName: "Max", lastName: "McCarty" })

    expect(listAthletes()).toHaveLength(1)
    expect(getActiveAthleteId()).toBe(athlete.id)
    expect(getActiveAthlete()?.first_name).toBe("Max")
  })

  it("caps names at 20 characters", () => {
    const long = "abcdefghijklmnopqrstuvw"
    const athlete = addAthlete({ firstName: long, lastName: long })

    expect(athlete.first_name).toHaveLength(20)
    expect(athlete.last_name).toHaveLength(20)
  })

  it("can switch active athlete", () => {
    const one = addAthlete({ firstName: "One", lastName: "" })
    const two = addAthlete({ firstName: "Two", lastName: "" })

    setActiveAthlete(two.id)

    expect(getActiveAthleteId()).toBe(two.id)
    expect(getActiveAthlete()?.id).toBe(two.id)
    expect(one.id).not.toBe(two.id)
  })

  it("archives athlete without deleting persisted record", () => {
    const one = addAthlete({ firstName: "One", lastName: "" })
    addAthlete({ firstName: "Two", lastName: "" })

    archiveAthlete(one.id)

    expect(listAthletes().map((x) => x.id)).not.toContain(one.id)
    const raw = JSON.parse(localStorage.getItem("nm_athletes") || "[]")
    const archivedRow = raw.find((x) => x.id === one.id)
    expect(archivedRow?.archived_at).toBeTruthy()
  })
})
