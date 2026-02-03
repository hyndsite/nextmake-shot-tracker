// src/screens/__tests__/PracticeLog.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PracticeLog from '../PracticeLog.jsx'

vi.mock('../../lib/practice-db', () => ({
  addPracticeSession: vi.fn(),
  endPracticeSession: vi.fn(),
  listPracticeSessions: vi.fn(),
  addEntry: vi.fn(),
  listEntriesBySession: vi.fn(),
  addMarker: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
}))

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
  Edit2: () => <div data-testid="edit-icon">Edit2</div>,
  Trash2: () => <div data-testid="trash-icon">Trash2</div>,
  X: () => <div data-testid="x-icon">X</div>,
}))

import {
  addEntry,
  addMarker,
  deleteEntry,
  listEntriesBySession,
  listPracticeSessions,
  updateEntry,
} from '../../lib/practice-db'

describe('PracticeLog Component', () => {
  let mockNavigate
  const mockSession = {
    id: 'practice-1',
    started_at: '2025-01-15T10:00:00Z',
    ended_at: null,
    status: 'active',
  }

  beforeEach(() => {
    mockNavigate = vi.fn()
    listPracticeSessions.mockResolvedValue([mockSession])
    listEntriesBySession.mockResolvedValue([])
    addEntry.mockResolvedValue({ id: 'entry-1' })
    addMarker.mockResolvedValue({ id: 'marker-1' })
    updateEntry.mockResolvedValue({ id: 'entry-1' })
    deleteEntry.mockResolvedValue({ id: 'entry-1' })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('renders header and active session card', async () => {
    const { container } = render(<PracticeLog navigate={mockNavigate} />)

    expect(screen.getByText('Practice Sessions')).toBeInTheDocument()
    expect(
      screen.getByText('Record drills quickly; save batches for analytics and goals.')
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(listPracticeSessions).toHaveBeenCalled()
    })

    expect(screen.getByText('Active Session')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'End active session' })).toBeInTheDocument()
  })

  it('calculates and displays running eFG, attempts, and makes', async () => {
    listEntriesBySession.mockResolvedValue([
      {
        id: 'entry-1',
        session_id: 'practice-1',
        zone_id: 'left_corner_3',
        shot_type: 'catch_shoot',
        attempts: 6,
        makes: 3,
        ts: '2025-01-15T10:01:00Z',
      },
      {
        id: 'entry-2',
        session_id: 'practice-1',
        zone_id: 'center_mid',
        shot_type: 'off_dribble',
        attempts: 4,
        makes: 2,
        ts: '2025-01-15T10:02:00Z',
      },
    ])

    const { container } = render(<PracticeLog navigate={mockNavigate} />)

    await waitFor(() => {
      expect(listEntriesBySession).toHaveBeenCalledWith('practice-1')
    })

    await waitFor(() => {
      expect(screen.getByText(/65\.0/)).toBeInTheDocument()
    })

    const efgValue = screen.getByText(/65\.0/).parentElement
    expect(efgValue).toHaveTextContent('65.0%')
    const shotsBlock = screen.getByText('Total Shots:').parentElement
    const makesBlock = screen.getByText('Total Makes:').parentElement
    expect(shotsBlock).toHaveTextContent('10')
    expect(makesBlock).toHaveTextContent('5')
  })

  it('saves a layup entry with pickup/finish metadata and marks a set', async () => {
    const user = userEvent.setup()

    const { container } = render(<PracticeLog navigate={mockNavigate} />)

    await waitFor(() => {
      expect(listPracticeSessions).toHaveBeenCalled()
    })

    const [zoneSelect, shotTypeSelect] = screen.getAllByRole('combobox')
    await user.selectOptions(shotTypeSelect, 'layup')

    await user.click(screen.getByRole('button', { name: 'High' }))
    await user.click(screen.getByRole('button', { name: 'Overhand' }))
    await user.click(screen.getByRole('button', { name: 'Uncontested' }))

    const [attemptsInput, makesInput] = screen.getAllByRole('spinbutton')
    await user.clear(attemptsInput)
    await user.type(attemptsInput, '5')
    await user.clear(makesInput)
    await user.type(makesInput, '3')

    await user.click(screen.getByRole('button', { name: 'Save & Mark Set' }))

    await waitFor(() => {
      expect(addEntry).toHaveBeenCalled()
    })

    expect(addEntry).toHaveBeenCalledWith({
      sessionId: 'practice-1',
      zoneId: zoneSelect.value,
      shotType: 'layup',
      contested: true,
      attempts: 5,
      makes: 3,
      ts: expect.any(String),
      pickupType: 'high_pickup',
      finishType: 'overhand',
    })
    expect(addMarker).toHaveBeenCalledWith({ sessionId: 'practice-1', label: 'Set' })
    expect(attemptsInput.value).toBe('')
    expect(makesInput.value).toBe('')
  })

  it('disables shot type and contested for free throws and saves with null shot type', async () => {
    const user = userEvent.setup()

    const { container } = render(<PracticeLog navigate={mockNavigate} />)

    await waitFor(() => {
      expect(listPracticeSessions).toHaveBeenCalled()
    })

    const [zoneSelect, shotTypeSelect] = screen.getAllByRole('combobox')
    await user.selectOptions(zoneSelect, 'free_throw')

    expect(shotTypeSelect).toBeDisabled()
    expect(screen.getByRole('button', { name: 'N/A' })).toBeDisabled()

    const [attemptsInput, makesInput] = screen.getAllByRole('spinbutton')
    await user.clear(attemptsInput)
    await user.type(attemptsInput, '2')
    await user.clear(makesInput)
    await user.type(makesInput, '1')

    await user.click(screen.getByRole('button', { name: 'Save & Mark Set' }))

    await waitFor(() => {
      expect(addEntry).toHaveBeenCalled()
    })

    expect(addEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        zoneId: 'free_throw',
        shotType: null,
        contested: false,
        attempts: 2,
        makes: 1,
      })
    )
  })

  it('opens edit modal and updates an entry', async () => {
    const user = userEvent.setup()
    listEntriesBySession.mockResolvedValue([
      {
        id: 'entry-1',
        session_id: 'practice-1',
        zone_id: 'left_corner_3',
        shot_type: 'catch_shoot',
        contested: false,
        attempts: 4,
        makes: 2,
        ts: '2025-01-15T10:01:00Z',
      },
    ])

    render(<PracticeLog navigate={mockNavigate} />)

    await waitFor(() => {
      expect(listEntriesBySession).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('button', { name: 'Edit practice entry' }))
    expect(screen.getByText('Edit Practice Entry')).toBeInTheDocument()

    const editInputs = screen.getAllByRole('spinbutton')
    const editAttemptsInput = editInputs[editInputs.length - 2]
    const editMakesInput = editInputs[editInputs.length - 1]

    await user.clear(editAttemptsInput)
    await user.type(editAttemptsInput, '6')
    await user.clear(editMakesInput)
    await user.type(editMakesInput, '4')

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(updateEntry).toHaveBeenCalled()
    })

    expect(updateEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'entry-1',
        sessionId: 'practice-1',
        zoneId: 'left_corner_3',
        shotType: 'catch_shoot',
        contested: false,
        attempts: 6,
        makes: 4,
      })
    )
  })

  it('deletes an entry from the delete modal', async () => {
    const user = userEvent.setup()
    listEntriesBySession.mockResolvedValue([
      {
        id: 'entry-1',
        session_id: 'practice-1',
        zone_id: 'left_corner_3',
        shot_type: 'catch_shoot',
        contested: false,
        attempts: 4,
        makes: 2,
        ts: '2025-01-15T10:01:00Z',
      },
    ])

    render(<PracticeLog navigate={mockNavigate} />)

    await waitFor(() => {
      expect(listEntriesBySession).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('button', { name: 'Delete practice entry' }))
    expect(screen.getByText('Delete Practice Entry')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'OK' }))

    await waitFor(() => {
      expect(deleteEntry).toHaveBeenCalledWith('entry-1')
    })
  })

  it('allows editing layup pickup/finish toggles and contested state', async () => {
    const user = userEvent.setup()
    listEntriesBySession.mockResolvedValue([
      {
        id: 'entry-1',
        session_id: 'practice-1',
        zone_id: 'left_corner_3',
        shot_type: 'layup',
        contested: false,
        attempts: 4,
        makes: 2,
        pickup_type: 'high_pickup',
        finish_type: 'overhand',
        ts: '2025-01-15T10:01:00Z',
      },
    ])

    render(<PracticeLog navigate={mockNavigate} />)

    await waitFor(() => {
      expect(listEntriesBySession).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('button', { name: 'Edit practice entry' }))

    const pickupButton = screen.getByRole('button', { name: 'High' })
    const finishButton = screen.getByRole('button', { name: 'Overhand' })
    const contestedButtons = screen.getAllByRole('button', { name: 'Uncontested' })
    const contestedButton = contestedButtons[contestedButtons.length - 1]

    expect(pickupButton.className).toContain('btn-emerald')
    expect(finishButton.className).toContain('btn-emerald')

    await user.click(pickupButton)
    await user.click(finishButton)
    expect(pickupButton.className).toContain('btn-outline-emerald')
    expect(finishButton.className).toContain('btn-outline-emerald')

    await user.click(contestedButton)
    expect(screen.getByRole('button', { name: 'Contested' })).toBeInTheDocument()
  })

  it('closes edit and delete modals with Cancel', async () => {
    const user = userEvent.setup()
    listEntriesBySession.mockResolvedValue([
      {
        id: 'entry-1',
        session_id: 'practice-1',
        zone_id: 'left_corner_3',
        shot_type: 'catch_shoot',
        contested: false,
        attempts: 4,
        makes: 2,
        ts: '2025-01-15T10:01:00Z',
      },
    ])

    const { container } = render(<PracticeLog navigate={mockNavigate} />)

    await waitFor(() => {
      expect(listEntriesBySession).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('button', { name: 'Edit practice entry' }))
    expect(screen.getByText('Edit Practice Entry')).toBeInTheDocument()

    const overlays = container.querySelectorAll('div[aria-hidden="true"]')
    await user.click(overlays[overlays.length - 1])
    expect(screen.queryByText('Edit Practice Entry')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit practice entry' }))
    expect(screen.getByText('Edit Practice Entry')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('Edit Practice Entry')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete practice entry' }))
    expect(screen.getByText('Delete Practice Entry')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByText('Delete Practice Entry')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete practice entry' }))
    expect(screen.getByText('Delete Practice Entry')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('Delete Practice Entry')).not.toBeInTheDocument()
  })

  it('clears pickup and finish selections when edit shot type changes off layup', async () => {
    const user = userEvent.setup()
    listEntriesBySession.mockResolvedValue([
      {
        id: 'entry-1',
        session_id: 'practice-1',
        zone_id: 'left_corner_3',
        shot_type: 'layup',
        contested: false,
        attempts: 4,
        makes: 2,
        pickup_type: 'high_pickup',
        finish_type: 'overhand',
        ts: '2025-01-15T10:01:00Z',
      },
    ])

    render(<PracticeLog navigate={mockNavigate} />)

    await waitFor(() => {
      expect(listEntriesBySession).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('button', { name: 'Edit practice entry' }))

    expect(screen.getByRole('button', { name: 'High' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Overhand' })).toBeInTheDocument()

    const editShotTypeSelect = screen.getAllByRole('combobox')[3]
    await user.selectOptions(editShotTypeSelect, 'off_dribble')

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'High' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Overhand' })).not.toBeInTheDocument()
    })
  })

  it('adjusts makes via controls and blocks save when invalid', async () => {
    const user = userEvent.setup()
    render(<PracticeLog navigate={mockNavigate} />)

    await waitFor(() => {
      expect(listPracticeSessions).toHaveBeenCalled()
    })

    const [attemptsInput, makesInput] = screen.getAllByRole('spinbutton')

    await user.click(screen.getByRole('button', { name: 'Add 5 makes' }))
    expect(makesInput).toHaveValue(5)

    await user.click(screen.getByRole('button', { name: 'Decrease makes' }))
    expect(makesInput).toHaveValue(4)

    await user.click(screen.getByRole('button', { name: 'Increase makes' }))
    expect(makesInput).toHaveValue(5)

    await user.clear(attemptsInput)
    await user.type(attemptsInput, '3')
    await user.clear(makesInput)
    await user.type(makesInput, '4')

    const saveButton = screen.getByRole('button', { name: 'Save & Mark Set' })
    expect(saveButton).toBeDisabled()
  })

  it('updates attempts controls and clears layup extras when changing shot type', async () => {
    const user = userEvent.setup()
    render(<PracticeLog navigate={mockNavigate} />)

    await waitFor(() => {
      expect(listPracticeSessions).toHaveBeenCalled()
    })

    const [attemptsInput] = screen.getAllByRole('spinbutton')

    await user.click(screen.getByRole('button', { name: 'Add 5 attempts' }))
    expect(attemptsInput).toHaveValue(5)

    await user.click(screen.getByRole('button', { name: 'Decrease attempts' }))
    expect(attemptsInput).toHaveValue(4)

    await user.click(screen.getByRole('button', { name: 'Increase attempts' }))
    expect(attemptsInput).toHaveValue(5)

    const shotTypeSelect = screen.getAllByRole('combobox')[1]
    await user.selectOptions(shotTypeSelect, 'layup')

    expect(screen.getByRole('button', { name: 'High' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Overhand' })).toBeInTheDocument()

    await user.selectOptions(shotTypeSelect, 'catch_shoot')

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'High' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Overhand' })).not.toBeInTheDocument()
    })
  })

  it('navigates back and supports switching between active sessions', async () => {
    const user = userEvent.setup()
    listPracticeSessions.mockResolvedValue([
      {
        id: 'practice-1',
        started_at: '2025-01-15T10:00:00Z',
        ended_at: null,
        status: 'active',
      },
      {
        id: 'practice-2',
        started_at: '2025-01-16T10:00:00Z',
        ended_at: null,
        status: 'active',
      },
    ])
    listEntriesBySession.mockResolvedValue([])

    render(<PracticeLog navigate={mockNavigate} />)

    await waitFor(() => {
      expect(listPracticeSessions).toHaveBeenCalled()
    })

    const sessionSelect = screen.getByRole('combobox', {
      name: 'Switch active session',
    })
    await user.selectOptions(sessionSelect, 'practice-2')

    await waitFor(() => {
      expect(listEntriesBySession).toHaveBeenCalledWith('practice-2')
    })

    await user.click(screen.getByRole('button', { name: /Back/ }))
    expect(mockNavigate).toHaveBeenCalledWith('gate')
  })

  it('closes delete modal without deleting when no active session exists', async () => {
    const user = userEvent.setup()
    listPracticeSessions.mockResolvedValue([])
    listEntriesBySession.mockResolvedValue([
      {
        id: 'entry-1',
        session_id: 'missing-session',
        zone_id: 'left_corner_3',
        shot_type: 'catch_shoot',
        contested: false,
        attempts: 4,
        makes: 2,
        ts: '2025-01-15T10:01:00Z',
      },
    ])

    render(<PracticeLog id="missing-session" navigate={mockNavigate} />)

    await waitFor(() => {
      expect(listEntriesBySession).toHaveBeenCalledWith('missing-session')
    })

    await user.click(screen.getByRole('button', { name: 'Delete practice entry' }))
    expect(screen.getByText('Delete Practice Entry')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(deleteEntry).not.toHaveBeenCalled()
    expect(screen.queryByText('Delete Practice Entry')).not.toBeInTheDocument()
  })

  it('clears edit fields when switching edit zone to free throw', async () => {
    const user = userEvent.setup()
    listEntriesBySession.mockResolvedValue([
      {
        id: 'entry-1',
        session_id: 'practice-1',
        zone_id: 'left_corner_3',
        shot_type: 'layup',
        contested: true,
        attempts: 4,
        makes: 2,
        pickup_type: 'high_pickup',
        finish_type: 'overhand',
        ts: '2025-01-15T10:01:00Z',
      },
    ])

    render(<PracticeLog navigate={mockNavigate} />)

    await waitFor(() => {
      expect(listEntriesBySession).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('button', { name: 'Edit practice entry' }))

    const editZoneSelect = screen.getAllByRole('combobox')[2]
    await user.selectOptions(editZoneSelect, 'free_throw')

    const editShotTypeSelect = screen.getAllByRole('combobox')[3]
    expect(editShotTypeSelect).toBeDisabled()
    expect(editShotTypeSelect).toHaveValue('catch_shoot')

    expect(screen.queryByRole('button', { name: 'High' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Overhand' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'N/A' }).length).toBeGreaterThan(0)
  })
})
