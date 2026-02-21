// src/screens/__tests__/PracticeGate.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PracticeGate from '../PracticeGate.jsx'

vi.mock('../../lib/practice-db', () => ({
  addPracticeSession: vi.fn(),
  deletePracticeSession: vi.fn(),
  listPracticeSessions: vi.fn(),
  listActivePracticeSessions: vi.fn(),
}))

vi.mock('../../lib/athlete-db', () => ({
  listAthletes: vi.fn(),
  getActiveAthleteId: vi.fn(),
  setActiveAthlete: vi.fn(),
}))

vi.mock('lucide-react', () => ({
  Play: () => <div data-testid="play-icon">Play</div>,
  PlayCircle: () => <div data-testid="play-circle-icon">Play</div>,
  Trash2: () => <div data-testid="trash-icon">Trash</div>,
  ChevronDown: () => <div data-testid="chevron-icon">Chevron</div>,
  ArrowLeftRight: () => <div data-testid="switch-athlete-icon">Switch</div>,
}))

import {
  addPracticeSession,
  deletePracticeSession,
  listPracticeSessions,
  listActivePracticeSessions,
} from '../../lib/practice-db'
import {
  listAthletes,
  getActiveAthleteId,
  setActiveAthlete,
} from '../../lib/athlete-db'

const buildSession = (overrides = {}) => ({
  id: `session-${Math.random().toString(16).slice(2)}`,
  started_at: '2026-01-15T10:00:00Z',
  ...overrides,
})

describe('PracticeGate Component', () => {
  let mockNavigate

  beforeEach(() => {
    mockNavigate = vi.fn()
    listPracticeSessions.mockResolvedValue([])
    listActivePracticeSessions.mockResolvedValue([])
    listAthletes.mockReturnValue([
      { id: 'ath-1', first_name: 'Max', last_name: 'McCarty' },
      { id: 'ath-2', first_name: 'Jane', last_name: 'Doe' },
    ])
    getActiveAthleteId.mockReturnValue('ath-1')
    addPracticeSession.mockResolvedValue(buildSession())
    deletePracticeSession.mockResolvedValue({})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render empty state when there are no previous sessions', async () => {
    render(<PracticeGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(listPracticeSessions).toHaveBeenCalled()
    })

    expect(screen.getByText('Practice Sessions')).toBeInTheDocument()
    expect(screen.getByText('No previous sessions yet.')).toBeInTheDocument()
  })

  it('should disable Resume Active Session button when no active session exists', async () => {
    render(<PracticeGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(listActivePracticeSessions).toHaveBeenCalled()
    })

    expect(screen.getByText('Resume Active Session')).toBeDisabled()
  })

  it('should start a new session and navigate to practice-log when no active session', async () => {
    const row = buildSession({ id: 'new-session', started_at: '2026-01-20T09:00:00Z' })
    addPracticeSession.mockResolvedValue(row)
    listPracticeSessions.mockResolvedValue([row])

    const user = userEvent.setup()
    render(<PracticeGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(listPracticeSessions).toHaveBeenCalled()
    })

    await user.click(screen.getByText('Start New Session'))
    await user.click(screen.getByRole('button', { name: 'Start session for active athlete' }))

    await waitFor(() => {
      expect(addPracticeSession).toHaveBeenCalledWith({ athlete_id: 'ath-1' })
      expect(mockNavigate).toHaveBeenCalledWith('practice-log', {
        id: 'new-session',
        started_at: '2026-01-20T09:00:00Z',
      })
    })
  })

  it('should allow switching athlete before starting session', async () => {
    const row = buildSession({ id: 'new-ath-2', started_at: '2026-01-20T09:30:00Z' })
    addPracticeSession.mockResolvedValue(row)
    const user = userEvent.setup()
    render(<PracticeGate navigate={mockNavigate} />)

    await user.click(screen.getByText('Start New Session'))
    await user.click(screen.getByRole('button', { name: 'Switch athlete for session' }))
    await user.click(screen.getByRole('button', { name: 'Jane Doe' }))
    await user.click(screen.getByRole('button', { name: 'Start session for active athlete' }))

    await waitFor(() => {
      expect(setActiveAthlete).toHaveBeenCalledWith('ath-2')
      expect(addPracticeSession).toHaveBeenCalledWith({ athlete_id: 'ath-2' })
      expect(mockNavigate).toHaveBeenCalledWith('practice-log', {
        id: 'new-ath-2',
        started_at: '2026-01-20T09:30:00Z',
      })
    })
  })

  it('should replace start button with chooser and restore on outside click', async () => {
    const user = userEvent.setup()
    render(<PracticeGate navigate={mockNavigate} />)

    await user.click(screen.getByText('Start New Session'))

    expect(screen.queryByText('Start New Session')).not.toBeInTheDocument()
    expect(screen.getByText('Active athlete')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start session for active athlete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Switch athlete for session' })).toBeInTheDocument()

    await user.click(screen.getByText('Previous Sessions'))

    expect(screen.getByText('Start New Session')).toBeInTheDocument()
    expect(screen.queryByText('Active athlete')).not.toBeInTheDocument()
  })

  it('should resume the active session when resume is clicked', async () => {
    const activeSession = buildSession({
      id: 'active-1',
      started_at: '2026-01-21T10:00:00Z',
    })
    listPracticeSessions.mockResolvedValue([activeSession])
    listActivePracticeSessions.mockResolvedValue([activeSession])

    const user = userEvent.setup()
    render(<PracticeGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Resume Active Session')).toBeEnabled()
    })

    await user.click(screen.getByText('Resume Active Session'))

    expect(mockNavigate).toHaveBeenCalledWith('practice-log', {
      id: 'active-1',
      started_at: '2026-01-21T10:00:00Z',
    })
  })

  it('should prompt to resume when selected athlete already has an active session', async () => {
    const activeSession = buildSession({
      id: 'active-2',
      started_at: '2026-01-21T11:00:00Z',
      athlete_id: 'ath-1',
    })
    listPracticeSessions.mockResolvedValue([activeSession])
    listActivePracticeSessions.mockResolvedValue(activeSession ? [activeSession] : [])

    const user = userEvent.setup()
    render(<PracticeGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Resume Active Session')).toBeEnabled()
    })

    await user.click(screen.getByText('Start New Session'))
    await user.click(screen.getByRole('button', { name: 'Start session for active athlete' }))

    expect(addPracticeSession).not.toHaveBeenCalled()
    expect(screen.getByText('Active Session Found')).toBeInTheDocument()
    expect(
      screen.getByText(
        'This athlete already has an active session. Please resume that session instead of starting a new one.'
      )
    ).toBeInTheDocument()

    await user.click(screen.getByText('Resume Existing Session'))
    expect(mockNavigate).toHaveBeenCalledWith('practice-log', {
      id: 'active-2',
      started_at: '2026-01-21T11:00:00Z',
    })
  })

  it('should allow starting a new session for a different athlete', async () => {
    const activeSessionForAth1 = buildSession({
      id: 'active-3',
      started_at: '2026-01-22T10:00:00Z',
      athlete_id: 'ath-1',
    })
    const newSessionForAth2 = buildSession({
      id: 'new-2',
      started_at: '2026-01-22T10:30:00Z',
      athlete_id: 'ath-2',
    })

    listPracticeSessions.mockResolvedValue([activeSessionForAth1, newSessionForAth2])
    listActivePracticeSessions.mockResolvedValue([])
    listActivePracticeSessions.mockResolvedValueOnce([activeSessionForAth1])
    listActivePracticeSessions.mockResolvedValueOnce([])
    addPracticeSession.mockResolvedValue(newSessionForAth2)

    const user = userEvent.setup()
    render(<PracticeGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Resume Active Session')).toBeEnabled()
    })

    await user.click(screen.getByText('Start New Session'))
    await user.click(screen.getByRole('button', { name: 'Switch athlete for session' }))
    await user.click(screen.getByRole('button', { name: 'Jane Doe' }))
    await user.click(screen.getByRole('button', { name: 'Start session for active athlete' }))

    await waitFor(() => {
      expect(addPracticeSession).toHaveBeenCalledWith({ athlete_id: 'ath-2' })
      expect(mockNavigate).toHaveBeenCalledWith('practice-log', {
        id: 'new-2',
        started_at: '2026-01-22T10:30:00Z',
      })
    })
    expect(screen.queryByText('Active Session Found')).not.toBeInTheDocument()
  })

  it('should show no-athlete message and disable start in chooser', async () => {
    listAthletes.mockReturnValue([])
    getActiveAthleteId.mockReturnValue(null)
    const user = userEvent.setup()
    render(<PracticeGate navigate={mockNavigate} />)

    await user.click(screen.getByText('Start New Session'))
    expect(screen.getByText('No active athlete')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start session for active athlete' })).toBeDisabled()
  })

  it('should toggle month accordion and open a previous session', async () => {
    const janSession = buildSession({
      id: 'jan-1',
      started_at: '2026-01-10T10:00:00Z',
    })
    listPracticeSessions.mockResolvedValue([janSession])

    const user = userEvent.setup()
    render(<PracticeGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Previous Sessions')).toBeInTheDocument()
    })

    const monthButton = screen.getByRole('button', { name: /january/i })
    const monthContainer = monthButton.closest('div')
    expect(monthContainer.className).toContain('rounded-2xl')
    expect(monthContainer.className).toContain('border-slate-200')
    expect(monthButton.className).toContain('accordion-header')
    await user.click(monthButton)

    const sessionRow = screen.getByRole('button', { name: 'Open session' })
    const expectedDay = new Date(janSession.started_at).toLocaleDateString(undefined, {
      weekday: 'long',
    })
    const expectedDate = new Date(janSession.started_at).toLocaleDateString()
    expect(sessionRow).toHaveTextContent(`${expectedDay} | ${expectedDate}`)
    await user.click(sessionRow)

    expect(mockNavigate).toHaveBeenCalledWith('practice-log', {
      id: 'jan-1',
      started_at: '2026-01-10T10:00:00Z',
    })
  })

  it('should delete a previous session and refresh', async () => {
    const janSession = buildSession({
      id: 'jan-del',
      started_at: '2026-01-05T10:00:00Z',
    })
    listPracticeSessions.mockResolvedValue([janSession])

    const user = userEvent.setup()
    render(<PracticeGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Previous Sessions')).toBeInTheDocument()
    })

    const monthButton = screen.getByRole('button', { name: /january/i })
    await user.click(monthButton)

    const row = screen.getByLabelText('Open session').closest('.practice-session-row')
    const deleteButton = within(row).getByLabelText('Delete session')
    await user.click(deleteButton)

    await waitFor(() => {
      expect(deletePracticeSession).toHaveBeenCalledWith('jan-del')
      expect(listPracticeSessions).toHaveBeenCalledTimes(2)
      expect(listActivePracticeSessions).toHaveBeenCalledTimes(2)
    })
  })
})
