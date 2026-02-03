// src/screens/__tests__/GameGate.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GameGate from '../GameGate.jsx'

vi.mock('../../lib/game-db', () => ({
  listGameSessions: vi.fn(),
  getActiveGameSession: vi.fn(),
  endGameSession: vi.fn(),
  deleteGameSession: vi.fn(),
}))

vi.mock('lucide-react', () => ({
  PlayCircle: () => <div data-testid="play-circle-icon">PlayCircle</div>,
  Gamepad2: () => <div data-testid="gamepad-icon">Gamepad2</div>,
  Trash2: () => <div data-testid="trash-icon">Trash2</div>,
}))

import {
  listGameSessions,
  getActiveGameSession,
  endGameSession,
  deleteGameSession,
} from '../../lib/game-db'

describe('GameGate Component', () => {
  let mockNavigate
  const activeSession = {
    id: 'active-1',
    team_name: 'Warriors',
    opponent_name: 'Lakers',
    home_away: 'home',
    started_at: '2025-01-12T10:00:00.000Z',
    status: 'active',
  }

  const completedSessions = [
    {
      id: 'game-1',
      team_name: 'Warriors',
      opponent_name: 'Bulls',
      home_away: 'away',
      level: 'Varsity',
      date_iso: '2025-01-10T00:00:00.000Z',
      team_score: 80,
      opponent_score: 75,
      status: 'completed',
    },
    {
      id: 'game-2',
      team_name: 'Warriors',
      opponent_name: 'Heat',
      home_away: 'home',
      level: null,
      started_at: '2025-01-08T00:00:00.000Z',
      team_score: 62,
      opponent_score: 62,
      status: 'completed',
    },
  ]

  beforeEach(() => {
    mockNavigate = vi.fn()
    listGameSessions.mockResolvedValue(completedSessions)
    getActiveGameSession.mockResolvedValue(null)
    endGameSession.mockResolvedValue({})
    deleteGameSession.mockResolvedValue({})
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('should render the game center title and start button', async () => {
    render(<GameGate navigate={mockNavigate} />)

    expect(screen.getByText('Game Center')).toBeInTheDocument()
    expect(screen.getByText('Start New Game')).toBeInTheDocument()

    await waitFor(() => {
      expect(listGameSessions).toHaveBeenCalled()
    })
  })

  it('should navigate to game-new when starting with no active game', async () => {
    const user = userEvent.setup()
    render(<GameGate navigate={mockNavigate} />)

    await user.click(screen.getByText('Start New Game'))

    expect(mockNavigate).toHaveBeenCalledWith('game-new')
  })

  it('should show resume card when an active game exists', async () => {
    getActiveGameSession.mockResolvedValue(activeSession)
    render(<GameGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Resume Active Game')).toBeInTheDocument()
      expect(screen.getByText('Warriors vs Lakers')).toBeInTheDocument()
    })
  })

  it('should navigate to game-logger when Resume is clicked', async () => {
    const user = userEvent.setup()
    getActiveGameSession.mockResolvedValue(activeSession)
    render(<GameGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Resume Active Game')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Resume'))

    expect(mockNavigate).toHaveBeenCalledWith('game-logger', {
      id: activeSession.id,
    })
  })

  it('should prompt before starting a new game when active exists', async () => {
    const user = userEvent.setup()
    getActiveGameSession.mockResolvedValue(activeSession)
    render(<GameGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Resume Active Game')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Start New Game'))

    expect(screen.getByText('Active Game Detected')).toBeInTheDocument()
  })

  it('should end the active game and navigate to game-new when confirmed', async () => {
    const user = userEvent.setup()
    getActiveGameSession.mockResolvedValue(activeSession)
    render(<GameGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Resume Active Game')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Start New Game'))
    await user.click(screen.getByText('End & Start New'))

    await waitFor(() => {
      expect(endGameSession).toHaveBeenCalledWith(activeSession.id)
      expect(mockNavigate).toHaveBeenCalledWith('game-new')
    })
  })

  it('should close confirm modal when Cancel is clicked', async () => {
    const user = userEvent.setup()
    getActiveGameSession.mockResolvedValue(activeSession)
    render(<GameGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Resume Active Game')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Start New Game'))
    await user.click(screen.getByText('Cancel'))

    expect(screen.queryByText('Active Game Detected')).not.toBeInTheDocument()
  })

  it('should render previous games grouped by level and allow opening details', async () => {
    const user = userEvent.setup()
    const dateSpy = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockReturnValue('Jan 10, 2025')

    render(<GameGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Previous Games')).toBeInTheDocument()
      expect(screen.getByText('Varsity')).toBeInTheDocument()
    })

    const card = screen.getByRole('button', {
      name: /Warriors vs Bulls on Jan 10, 2025/i,
    })
    await user.click(card)

    expect(mockNavigate).toHaveBeenCalledWith('gameDetail', { id: 'game-1' })

    dateSpy.mockRestore()
  })

  it('should delete a game when confirmed and refresh list', async () => {
    const user = userEvent.setup()
    render(<GameGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Previous Games')).toBeInTheDocument()
    })

    const card = screen.getByText('Warriors vs. Bulls').closest('[role="button"]')
    const deleteButton = within(card).getByRole('button', { name: 'Delete game' })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(deleteGameSession).toHaveBeenCalledWith('game-1')
      expect(listGameSessions).toHaveBeenCalled()
      expect(getActiveGameSession).toHaveBeenCalled()
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('should not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup()
    window.confirm.mockReturnValue(false)
    render(<GameGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Previous Games')).toBeInTheDocument()
    })

    const card = screen.getByText('Warriors vs. Bulls').closest('[role="button"]')
    const deleteButton = within(card).getByRole('button', { name: 'Delete game' })
    await user.click(deleteButton)

    expect(deleteGameSession).not.toHaveBeenCalled()
  })

  it('should alert when delete fails', async () => {
    const user = userEvent.setup()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    deleteGameSession.mockRejectedValue(new Error('fail'))
    render(<GameGate navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Previous Games')).toBeInTheDocument()
    })

    const card = screen.getByText('Warriors vs. Bulls').closest('[role="button"]')
    const deleteButton = within(card).getByRole('button', { name: 'Delete game' })
    await user.click(deleteButton)

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalled()
      expect(window.alert).toHaveBeenCalledWith(
        'Could not delete game on this device.'
      )
    })

    warnSpy.mockRestore()
  })
})
