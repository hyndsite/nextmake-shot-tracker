import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

import GoalSetCard from "../GoalSetCard"

vi.mock("lucide-react", () => ({
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  Edit2: () => <div data-testid="edit-icon">Edit2</div>,
  Trash2: () => <div data-testid="trash-icon">Trash2</div>,
  Archive: () => <div data-testid="archive-icon">Archive</div>,
}))

vi.mock("react-icons/md", () => ({
  MdEmojiObjects: () => <div data-testid="goal-icon">Goal</div>,
}))

vi.mock("../GoalCard", () => ({
  default: ({ goal, onDelete }) => (
    <div>
      <span>{goal.name}</span>
      <span>{onDelete ? "deletable" : "read-only"}</span>
    </div>
  ),
}))

describe("GoalSetCard", () => {
  const baseSet = {
    id: "set-1",
    name: "January Goals",
    type: "practice",
    start_date: "2026-01-01",
    due_date: "2026-01-31",
    goals: [{ id: "goal-1", name: "Makes Goal" }],
  }

  it("renders active goal set controls and expanded goals", () => {
    const onToggleExpanded = vi.fn()
    const onStartEdit = vi.fn()
    const onDeleteSet = vi.fn()
    const onArchiveSet = vi.fn()
    const onDeleteGoal = vi.fn()
    const getGoalProgress = vi.fn(() => ({
      progressPct: 60,
      targetLabel: "5",
      currentLabel: "3",
      targetRaw: 5,
    }))

    render(
      <GoalSetCard
        set={baseSet}
        isArchived={false}
        isExpanded
        onToggleExpanded={onToggleExpanded}
        onStartEdit={onStartEdit}
        onDeleteSet={onDeleteSet}
        onArchiveSet={onArchiveSet}
        onDeleteGoal={onDeleteGoal}
        getGoalProgress={getGoalProgress}
      />
    )

    fireEvent.click(screen.getByText("January Goals"))
    expect(onToggleExpanded).toHaveBeenCalledWith("set-1")

    fireEvent.click(screen.getByLabelText("Edit goal set"))
    expect(onStartEdit).toHaveBeenCalledWith(baseSet)

    fireEvent.click(screen.getByLabelText("Delete goal set"))
    expect(onDeleteSet).toHaveBeenCalledWith(baseSet)

    fireEvent.click(screen.getByLabelText("Archive goal set"))
    expect(onArchiveSet).toHaveBeenCalledWith(baseSet)

    expect(getGoalProgress).toHaveBeenCalledWith(baseSet.goals[0], baseSet)
    expect(screen.getByText("Makes Goal")).toBeInTheDocument()
    expect(screen.getByText("deletable")).toBeInTheDocument()
  })

  it("renders archived goal sets as read-only", () => {
    render(
      <GoalSetCard
        set={{ ...baseSet, archived: true }}
        isArchived
        isExpanded
        onToggleExpanded={vi.fn()}
        onStartEdit={vi.fn()}
        onDeleteSet={vi.fn()}
        onArchiveSet={vi.fn()}
        onDeleteGoal={vi.fn()}
        getGoalProgress={vi.fn(() => ({
          progressPct: 60,
          targetLabel: "5",
          currentLabel: "3",
          targetRaw: 5,
        }))}
      />
    )

    expect(screen.queryByLabelText("Edit goal set")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Delete goal set")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Archive goal set")).not.toBeInTheDocument()
    expect(screen.getByText("Archived")).toBeInTheDocument()
    expect(screen.getByText("read-only")).toBeInTheDocument()
  })
})
