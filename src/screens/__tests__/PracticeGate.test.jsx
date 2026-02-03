// src/screens/__tests__/PracticeGate.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PracticeGate from '../PracticeGate.jsx'

vi.mock('../../lib/practice-db', () => ({
  addPracticeSession: vi.fn(),
  endPracticeSession: vi.fn(),
  deletePracticeSession: vi.fn(),
  listPracticeSessions: vi.fn(),
  listActivePracticeSessions: vi.fn(),
}))

vi.mock('lucide-react', () => ({
  PlayCircle: () => <div data-testid="play-circle-icon">Play</div>,
  Trash2: () => <div data-testid="trash-icon">Trash</div>,
  ChevronDown: () => <div data-testid="chevron-icon">Chevron</div>,
}))

import {
  addPracticeSession,
  endPracticeSession,
  deletePracticeSession,
  listPracticeSessions,
  listActivePracticeSessions,
} from '../../lib/practice-db'

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
    addPracticeSession.mockResolvedValue(buildSession())
    endPracticeSession.mockResolvedValue({})
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

    await waitFor(() => {
      expect(addPracticeSession).toHaveBeenCalledWith({})
      expect(mockNavigate).toHaveBeenCalledWith('practice-log', {
        id: 'new-session',
        started_at: '2026-01-20T09:00:00Z',
      })
    })
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

  it('should show confirmation modal when starting a new session with an active session', async () => {
    const activeSession = buildSession({ id: 'active-2' })
    listPracticeSessions.mockResolvedValue([activeSession])
    listActivePracticeSessions.mockResolvedValue([activeSession])

    const user = userEvent.setup()
    render(<PracticeGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Resume Active Session')).toBeEnabled()
    })

    await user.click(screen.getByText('Start New Session'))

    expect(screen.getByText('Start New Session?')).toBeInTheDocument()
    expect(
      screen.getByText(
        'You already have an active session. Starting a new one will end the current session and begin a new session now.'
      )
    ).toBeInTheDocument()
  })

  it('should end active session and start a new one when confirmed', async () => {
    const activeSession = buildSession({
      id: 'active-3',
      started_at: '2026-01-22T10:00:00Z',
    })
    const newSession = buildSession({
      id: 'new-2',
      started_at: '2026-01-22T10:30:00Z',
    })

    listPracticeSessions.mockResolvedValue([activeSession, newSession])
    listActivePracticeSessions.mockResolvedValue([activeSession])
    addPracticeSession.mockResolvedValue(newSession)

    const user = userEvent.setup()
    render(<PracticeGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Resume Active Session')).toBeEnabled()
    })

    await user.click(screen.getByText('Start New Session'))
    await user.click(screen.getByText('End & Start New'))

    await waitFor(() => {
      expect(endPracticeSession).toHaveBeenCalledWith('active-3')
      expect(addPracticeSession).toHaveBeenCalledWith({})
      expect(mockNavigate).toHaveBeenCalledWith('practice-log', {
        id: 'new-2',
        started_at: '2026-01-22T10:30:00Z',
      })
    })
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
    await user.click(monthButton)

    const sessionRow = screen.getByRole('button', { name: 'Open session' })
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
