// src/screens/__tests__/GoalsManagerProgress.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GoalsManager from '../GoalsManager.jsx'

vi.mock('../../lib/goals-db', () => ({
  listGoalSetsWithGoals: vi.fn(),
  createGoalSet: vi.fn(),
  updateGoalSet: vi.fn(),
  deleteGoalSet: vi.fn(),
  deleteGoalsBySet: vi.fn(),
  createGoal: vi.fn(),
  deleteGoal: vi.fn(),
  archiveGoalSet: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
  getUser: vi.fn(),
}))

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  Edit2: () => <div data-testid="edit-icon">Edit2</div>,
  Trash2: () => <div data-testid="trash-icon">Trash2</div>,
  ChevronDown: () => <div data-testid="chevron-icon">ChevronDown</div>,
  Archive: () => <div data-testid="archive-icon">Archive</div>,
}))

vi.mock('react-icons/md', () => ({
  MdEmojiObjects: () => <div data-testid="goal-icon">Goal</div>,
}))

import { listGoalSetsWithGoals } from '../../lib/goals-db'
import { supabase, getUser } from '../../lib/supabase'

const buildSupabaseQuery = (data, error = null) => {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
  }
  return query
}

describe('GoalsManager Progress (Game vs Practice)', () => {
  const gameEvents = [
    {
      id: 'ge-1',
      type: 'shot',
      zone_id: 'left_corner_3',
      is_three: true,
      made: true,
      ts: '2026-02-05T10:00:00Z',
    },
    {
      id: 'ge-2',
      type: 'shot',
      zone_id: 'center_mid',
      is_three: false,
      made: true,
      ts: '2026-02-05T10:05:00Z',
    },
    {
      id: 'ge-3',
      type: 'freethrow',
      made: true,
      ts: '2026-02-05T10:06:00Z',
    },
  ]

  const practiceEntries = [
    {
      id: 'pe-1',
      zone_id: 'left_corner_3',
      makes: 2,
      attempts: 3,
      ts: '2026-02-05T10:00:00Z',
    },
    {
      id: 'pe-2',
      zone_id: 'center_mid',
      makes: 1,
      attempts: 2,
      ts: '2026-02-06T10:00:00Z',
    },
  ]

  beforeEach(() => {
    getUser.mockResolvedValue({ id: 'user-1' })
    supabase.from.mockImplementation((table) => {
      if (table === 'game_events') return buildSupabaseQuery(gameEvents)
      if (table === 'practice_entries') return buildSupabaseQuery(practiceEntries)
      return buildSupabaseQuery([])
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should compute and render progress for a game goal', async () => {
    listGoalSetsWithGoals.mockResolvedValue([
      {
        id: 'game-set',
        name: 'Game Set',
        type: 'game',
        start_date: '2026-02-01',
        due_date: '2026-02-10',
        archived: false,
        goals: [
          {
            id: 'goal-game',
            name: 'Points Goal',
            metric: 'points_total',
            target_value: 10,
            target_end_date: '2026-02-10',
            target_type: 'total',
          },
        ],
      },
    ])

    const user = userEvent.setup()
    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('Game Set')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('Game Set').closest('[role="button"]')
    await user.click(setHeader)

    const goalCard = screen.getByText('Points Goal').closest('.rounded-xl')
    expect(within(goalCard).getByText('Target: 10 · Value: 6')).toBeInTheDocument()
  })

  it('should compute and render progress for a practice goal', async () => {
    listGoalSetsWithGoals.mockResolvedValue([
      {
        id: 'practice-set',
        name: 'Practice Set',
        type: 'practice',
        start_date: '2026-02-01',
        due_date: '2026-02-10',
        archived: false,
        goals: [
          {
            id: 'goal-practice',
            name: 'Makes Goal',
            metric: 'makes',
            target_value: 5,
            target_end_date: '2026-02-10',
            target_type: 'total',
          },
        ],
      },
    ])

    const user = userEvent.setup()
    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('Practice Set')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('Practice Set').closest('[role="button"]')
    await user.click(setHeader)

    const goalCard = screen.getByText('Makes Goal').closest('.rounded-xl')
    expect(within(goalCard).getByText('Target: 5 · Value: 3')).toBeInTheDocument()
  })
})
