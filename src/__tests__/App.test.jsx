import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import App from "../App"

vi.mock("../screens/Login", () => ({
  default: () => <div>Login Screen</div>,
}))

vi.mock("../screens/Dashboard", () => ({
  default: () => <div>Dashboard Screen</div>,
}))

vi.mock("../screens/PracticeLog", () => ({ default: () => null }))
vi.mock("../screens/PracticeGate", () => ({ default: () => null }))
vi.mock("../screens/GameGate", () => ({ default: () => null }))
vi.mock("../screens/GameNew", () => ({ default: () => null }))
vi.mock("../screens/GameLogger", () => ({ default: () => null }))
vi.mock("../screens/GameDetail", () => ({ default: () => null }))
vi.mock("../screens/Performance", () => ({ default: () => null }))
vi.mock("../screens/Heatmap", () => ({ default: () => null }))
vi.mock("../screens/GoalsManager", () => ({ default: () => null }))
vi.mock("../screens/Account", () => ({ default: () => null }))
vi.mock("../components/BottomNav", () => ({ default: () => null }))

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

vi.mock("../lib/sync", () => ({
  initAutoSync: vi.fn(),
  bootstrapAllData: vi.fn(),
}))

vi.mock("../lib/idb-init", () => ({
  whenIdbReady: vi.fn(),
}))

import { supabase } from "../lib/supabase"
import { initAutoSync, bootstrapAllData } from "../lib/sync"
import { whenIdbReady } from "../lib/idb-init"

describe("App auth boot flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    whenIdbReady.mockResolvedValue()
    initAutoSync.mockImplementation(() => {})
    bootstrapAllData.mockResolvedValue({})
  })

  it("does not render the login screen while restoring an existing local session", async () => {
    let resolveBootstrap
    bootstrapAllData.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveBootstrap = resolve
        }),
    )
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    })

    render(<App />)

    expect(screen.queryByText("Login Screen")).not.toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByAltText("NextMake")).toBeInTheDocument()
      expect(screen.getByLabelText("Loading")).toBeInTheDocument()
    })

    await act(async () => {
      resolveBootstrap({})
    })

    await waitFor(() => {
      expect(bootstrapAllData).toHaveBeenCalledWith("user-1")
    })
  })

  it("renders login when there is no active session", async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText("Login Screen")).toBeInTheDocument()
    })
  })
})
