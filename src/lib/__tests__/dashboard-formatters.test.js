import { describe, expect, it } from "vitest"

import { fmtPct, fmtValue, fullName, zoneLabel } from "../dashboard-formatters"

describe("dashboard-formatters", () => {
  it("formats athlete names", () => {
    expect(fullName(null)).toBe("No active athlete")
    expect(fullName({ first_name: "Zoe", last_name: "Smith" })).toBe("Zoe Smith")
    expect(fullName({ first_name: "Ava", last_name: "" })).toBe("Ava")
  })

  it("formats zone labels", () => {
    expect(zoneLabel(null)).toBe("Unknown zone")
    expect(zoneLabel("free_throw")).toBe("Free Throw")
    expect(zoneLabel("left_corner_three")).toBe("Left Corner Three")
  })

  it("formats percentages and values", () => {
    expect(fmtPct(52.34)).toBe("52.3%")
    expect(fmtValue(48.88, "percent")).toBe("48.9%")
    expect(fmtValue(12.7, "number")).toBe("13")
  })
})
