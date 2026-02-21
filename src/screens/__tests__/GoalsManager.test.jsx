// src/screens/__tests__/GoalsManager.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GoalsManager from '../GoalsManager.jsx'

vi.mock('../../lib/goals-db', () => ({
  createGoalSet: vi.fn(),
  updateGoalSet: vi.fn(),
  deleteGoalSet: vi.fn(),
  deleteGoalsBySet: vi.fn(),
  listGoalSetsWithGoals: vi.fn(),
  createGoal: vi.fn(),
  deleteGoal: vi.fn(),
  archiveGoalSet: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
  getUser: vi.fn(),
}))

vi.mock('../../lib/athlete-db', () => ({
  listAthletes: vi.fn(),
  getActiveAthleteId: vi.fn(),
  setActiveAthlete: vi.fn(),
}))

vi.mock('../../lib/goal-metrics', () => ({
  BASE_METRIC_OPTIONS: [
    { value: 'fg_pct_zone', label: 'FG% (by zone)' },
    { value: 'makes', label: 'Makes (count)' },
  ],
  GAME_ONLY_METRIC_OPTIONS: [{ value: 'points_total', label: 'Total Points (Game)' }],
  computeGameMetricValue: vi.fn().mockReturnValue(12),
  computePracticeMetricValue: vi.fn().mockReturnValue(20),
  metricIsPercent: vi.fn((metric) => metric === 'fg_pct_zone'),
  formatMetricValue: vi.fn((metric, value) => `${Math.round(value)}%`),
}))

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  Edit2: () => <div data-testid="edit-icon">Edit2</div>,
  Trash2: () => <div data-testid="trash-icon">Trash2</div>,
  ChevronDown: () => <div data-testid="chevron-icon">ChevronDown</div>,
  Archive: () => <div data-testid="archive-icon">Archive</div>,
  ArrowLeftRight: () => <div data-testid="switch-athlete-icon">Switch</div>,
}))

vi.mock('react-icons/md', () => ({
  MdEmojiObjects: () => <div data-testid="goal-icon">Goal</div>,
}))

import {
  createGoalSet,
  updateGoalSet,
  deleteGoalSet,
  deleteGoalsBySet,
  listGoalSetsWithGoals,
  createGoal,
  deleteGoal,
  archiveGoalSet,
} from '../../lib/goals-db'
import { getUser } from '../../lib/supabase'
import { listAthletes, getActiveAthleteId, setActiveAthlete } from '../../lib/athlete-db'

const getSectionByTitle = (title) => screen.getByText(title).closest('section')
const getInputByPlaceholder = (placeholder, root = screen) =>
  within(root).getByPlaceholderText(placeholder)
const getDateInputs = (root) => Array.from(root.querySelectorAll('input[type="date"]'))
const getSelectByOptionText = (root, optionText) => {
  const selects = root.querySelectorAll('select')
  return Array.from(selects).find((select) =>
    Array.from(select.options).some((opt) => opt.textContent === optionText)
  )
}

describe('GoalsManager Component', () => {
  const baseSet = {
    id: 'set-1',
    name: 'January Goals',
    type: 'practice',
    start_date: '2026-01-01',
    due_date: '2026-01-31',
    archived: false,
    goals: [],
  }

  beforeEach(() => {
    listGoalSetsWithGoals.mockResolvedValue([baseSet])
    createGoalSet.mockResolvedValue({ ...baseSet })
    updateGoalSet.mockResolvedValue({ ...baseSet })
    deleteGoalSet.mockResolvedValue({})
    deleteGoalsBySet.mockResolvedValue({})
    createGoal.mockResolvedValue({
      id: 'goal-1',
      name: 'FG% (by zone)',
      metric: 'fg_pct_zone',
      target_value: 40,
      target_end_date: '2026-01-20',
      target_type: 'percent',
      zone_id: 'left_corner_3',
    })
    deleteGoal.mockResolvedValue({})
    archiveGoalSet.mockResolvedValue({ ...baseSet, archived: true, archived_at: '2026-02-01' })
    getUser.mockResolvedValue(null)
    listAthletes.mockReturnValue([
      { id: 'ath-1', first_name: 'Ava', last_name: '', initials: 'A', avatar_color: '#BFDBFE' },
      { id: 'ath-2', first_name: 'Max', last_name: '', initials: 'M', avatar_color: '#FBCFE8' },
    ])
    getActiveAthleteId.mockReturnValue('ath-1')
    setActiveAthlete.mockImplementation(() => {})
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('should render empty state when no active goal sets', async () => {
    listGoalSetsWithGoals.mockResolvedValue([])
    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.queryByText('Loading goals…')).not.toBeInTheDocument()
      expect(
        screen.getByText('No active goal sets. Create one above to get started.')
      ).toBeInTheDocument()
    })
  })

  it('should navigate back to home when Back is clicked', async () => {
    const user = userEvent.setup()
    const mockNavigate = vi.fn()
    render(<GoalsManager navigate={mockNavigate} />)

    await user.click(screen.getByText('Back'))

    expect(mockNavigate).toHaveBeenCalledWith('home')
  })

  it('should load and switch goals by active athlete', async () => {
    const user = userEvent.setup()
    render(<GoalsManager />)

    await waitFor(() => {
      expect(listGoalSetsWithGoals).toHaveBeenCalledWith({ athleteId: 'ath-1' })
    })

    await user.click(screen.getByRole('button', { name: 'Switch athlete' }))
    await user.click(screen.getByRole('button', { name: 'Max' }))

    await waitFor(() => {
      expect(setActiveAthlete).toHaveBeenCalledWith('ath-2')
      expect(listGoalSetsWithGoals).toHaveBeenCalledWith({ athleteId: 'ath-2' })
    })
  })

  it('should sort archived goal sets by most recent archive date', async () => {
    const user = userEvent.setup()
    listGoalSetsWithGoals.mockResolvedValue([
      {
        ...baseSet,
        id: 'arch-old',
        name: 'Archived Old',
        archived: true,
        archived_at: '2026-01-01',
      },
      {
        ...baseSet,
        id: 'arch-new',
        name: 'Archived New',
        archived: true,
        archived_at: '2026-02-01',
      },
    ])

    render(<GoalsManager />)

    const archivedSection = getSectionByTitle('Archived Goal Sets')
    await user.click(within(archivedSection).getByText('Archived Goal Sets'))

    await waitFor(() => {
      expect(screen.getByText('Archived New')).toBeInTheDocument()
      expect(screen.getByText('Archived Old')).toBeInTheDocument()
    })

    const labels = within(archivedSection).getAllByText(/Archived (New|Old)/)
    expect(labels[0]).toHaveTextContent('Archived New')
    expect(labels[1]).toHaveTextContent('Archived Old')
  })

  it('should create a new goal set from the accordion form', async () => {
    listGoalSetsWithGoals.mockResolvedValue([])
    createGoalSet.mockResolvedValue({
      id: 'set-2',
      name: 'February Block',
      type: 'game',
      start_date: '2026-02-01',
      due_date: '2026-02-28',
      archived: false,
      goals: [],
    })

    const user = userEvent.setup()
    render(<GoalsManager />)

    const createSection = getSectionByTitle('Create New Goal Set')
    await user.click(within(createSection).getByText('Create New Goal Set'))

    const form = within(createSection).getByText('Create Set').closest('form')
    await user.type(
      getInputByPlaceholder('Set name (e.g., December Shooting Block)', form),
      'February Block'
    )

    const typeSelect = form.querySelector('select')
    await user.selectOptions(typeSelect, 'game')

    const [startDate, dueDate] = getDateInputs(form)
    await user.clear(startDate)
    await user.type(startDate, '2026-02-01')
    await user.clear(dueDate)
    await user.type(dueDate, '2026-02-28')

    await user.click(within(form).getByText('Create Set'))

    await waitFor(() => {
      expect(createGoalSet).toHaveBeenCalledWith({
        name: 'February Block',
        type: 'game',
        startDate: '2026-02-01',
        dueDate: '2026-02-28',
      })
      expect(screen.getByText('February Block')).toBeInTheDocument()
    })
  })

  it('should add a zone-based goal to a set and expand it', async () => {
    const user = userEvent.setup()
    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('January Goals')).toBeInTheDocument()
    })

    const addGoalSection = getSectionByTitle('Add Goal to Set')
    await user.click(within(addGoalSection).getByText('Add Goal to Set'))

    const setSelect = getSelectByOptionText(addGoalSection, 'Select Goal Set')
    await user.selectOptions(setSelect, baseSet.id)

    const metricSelect = getSelectByOptionText(addGoalSection, 'FG% (by zone)')
    await user.selectOptions(metricSelect, 'fg_pct_zone')

    const addGoalButton = within(addGoalSection).getByText('Add Goal').closest('button')
    expect(addGoalButton).toBeDisabled()

    const zoneSelect = getSelectByOptionText(addGoalSection, 'Select Zone')
    await user.selectOptions(zoneSelect, 'left_corner_3')

    await user.type(
      getInputByPlaceholder('Target Value (e.g., 44)', addGoalSection),
      '40'
    )

    const [goalEndDate] = getDateInputs(addGoalSection)
    await user.clear(goalEndDate)
    await user.type(goalEndDate, '2026-01-20')

    expect(addGoalButton).not.toBeDisabled()
    await user.click(addGoalButton)

    await waitFor(() => {
      expect(createGoal).toHaveBeenCalledWith({
        setId: baseSet.id,
        athleteId: 'ath-1',
        name: 'FG% (by zone)',
        details: 'L Corner 3',
        metric: 'fg_pct_zone',
        targetValue: 40,
        targetEndDate: '2026-01-20',
        targetType: 'percent',
        zoneId: 'left_corner_3',
      })
      const setHeader = screen.getByText('January Goals').closest('[role="button"]')
      const setCard = setHeader.closest('.rounded-2xl')
      expect(within(setCard).getByText('FG% (by zone)')).toBeInTheDocument()
      expect(within(setCard).getByText('L Corner 3')).toBeInTheDocument()
    })
  })

  it('should archive a goal set and show it under archived sets', async () => {
    const user = userEvent.setup()
    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('January Goals')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('January Goals').closest('[role="button"]')
    const setCard = setHeader.closest('.rounded-2xl')
    await user.click(within(setCard).getByLabelText('Archive goal set'))

    await waitFor(() => {
      expect(archiveGoalSet).toHaveBeenCalledWith(baseSet.id)
      expect(
        screen.getByText('No active goal sets. Create one above to get started.')
      ).toBeInTheDocument()
    })

    const archivedSection = getSectionByTitle('Archived Goal Sets')
    await user.click(within(archivedSection).getByText('Archived Goal Sets'))

    expect(screen.getByText('January Goals')).toBeInTheDocument()
  })

  it('should delete a goal set when confirmed', async () => {
    const user = userEvent.setup()
    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('January Goals')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('January Goals').closest('[role="button"]')
    const setCard = setHeader.closest('.rounded-2xl')
    await user.click(within(setCard).getByLabelText('Delete goal set'))

    await waitFor(() => {
      expect(deleteGoalsBySet).toHaveBeenCalledWith(baseSet.id)
      expect(deleteGoalSet).toHaveBeenCalledWith(baseSet.id)
    })
  })

  it('should expand a set, render goal details, and allow deleting a goal', async () => {
    const user = userEvent.setup()
    const dateSpy = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockReturnValue('Jan 20, 2026')
    listGoalSetsWithGoals.mockResolvedValue([
      {
        ...baseSet,
        goals: [
          {
            id: 'goal-42',
            name: '',
            details: 'Custom details',
            metric: 'fg_pct_zone',
            target_value: 40,
            target_end_date: '2026-01-20',
            target_type: 'percent',
            zone_id: 'left_corner_3',
          },
        ],
      },
    ])

    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('January Goals')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('January Goals').closest('[role="button"]')
    await user.click(setHeader)

    const goalCard = screen.getByText('FG% (by zone)').closest('.rounded-xl')
    expect(within(goalCard).getByText('Custom details · L Corner 3')).toBeInTheDocument()
    expect(within(goalCard).getByText('Target by: Jan 20, 2026')).toBeInTheDocument()
    expect(within(goalCard).getByText(/Target: 40% · Value:/)).toBeInTheDocument()

    await user.click(within(goalCard).getByLabelText('Delete goal'))

    await waitFor(() => {
      expect(deleteGoal).toHaveBeenCalledWith('goal-42')
    })

    dateSpy.mockRestore()
  })

  it('should render archived goals without delete actions and show empty state', async () => {
    const user = userEvent.setup()
    listGoalSetsWithGoals.mockResolvedValue([
      {
        ...baseSet,
        id: 'set-archived',
        name: 'Archived Set',
        archived: true,
        goals: [],
        due_date: '2026-02-01',
        start_date: '2026-01-01',
      },
    ])

    render(<GoalsManager />)

    const archivedSection = getSectionByTitle('Archived Goal Sets')
    await user.click(within(archivedSection).getByText('Archived Goal Sets'))

    await waitFor(() => {
      expect(screen.getByText('Archived Set')).toBeInTheDocument()
    })

    const archivedHeader = screen.getByText('Archived Set').closest('[role="button"]')
    await user.click(archivedHeader)

    await waitFor(() => {
      expect(screen.getByText('No goals in this archived set.')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText('Delete goal')).not.toBeInTheDocument()
  })

  it('should update an existing goal set when editing', async () => {
    const user = userEvent.setup()
    updateGoalSet.mockResolvedValue({
      ...baseSet,
      name: 'Updated Goals',
      due_date: '2026-02-15',
    })

    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('January Goals')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('January Goals').closest('[role="button"]')
    const setCard = setHeader.closest('.rounded-2xl')
    await user.click(within(setCard).getByLabelText('Edit goal set'))

    const createSection = getSectionByTitle('Create New Goal Set')
    const form = within(createSection).getByText('Update Set').closest('form')
    const nameInput = getInputByPlaceholder('Set name (e.g., December Shooting Block)', form)
    const [startDate, dueDate] = getDateInputs(form)

    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Goals')
    await user.clear(dueDate)
    await user.type(dueDate, '2026-02-15')

    await user.click(within(form).getByText('Update Set'))

    await waitFor(() => {
      expect(updateGoalSet).toHaveBeenCalledWith(baseSet.id, {
        name: 'Updated Goals',
        type: baseSet.type,
        start_date: baseSet.start_date,
        due_date: '2026-02-15',
      })
      expect(screen.getByText('Updated Goals')).toBeInTheDocument()
    })
  })

  it('should reset goal metric when switching from game to practice set', async () => {
    const user = userEvent.setup()
    listGoalSetsWithGoals.mockResolvedValue([
      {
        ...baseSet,
        id: 'game-set',
        name: 'Game Set',
        type: 'game',
        archived: false,
      },
      {
        ...baseSet,
        id: 'practice-set',
        name: 'Practice Set',
        type: 'practice',
        archived: false,
      },
    ])

    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('Game Set')).toBeInTheDocument()
    })

    const addGoalSection = getSectionByTitle('Add Goal to Set')
    await user.click(within(addGoalSection).getByText('Add Goal to Set'))

    const setSelect = getSelectByOptionText(addGoalSection, 'Select Goal Set')
    await user.selectOptions(setSelect, 'game-set')

    const metricSelect = getSelectByOptionText(addGoalSection, 'Total Points (Game)')
    await user.selectOptions(metricSelect, 'points_total')

    await user.selectOptions(setSelect, 'practice-set')

    expect(metricSelect.value).toBe('fg_pct_zone')
  })

  it('should alert when saving a goal set fails', async () => {
    const user = userEvent.setup()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    createGoalSet.mockRejectedValue(new Error('fail'))
    listGoalSetsWithGoals.mockResolvedValue([])

    render(<GoalsManager />)

    const createSection = getSectionByTitle('Create New Goal Set')
    await user.click(within(createSection).getByText('Create New Goal Set'))

    const form = within(createSection).getByText('Create Set').closest('form')
    await user.type(
      getInputByPlaceholder('Set name (e.g., December Shooting Block)', form),
      'Bad Set'
    )

    const [startDate, dueDate] = getDateInputs(form)
    await user.clear(startDate)
    await user.type(startDate, '2026-02-01')
    await user.clear(dueDate)
    await user.type(dueDate, '2026-02-28')

    await user.click(within(form).getByText('Create Set'))

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Could not save goal set.')
      expect(warnSpy).toHaveBeenCalled()
    })

    warnSpy.mockRestore()
  })

  it('should block zone goals without a zone and warn on invalid end date', async () => {
    const user = userEvent.setup()
    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('January Goals')).toBeInTheDocument()
    })

    const addGoalSection = getSectionByTitle('Add Goal to Set')
    await user.click(within(addGoalSection).getByText('Add Goal to Set'))

    const setSelect = getSelectByOptionText(addGoalSection, 'Select Goal Set')
    await user.selectOptions(setSelect, baseSet.id)

    await user.type(
      getInputByPlaceholder('Goal Name (e.g., FG% by Zone)', addGoalSection),
      'My Zone Goal'
    )
    await user.type(
      getInputByPlaceholder('Details (e.g., Left Wing 3s · 30 days)', addGoalSection),
      'Some details'
    )

    const [goalEndDate] = getDateInputs(addGoalSection)
    await user.clear(goalEndDate)
    await user.type(goalEndDate, '2026-02-15')

    await user.type(
      getInputByPlaceholder('Target Value (e.g., 44)', addGoalSection),
      '35'
    )
    const targetTypeSelect = getSelectByOptionText(addGoalSection, 'Total')
    await user.selectOptions(targetTypeSelect, 'total')

    const form = within(addGoalSection).getByText('Add Goal').closest('form')
    fireEvent.submit(form)

    expect(window.alert).toHaveBeenCalledWith(
      'Please select a zone for this zone-based goal.'
    )

    const zoneSelect = getSelectByOptionText(addGoalSection, 'Select Zone')
    await user.selectOptions(zoneSelect, 'left_corner_3')
    fireEvent.submit(form)

    expect(window.alert).toHaveBeenCalledWith(
      'Target end date cannot be after the goal set due date.'
    )
  })

  it('should hide zone selector when switching to a non-zone metric', async () => {
    const user = userEvent.setup()
    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('January Goals')).toBeInTheDocument()
    })

    const addGoalSection = getSectionByTitle('Add Goal to Set')
    await user.click(within(addGoalSection).getByText('Add Goal to Set'))

    const setSelect = getSelectByOptionText(addGoalSection, 'Select Goal Set')
    await user.selectOptions(setSelect, baseSet.id)

    const zoneSelect = getSelectByOptionText(addGoalSection, 'Select Zone')
    await user.selectOptions(zoneSelect, 'left_corner_3')

    const metricSelect = getSelectByOptionText(addGoalSection, 'Makes (count)')
    await user.selectOptions(metricSelect, 'makes')

    expect(within(addGoalSection).queryByText('Select Zone')).not.toBeInTheDocument()
  })

  it('should render archived goals with progress but no delete action', async () => {
    listGoalSetsWithGoals.mockResolvedValue([
      {
        ...baseSet,
        id: 'arch-2',
        name: 'Archived Goals',
        archived: true,
        goals: [
          {
            id: 'goal-arch',
            name: 'Points Goal',
            details: '',
            metric: 'points_total',
            target_value: 10,
            target_end_date: '2026-01-15',
            target_type: 'total',
            zone_id: null,
          },
        ],
      },
    ])

    const user = userEvent.setup()
    render(<GoalsManager />)

    const archivedSection = getSectionByTitle('Archived Goal Sets')
    await user.click(within(archivedSection).getByText('Archived Goal Sets'))

    const archivedHeader = screen.getByText('Archived Goals').closest('[role="button"]')
    archivedHeader.focus()
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Points Goal')).toBeInTheDocument()
      expect(screen.getByText('Target: 10 · Value: 20')).toBeInTheDocument()
    })

    expect(screen.queryByLabelText('Delete goal')).not.toBeInTheDocument()
  })

  it('should alert when deleting a goal set fails', async () => {
    const user = userEvent.setup()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    deleteGoalSet.mockRejectedValue(new Error('fail'))

    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('January Goals')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('January Goals').closest('[role="button"]')
    const setCard = setHeader.closest('.rounded-2xl')
    await user.click(within(setCard).getByLabelText('Delete goal set'))

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Could not delete goal set.')
      expect(warnSpy).toHaveBeenCalled()
    })

    warnSpy.mockRestore()
  })

  it('should alert when archiving a goal set fails', async () => {
    const user = userEvent.setup()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    archiveGoalSet.mockRejectedValue(new Error('fail'))

    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('January Goals')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('January Goals').closest('[role="button"]')
    const setCard = setHeader.closest('.rounded-2xl')
    await user.click(within(setCard).getByLabelText('Archive goal set'))

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Could not archive goal set.')
      expect(warnSpy).toHaveBeenCalled()
    })

    warnSpy.mockRestore()
  })

  it('should not submit add goal when required fields are missing', async () => {
    const user = userEvent.setup()
    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('January Goals')).toBeInTheDocument()
    })

    const addGoalSection = getSectionByTitle('Add Goal to Set')
    await user.click(within(addGoalSection).getByText('Add Goal to Set'))

    const form = within(addGoalSection).getByText('Add Goal').closest('form')
    fireEvent.submit(form)

    expect(createGoal).not.toHaveBeenCalled()
  })

  it('should alert when adding a goal fails', async () => {
    const user = userEvent.setup()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    createGoal.mockRejectedValue(new Error('fail'))

    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('January Goals')).toBeInTheDocument()
    })

    const addGoalSection = getSectionByTitle('Add Goal to Set')
    await user.click(within(addGoalSection).getByText('Add Goal to Set'))

    const setSelect = getSelectByOptionText(addGoalSection, 'Select Goal Set')
    await user.selectOptions(setSelect, baseSet.id)

    const zoneSelect = getSelectByOptionText(addGoalSection, 'Select Zone')
    await user.selectOptions(zoneSelect, 'left_corner_3')

    const [goalEndDate] = getDateInputs(addGoalSection)
    await user.clear(goalEndDate)
    await user.type(goalEndDate, '2026-01-20')

    await user.type(
      getInputByPlaceholder('Target Value (e.g., 44)', addGoalSection),
      '40'
    )

    await user.click(within(addGoalSection).getByText('Add Goal'))

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Could not add goal.')
      expect(warnSpy).toHaveBeenCalled()
    })

    warnSpy.mockRestore()
  })

  it('should alert when deleting a goal fails', async () => {
    const user = userEvent.setup()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    deleteGoal.mockRejectedValue(new Error('fail'))
    listGoalSetsWithGoals.mockResolvedValue([
      {
        ...baseSet,
        goals: [
          {
            id: 'goal-fail',
            name: 'Goal Fail',
            details: '',
            metric: 'makes',
            target_value: 10,
            target_end_date: '2026-01-10',
            target_type: 'total',
          },
        ],
      },
    ])

    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('January Goals')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('January Goals').closest('[role="button"]')
    await user.click(setHeader)

    await user.click(screen.getByLabelText('Delete goal'))

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Could not delete goal.')
      expect(warnSpy).toHaveBeenCalled()
    })

    warnSpy.mockRestore()
  })

  it('should toggle an active set with keyboard controls', async () => {
    const user = userEvent.setup()
    listGoalSetsWithGoals.mockResolvedValue([{ ...baseSet, goals: [] }])

    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('January Goals')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('January Goals').closest('[role="button"]')
    fireEvent.keyDown(setHeader, { key: ' ' })

    await waitFor(() => {
      expect(screen.getByText('No goals yet in this set.')).toBeInTheDocument()
    })
  })

  it('should show target dash when goal target is zero', async () => {
    listGoalSetsWithGoals.mockResolvedValue([
      {
        ...baseSet,
        id: 'set-zero',
        name: 'Zero Target',
        goals: [
          {
            id: 'goal-zero',
            name: '',
            details: '',
            metric: 'makes',
            target_value: 0,
            target_end_date: '',
            target_type: 'total',
            zone_id: null,
          },
        ],
      },
    ])

    const user = userEvent.setup()
    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('Zero Target')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('Zero Target').closest('[role="button"]')
    await user.click(setHeader)

    await waitFor(() => {
      expect(screen.getByText('Target: — · Value: 20')).toBeInTheDocument()
    })
  })

  it('should show percent target for percent metrics even when target type is total', async () => {
    listGoalSetsWithGoals.mockResolvedValue([
      {
        ...baseSet,
        id: 'set-game',
        name: 'Game Goal Set',
        type: 'game',
        goals: [
          {
            id: 'goal-percent',
            name: 'Zone FG%',
            details: '',
            metric: 'fg_pct_zone',
            target_value: 45,
            target_end_date: '2026-01-10',
            target_type: 'total',
            zone_id: 'left_corner_3',
          },
        ],
      },
    ])

    const user = userEvent.setup()
    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('Game Goal Set')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('Game Goal Set').closest('[role="button"]')
    await user.click(setHeader)

    await waitFor(() => {
      expect(screen.getByText('Target: 45% · Value: 12%')).toBeInTheDocument()
    })
  })

  it('should show percent labels for count metrics when target type is percent', async () => {
    listGoalSetsWithGoals.mockResolvedValue([
      {
        ...baseSet,
        id: 'set-practice',
        name: 'Practice Percent Target',
        type: 'practice',
        goals: [
          {
            id: 'goal-count-percent',
            name: 'Makes Percent',
            details: '',
            metric: 'makes',
            target_value: 60,
            target_end_date: '2026-01-12',
            target_type: 'percent',
            zone_id: null,
          },
        ],
      },
    ])

    const user = userEvent.setup()
    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('Practice Percent Target')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('Practice Percent Target').closest('[role="button"]')
    await user.click(setHeader)

    await waitFor(() => {
      expect(screen.getByText('Target: 60% · Value: 20%')).toBeInTheDocument()
    })
  })

  it('should show percent labels for game-only count metrics when target type is percent', async () => {
    listGoalSetsWithGoals.mockResolvedValue([
      {
        ...baseSet,
        id: 'set-game-percent',
        name: 'Game Percent Target',
        type: 'game',
        goals: [
          {
            id: 'goal-points-percent',
            name: 'Points Percent',
            details: '',
            metric: 'points_total',
            target_value: 65,
            target_end_date: '2026-01-18',
            target_type: 'percent',
            zone_id: null,
          },
        ],
      },
    ])

    const user = userEvent.setup()
    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('Game Percent Target')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('Game Percent Target').closest('[role="button"]')
    await user.click(setHeader)

    await waitFor(() => {
      expect(screen.getByText('Target: 65% · Value: 12%')).toBeInTheDocument()
    })
  })

  it('should show numeric labels for zone count metrics when target type is total', async () => {
    listGoalSetsWithGoals.mockResolvedValue([
      {
        ...baseSet,
        id: 'set-practice-total',
        name: 'Practice Total Target',
        type: 'practice',
        goals: [
          {
            id: 'goal-attempts-zone',
            name: 'Zone Attempts',
            details: '',
            metric: 'attempts_zone',
            target_value: 30,
            target_end_date: '2026-01-22',
            target_type: 'total',
            zone_id: 'left_corner_3',
          },
        ],
      },
    ])

    const user = userEvent.setup()
    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('Practice Total Target')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('Practice Total Target').closest('[role="button"]')
    await user.click(setHeader)

    await waitFor(() => {
      expect(screen.getByText('Target: 30 · Value: 20')).toBeInTheDocument()
    })
  })

  it('should show numeric labels for game-only metrics when target type is total', async () => {
    listGoalSetsWithGoals.mockResolvedValue([
      {
        ...baseSet,
        id: 'set-game-total',
        name: 'Game Total Target',
        type: 'game',
        goals: [
          {
            id: 'goal-points-total',
            name: 'Points Total',
            details: '',
            metric: 'points_total',
            target_value: 25,
            target_end_date: '2026-01-24',
            target_type: 'total',
            zone_id: null,
          },
        ],
      },
    ])

    const user = userEvent.setup()
    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('Game Total Target')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('Game Total Target').closest('[role="button"]')
    await user.click(setHeader)

    await waitFor(() => {
      expect(screen.getByText('Target: 25 · Value: 12')).toBeInTheDocument()
    })
  })

  it('should show percent labels for percent metrics when target type is percent', async () => {
    listGoalSetsWithGoals.mockResolvedValue([
      {
        ...baseSet,
        id: 'set-percent-default',
        name: 'Percent Default',
        type: 'practice',
        goals: [
          {
            id: 'goal-percent-default',
            name: 'Zone FG% Default',
            details: '',
            metric: 'fg_pct_zone',
            target_value: 55,
            target_end_date: '2026-01-26',
            target_type: 'percent',
            zone_id: 'left_corner_3',
          },
        ],
      },
    ])

    const user = userEvent.setup()
    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('Percent Default')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('Percent Default').closest('[role="button"]')
    await user.click(setHeader)

    await waitFor(() => {
      expect(screen.getByText('Target: 55% · Value: 20%')).toBeInTheDocument()
    })
  })

  it('should show numeric labels for count metrics when target type is total', async () => {
    listGoalSetsWithGoals.mockResolvedValue([
      {
        ...baseSet,
        id: 'set-count-total',
        name: 'Count Total',
        type: 'practice',
        goals: [
          {
            id: 'goal-count-total',
            name: 'Makes Total',
            details: '',
            metric: 'makes',
            target_value: 18,
            target_end_date: '2026-01-28',
            target_type: 'total',
            zone_id: null,
          },
        ],
      },
    ])

    const user = userEvent.setup()
    render(<GoalsManager />)

    await waitFor(() => {
      expect(screen.getByText('Count Total')).toBeInTheDocument()
    })

    const setHeader = screen.getByText('Count Total').closest('[role="button"]')
    await user.click(setHeader)

    await waitFor(() => {
      expect(screen.getByText('Target: 18 · Value: 20')).toBeInTheDocument()
    })
  })
})
